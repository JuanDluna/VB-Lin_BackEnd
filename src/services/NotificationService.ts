import { Notification, INotification } from '../models';
import { AppError } from '../middlewares/errorHandler';
import { getRedisClient } from '../utils/redis';
import * as admin from 'firebase-admin';
import { config } from '../config';

/**
 * Servicio de notificaciones
 */
export class NotificationService {
  /**
   * Inicializar Firebase Admin (si está configurado)
   */
  private static async initFirebase(): Promise<void> {
    if (!admin.apps.length && config.firebaseCredentialsPath) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const serviceAccount = require(config.firebaseCredentialsPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[NotificationService] Firebase no configurado o credenciales inválidas');
      }
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
   */
  static async registerFCMToken(userId: string, fcmToken: string): Promise<void> {
    const client = await getRedisClient();
    await client.setEx(`fcm:${userId}`, 60 * 60 * 24 * 30, fcmToken); // 30 días
  }

  /**
   * Obtener token FCM de un usuario
   */
  static async getFCMToken(userId: string): Promise<string | null> {
    const client = await getRedisClient();
    const token = await client.get(`fcm:${userId}`);
    return token;
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
   * Enviar push notification usando FCM
   */
  private static async sendPushNotification(userId: string, message: string): Promise<void> {
    await this.initFirebase();

    if (!admin.apps.length) {
      // En desarrollo, solo loguear
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Push notification para usuario ${userId}: ${message}`);
      }
      return;
    }

    const fcmToken = await this.getFCMToken(userId);

    if (!fcmToken) {
      return; // Usuario no tiene token FCM registrado
    }

    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: 'Sistema de Préstamos UAA',
          body: message,
        },
        data: {
          userId,
          message,
        },
      });
    } catch (error) {
      // Si el token es inválido, eliminarlo
      if ((error as any).code === 'messaging/invalid-registration-token') {
        const client = await getRedisClient();
        await client.del(`fcm:${userId}`);
      }
      throw error;
    }
  }
}

