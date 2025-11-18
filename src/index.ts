import { createApp, startCronJobs } from './app';
import { connectMongoDB, disconnectMongoDB } from './database/mongodb';
import { checkRedisConnection } from './database/redis';
import { config } from './config';

/**
 * Punto de entrada de la aplicación
 */
const startServer = async (): Promise<void> => {
  try {
    // Conectar a MongoDB
    await connectMongoDB();

    // Verificar conexión a Redis
    await checkRedisConnection();

    // Crear aplicación Express
    const app = createApp();

    // Iniciar servidor - escuchar en todas las interfaces (0.0.0.0) para acceso desde red local
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${config.port}`);
      console.log(`📚 Documentación Swagger: http://localhost:${config.port}/api-docs`);
      console.log(`🏥 Health check: http://localhost:${config.port}/health`);
      console.log(`🌍 Entorno: ${config.nodeEnv}`);
      console.log(`🌐 Accesible desde la red local en: http://192.168.56.1:${config.port}`);
    });

    // Iniciar cron jobs
    startCronJobs();

    // Manejo de cierre graceful
    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} recibido. Cerrando servidor...`);

      server.close(async () => {
        console.log('Servidor HTTP cerrado');

        await disconnectMongoDB();

        process.exit(0);
      });

      // Force close después de 10 segundos
      setTimeout(() => {
        console.error('Forzando cierre...');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar servidor
startServer();

