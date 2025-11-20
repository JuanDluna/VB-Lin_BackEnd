import mongoose from 'mongoose';
import { config } from '../src/config';
import { Loan } from '../src/models/Loan';
import { FCMToken } from '../src/models/FCMToken';
import { Notification } from '../src/models/Notification';
import { LoanService } from '../src/services/LoanService';
import { NotificationService } from '../src/services/NotificationService';

async function diagnoseNotifications() {
  try {
    console.log('🔍 Iniciando diagnóstico de notificaciones...\n');

    // Conectar a MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Conectado a MongoDB\n');

    // 1. Verificar Firebase
    console.log('1️⃣ Verificando Firebase...');
    const fs = await import('fs');
    const path = await import('path');
    const credentialsPath = path.isAbsolute(config.firebaseCredentialsPath || '')
      ? config.firebaseCredentialsPath
      : path.resolve(process.cwd(), config.firebaseCredentialsPath || '');
    
    if (fs.existsSync(credentialsPath)) {
      console.log(`   ✅ Archivo de credenciales encontrado: ${credentialsPath}`);
    } else {
      console.log(`   ❌ Archivo de credenciales NO encontrado: ${credentialsPath}`);
    }
    console.log('');

    // 2. Verificar préstamos activos
    console.log('2️⃣ Verificando préstamos activos...');
    const now = new Date();
    const activeLoans = await Loan.find({
      status: { $in: ['reservado', 'activo'] },
      returnedAt: null,
    })
      .populate('userId', 'firstName lastName email')
      .populate('equipmentId', 'code name');

    console.log(`   📊 Total de préstamos activos: ${activeLoans.length}`);

    if (activeLoans.length === 0) {
      console.log('   ⚠️  No hay préstamos activos para verificar\n');
    } else {
      console.log('\n   📋 Detalles de préstamos activos:');
      for (const loan of activeLoans) {
        const user = loan.userId as any;
        const equipment = loan.equipmentId as any;
        const endDate = new Date(loan.endDate);
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

        console.log(`\n   Préstamo ID: ${loan._id}`);
        console.log(`   Usuario: ${user?.firstName} ${user?.lastName} (${user?._id})`);
        console.log(`   Equipo: ${equipment?.name} (${equipment?.code})`);
        console.log(`   Fecha fin: ${endDate.toLocaleString()}`);
        console.log(`   Días hasta vencimiento: ${diffDays} (${diffHours} horas)`);
        console.log(`   Status: ${loan.status}`);

        // Verificar si cumple criterios
        let shouldNotify = false;
        let notificationType = '';
        if (diffDays === 1) {
          shouldNotify = true;
          notificationType = 'recordatorio_24h';
        } else if (diffDays === 0) {
          shouldNotify = true;
          notificationType = 'recordatorio_hoy';
        } else if (diffDays < 0) {
          shouldNotify = true;
          notificationType = 'vencido';
        }

        if (shouldNotify) {
          console.log(`   ✅ DEBERÍA ENVIAR NOTIFICACIÓN (${notificationType})`);

          // Verificar si ya se envió hoy
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(now);
          todayEnd.setHours(23, 59, 59, 999);

          let messagePattern = '';
          if (notificationType === 'recordatorio_24h') {
            messagePattern = `El equipo "${equipment?.name}" debe devolverse mañana`;
          } else if (notificationType === 'recordatorio_hoy') {
            messagePattern = `El equipo "${equipment?.name}" debe devolverse hoy`;
          } else {
            messagePattern = `El equipo "${equipment?.name}" ha vencido`;
          }

          const existing = await Notification.findOne({
            userId: user._id,
            type: notificationType === 'vencido' ? 'vencimiento' : 'recordatorio',
            message: { $regex: messagePattern, $options: 'i' },
            sentAt: { $gte: todayStart, $lte: todayEnd },
          });

          if (existing) {
            console.log(`   ⚠️  Ya se envió una notificación hoy (${existing.sentAt})`);
          } else {
            console.log(`   ✅ No se ha enviado notificación hoy - DEBERÍA ENVIARSE`);
          }

          // Verificar tokens FCM
          const tokens = await FCMToken.find({ userId: user._id });
          console.log(`   📱 Tokens FCM registrados: ${tokens.length}`);
          if (tokens.length === 0) {
            console.log(`   ❌ NO HAY TOKENS FCM - No se puede enviar push notification`);
          } else {
            tokens.forEach((token, idx) => {
              console.log(`      Token ${idx + 1}: ${token.platform} - ${token.token.substring(0, 20)}...`);
            });
          }
        } else {
          console.log(`   ⏭️  No cumple criterios para notificación (${diffDays} días)`);
        }
      }
    }
    console.log('');

    // 3. Verificar tokens FCM por usuario
    console.log('3️⃣ Verificando tokens FCM registrados...');
    const allTokens = await FCMToken.find({}).populate('userId', 'firstName lastName email');
    console.log(`   📊 Total de tokens FCM: ${allTokens.length}`);
    
    if (allTokens.length === 0) {
      console.log('   ⚠️  No hay tokens FCM registrados en el sistema\n');
    } else {
      console.log('\n   📋 Tokens por usuario:');
      const tokensByUser = new Map();
      for (const token of allTokens) {
        const user = token.userId as any;
        if (!user || !user._id) {
          console.log(`      ⚠️  Token sin usuario asociado: ${token.token.substring(0, 30)}...`);
          continue;
        }
        const userId = user._id.toString();
        if (!tokensByUser.has(userId)) {
          tokensByUser.set(userId, {
            user: `${user.firstName} ${user.lastName}`,
            tokens: [],
          });
        }
        tokensByUser.get(userId).tokens.push({
          platform: token.platform,
          token: token.token.substring(0, 30) + '...',
        });
      }
      tokensByUser.forEach((data, userId) => {
        console.log(`\n   Usuario: ${data.user} (${userId})`);
        data.tokens.forEach((t: any, idx: number) => {
          console.log(`      Token ${idx + 1}: ${t.platform} - ${t.token}`);
        });
      });
    }
    console.log('');

    // 4. Ejecutar verificación manual
    console.log('4️⃣ Ejecutando verificación manual...');
    try {
      await LoanService.checkAndSendLoanReminders();
      console.log('   ✅ Verificación ejecutada sin errores');
    } catch (error) {
      console.log(`   ❌ Error en verificación: ${error}`);
    }
    console.log('');

    // 5. Verificar notificaciones recientes
    console.log('5️⃣ Notificaciones enviadas hoy:');
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const todayNotifications = await Notification.find({
      sentAt: { $gte: todayStart, $lte: todayEnd },
    })
      .populate('userId', 'firstName lastName')
      .sort({ sentAt: -1 })
      .limit(10);

    console.log(`   📊 Total de notificaciones hoy: ${todayNotifications.length}`);
    if (todayNotifications.length > 0) {
      console.log('\n   📋 Últimas notificaciones:');
      todayNotifications.forEach((notif) => {
        const user = notif.userId as any;
        console.log(`      [${notif.sentAt.toLocaleTimeString()}] ${user?.firstName} ${user?.lastName}: ${notif.type} - ${notif.message.substring(0, 50)}...`);
      });
    }
    console.log('');

    console.log('✅ Diagnóstico completado\n');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

diagnoseNotifications();

