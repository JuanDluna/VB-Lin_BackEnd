import mongoose from 'mongoose';
import { config } from '../config';

/**
 * Conecta a MongoDB
 */
export const connectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);

    console.log('✅ MongoDB conectado exitosamente');

    // Manejar eventos de conexión
    mongoose.connection.on('error', (err) => {
      console.error('❌ Error de conexión a MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB desconectado');
    });
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

/**
 * Desconecta de MongoDB
 */
export const disconnectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB desconectado exitosamente');
  } catch (error) {
    console.error('❌ Error al desconectar de MongoDB:', error);
  }
};

