import { connectMongoDB, disconnectMongoDB } from '../src/database/mongodb';
import { NotificationService } from '../src/services/NotificationService';
import * as admin from 'firebase-admin';

/**
 * Script de prueba para verificar que Firebase esté configurado correctamente
 */
async function testFirebase(): Promise<void> {
  try {
    console.log('🔍 Verificando configuración de Firebase...\n');

    // Conectar a MongoDB (requerido para obtener tokens FCM)
    await connectMongoDB();
    console.log('✅ MongoDB conectado\n');

    // Verificar si Firebase está inicializado
    // Intentaremos crear una notificación que active la inicialización de Firebase
    console.log('📝 Creando notificación de prueba para inicializar Firebase...\n');

    // Obtener un usuario de prueba (necesitamos un ID válido)
    // Por ahora solo verificamos que no haya errores al inicializar
    const testUserId = '000000000000000000000000'; // ID de prueba

    // Intentar enviar una notificación (esto inicializará Firebase si está configurado)
    try {
      await NotificationService.createNotification(
        testUserId,
        'reserva',
        'Notificación de prueba de Firebase'
      );
      console.log('⚠️ Notificación creada (sin usuario válido, pero Firebase se inicializó si estaba configurado)\n');
    } catch (error) {
      // Esperado si no hay usuario válido, pero Firebase debería haberse inicializado
      console.log('⚠️ Error esperado (usuario no válido), pero Firebase debería haberse inicializado\n');
    }

    // Verificar si Firebase Admin está inicializado
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin SDK está inicializado correctamente');
      console.log(`   - Proyecto: ${admin.apps[0].options.credential ? 'Configurado' : 'No configurado'}`);
      console.log('   - Estado: Listo para enviar push notifications\n');
    } else {
      console.log('⚠️ Firebase Admin SDK NO está inicializado');
      console.log('   - Verifica que el archivo firebase.json existe en secrets/');
      console.log('   - Verifica que FIREBASE_CREDENTIALS_PATH en .env apunta al archivo correcto\n');
    }

    // Verificar archivo de credenciales
    const fs = await import('fs');
    const path = await import('path');
    const { config } = await import('../src/config');

    if (config.firebaseCredentialsPath) {
      const credentialsPath = path.isAbsolute(config.firebaseCredentialsPath)
        ? config.firebaseCredentialsPath
        : path.resolve(process.cwd(), config.firebaseCredentialsPath);

      if (fs.existsSync(credentialsPath)) {
        console.log(`✅ Archivo de credenciales encontrado: ${credentialsPath}`);
        try {
          const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
          console.log(`   - Project ID: ${credentials.project_id}`);
          console.log(`   - Client Email: ${credentials.client_email}`);
          console.log('   - Formato: ✅ Válido\n');
        } catch (error) {
          console.log('   - Formato: ❌ JSON inválido\n');
        }
      } else {
        console.log(`⚠️ Archivo de credenciales NO encontrado: ${credentialsPath}\n`);
      }
    } else {
      console.log('⚠️ FIREBASE_CREDENTIALS_PATH no está configurado en .env\n');
    }

    // Resumen
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (admin.apps.length > 0) {
      console.log('✅ Firebase está configurado y funcionando correctamente');
      console.log('   Las notificaciones push se enviarán usando FCM');
    } else {
      console.log('⚠️ Firebase NO está inicializado');
      console.log('   Las notificaciones se guardarán en la BD pero no se enviarán por push');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await disconnectMongoDB();
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    process.exit(1);
  }
}

// Ejecutar prueba
testFirebase();

