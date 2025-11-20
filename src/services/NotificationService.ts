import { Notification, INotification, FCMToken } from '../models';
import { AppError } from '../middlewares/errorHandler';
import { Types } from 'mongoose';
import * as admin from 'firebase-admin';
import { config } from '../config';

/**
 * Servicio de notificaciones
 */
export class NotificationService {
  /**
   * Inicializar Firebase Admin (si está configurado)
   * Lee el archivo JSON de credenciales y configura Firebase Admin SDK
   */
  private static async initFirebase(): Promise<void> {
    // Si ya está inicializado, no hacer nada
    if (admin.apps.length > 0) {
      return;
    }

    // Si no hay ruta de credenciales, salir
    if (!config.firebaseCredentialsPath) {
      return;
    }

    try {
      // Leer archivo de credenciales usando fs (más robusto que require)
      const fs = await import('fs');
      const path = await import('path');

      // Resolver ruta absoluta si es relativa
      const credentialsPath = path.isAbsolute(config.firebaseCredentialsPath)
        ? config.firebaseCredentialsPath
        : path.resolve(process.cwd(), config.firebaseCredentialsPath);

      // Verificar que el archivo existe
      if (!fs.existsSync(credentialsPath)) {
        console.warn(`[NotificationService] Archivo de credenciales no encontrado: ${credentialsPath}`);
        return;
      }

      // Leer y parsear el archivo JSON
      const serviceAccountJson = fs.readFileSync(credentialsPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      // Validar que tiene las propiedades mínimas requeridas
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        console.error('[NotificationService] Archivo de credenciales inválido: faltan campos requeridos');
        return;
      }

      // Inicializar Firebase Admin
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });

      console.log('✅ Firebase Admin SDK inicializado correctamente');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[NotificationService] Error al inicializar Firebase: ${errorMessage}`);
      console.warn('[NotificationService] Las notificaciones push se simularán en lugar de enviarse');
    }
  }

  /**
   * Obtener lista paginada de notificaciones para un usuario
   */
  static async getNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find({ userId })
        .skip(skip)
        .limit(limit)
        .sort({ sentAt: -1 }),
      Notification.countDocuments({ userId }),
    ]);

    return {
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Marcar notificación como leída
   */
  static async markAsRead(id: string, userId: string): Promise<INotification> {
    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      throw new AppError('Notificación no encontrada', 404);
    }

    notification.read = true;
    await notification.save();

    return notification;
  }

  /**
   * Registrar token FCM para push notifications
   * Guarda el token en la colección fcmTokens (MongoDB)
   */
  static async registerFCMToken(
    userId: string,
    fcmToken: string,
    platform?: 'android' | 'ios' | 'web'
  ): Promise<void> {
    // Registrar o actualizar token FCM en la colección fcmTokens
    // Si el token ya existe para otro usuario, se reemplaza
    await FCMToken.findOneAndUpdate(
      { token: fcmToken },
      {
        userId: new Types.ObjectId(userId),
        token: fcmToken,
        platform: platform || 'web',
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Obtener token FCM de un usuario (el más reciente)
   */
  static async getFCMToken(userId: string): Promise<string | null> {
    const fcmToken = await FCMToken.findOne({ userId }).sort({ createdAt: -1 });
    return fcmToken?.token || null;
  }

  /**
   * Obtener todos los tokens FCM de un usuario
   */
  static async getAllFCMTokens(userId: string): Promise<string[]> {
    const tokens = await FCMToken.find({ userId });
    return tokens.map((t) => t.token);
  }

  /**
   * Crear y enviar notificación
   */
  static async createNotification(
    userId: string,
    type: 'reserva' | 'recordatorio' | 'vencimiento',
    message: string
  ): Promise<INotification> {
    // Crear notificación en DB
    const notification = new Notification({
      userId,
      type,
      message,
      read: false,
      sentAt: new Date(),
    });

    await notification.save();

    // Intentar enviar push notification
    try {
      await this.sendPushNotification(userId, message);
    } catch (error) {
      console.error('[NotificationService] Error enviando push notification:', error);
      // No fallar si no se puede enviar push
    }

    return notification;
  }

  /**
   * Enviar notificación manual (admin)
   */
  static async sendNotification(
    userId: string,
    type: 'reserva' | 'recordatorio' | 'vencimiento',
    message: string
  ): Promise<INotification> {
    return await this.createNotification(userId, type, message);
  }

  /**
   * Verificar si ya se envió una notificación del mismo tipo hoy
   */
  static async hasNotificationToday(
    userId: string,
    type: 'reserva' | 'recordatorio' | 'vencimiento',
    messagePattern: string
  ): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await Notification.findOne({
      userId: new Types.ObjectId(userId),
      type,
      message: { $regex: messagePattern, $options: 'i' },
      sentAt: { $gte: todayStart, $lte: todayEnd },
    });

    return !!existing;
  }

  /**
   * Enviar notificación push de recordatorio de préstamo con estructura detallada
   */
  static async sendLoanReminderPush(
    userId: string,
    equipmentName: string,
    equipmentCode: string,
    loanId: string,
    equipmentId: string,
    endDate: string,
    daysUntilReturn: number,
    reminderType: 'recordatorio_24h' | 'recordatorio_hoy' | 'vencido'
  ): Promise<void> {
    await this.initFirebase();

    // Determinar título y mensaje según el tipo
    let title: string;
    let body: string;
    let notificationType: 'reserva' | 'recordatorio' | 'vencimiento';

    if (reminderType === 'recordatorio_24h') {
      title = 'Recordatorio de Devolución';
      body = `El equipo "${equipmentName}" debe devolverse mañana`;
      notificationType = 'recordatorio';
    } else if (reminderType === 'recordatorio_hoy') {
      title = '¡Vence Hoy!';
      body = `El equipo "${equipmentName}" debe devolverse hoy`;
      notificationType = 'recordatorio';
    } else {
      // vencido
      title = 'Préstamo Vencido';
      body = `El equipo "${equipmentName}" ha vencido. Por favor, devuélvelo lo antes posible.`;
      notificationType = 'vencimiento';
    }

    // Crear notificación en DB
    await this.createNotification(userId, notificationType, body);

    // Enviar push notification si hay tokens FCM
    if (!admin.apps.length) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Push notification simulado para usuario ${userId}: ${body}`);
      }
      return;
    }

    const fcmTokens = await this.getAllFCMTokens(userId);
    if (fcmTokens.length === 0) {
      return;
    }

    // Obtener información de plataforma para cada token
    const fcmTokenDocs = await FCMToken.find({ userId: new Types.ObjectId(userId) });

    try {
      const messages = fcmTokenDocs.map((tokenDoc) => {
        const baseMessage: admin.messaging.Message = {
          token: tokenDoc.token,
          notification: {
            title,
            body,
          },
          data: {
            type: 'loan_return_reminder',
            loanId,
            equipmentId,
            equipmentName,
            equipmentCode,
            endDate,
            daysUntilReturn: daysUntilReturn.toString(),
            action: 'view_loans',
            reminderType,
          },
        };

        // Configuración específica por plataforma
        if (tokenDoc.platform === 'ios') {
          baseMessage.apns = {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          };
        } else if (tokenDoc.platform === 'android') {
          baseMessage.android = {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'loan_reminders',
            },
          };
        } else {
          // web
          baseMessage.webpush = {
            notification: {
              icon: '/icon.png',
              badge: '/badge.png',
              requireInteraction: true,
            },
          };
        }

        return baseMessage;
      });

      const response = await admin.messaging().sendEach(messages);
      
      // Verificar respuestas individuales
      let successCount = 0;
      let failureCount = 0;
      
      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          successCount++;
        } else {
          failureCount++;
          const tokenDoc = fcmTokenDocs[idx];
          console.error(`[NotificationService] Error enviando a token ${tokenDoc.platform} (${tokenDoc.token.substring(0, 20)}...):`, resp.error?.message || 'Error desconocido');
          
          // Si el token es inválido, eliminarlo de la BD
          if (resp.error?.code === 'messaging/invalid-registration-token' || 
              resp.error?.code === 'messaging/registration-token-not-registered') {
            FCMToken.deleteOne({ _id: tokenDoc._id }).catch(err => {
              console.error(`[NotificationService] Error eliminando token inválido:`, err);
            });
            console.log(`[NotificationService] Token inválido eliminado: ${tokenDoc.token.substring(0, 20)}...`);
          }
        }
      });
      
      if (successCount > 0) {
        console.log(`✅ Notificación push enviada a usuario ${userId} para préstamo ${loanId} (${successCount} exitoso${successCount > 1 ? 's' : ''}, ${failureCount} fallido${failureCount > 1 ? 's' : ''})`);
      } else {
        console.error(`❌ No se pudo enviar notificación push a usuario ${userId} para préstamo ${loanId} (todos los tokens fallaron)`);
      }
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      console.error('[NotificationService] Error enviando push notification:', firebaseError.message || error);
    }
  }

  /**
   * Enviar push notification usando FCM
   * Si no hay credenciales de Firebase, simula el envío y guarda notificación
   */
  private static async sendPushNotification(userId: string, message: string): Promise<void> {
    await this.initFirebase();

    if (!admin.apps.length) {
      // En desarrollo o sin credenciales: simular envío y loguear
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Push notification simulado para usuario ${userId}: ${message}`);
      }
      return; // Notificación ya está guardada en DB, solo simulamos push
    }

    // Obtener todos los tokens del usuario (puede tener múltiples dispositivos)
    const fcmTokens = await this.getAllFCMTokens(userId);

    if (fcmTokens.length === 0) {
      return; // Usuario no tiene tokens FCM registrados
    }

    // Enviar a todos los dispositivos del usuario
    try {
      const messages = fcmTokens.map((token) => ({
        token,
        notification: {
          title: 'Sistema de Préstamos UAA',
          body: message,
        },
        data: {
          userId,
          message,
        },
      }));

      await admin.messaging().sendEach(messages);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      // Si algún token es inválido, intentar eliminarlo de la BD
      if (
        firebaseError.code === 'messaging/invalid-registration-token' ||
        firebaseError.code === 'messaging/registration-token-not-registered'
      ) {
        // Nota: sendEach puede fallar parcialmente; en producción deberías manejar errores por token individual
        console.warn(`[NotificationService] Token FCM inválido detectado para usuario ${userId}`);
        // Opcional: eliminar tokens inválidos de la BD
        // Esto requeriría parsear la respuesta de sendEach para identificar qué tokens fallaron
      }
      // No lanzar error para no romper el flujo, solo loguear
      console.error('[NotificationService] Error enviando push notification:', firebaseError.message || error);
    }
  }
}

