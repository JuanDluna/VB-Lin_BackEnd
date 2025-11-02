import mongoose from 'mongoose';
import { config } from '../src/config';

/**
 * Script para esperar a que MongoDB esté disponible
 * Útil para Docker Compose
 */
const waitForDB = async (): Promise<void> => {
  const maxRetries = 30;
  const retryDelay = 2000; // 2 segundos

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Intentando conectar a MongoDB... (${i + 1}/${maxRetries})`);
      await mongoose.connect(config.mongoUri);
      console.log('✅ MongoDB está disponible');
      await mongoose.disconnect();
      process.exit(0);
    } catch (error) {
      console.log(`❌ Intento ${i + 1} falló, reintentando en ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  console.error('❌ No se pudo conectar a MongoDB después de', maxRetries, 'intentos');
  process.exit(1);
};

waitForDB();

