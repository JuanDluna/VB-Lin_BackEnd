import { getRedisClient, closeRedis } from '../utils/redis';

/**
 * Verifica conexión a Redis
 */
export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    const client = await getRedisClient();
    const result = await client.ping();
    if (result === 'PONG') {
      console.log('✅ Redis conectado exitosamente');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error al conectar a Redis:', error);
    return false;
  }
};

/**
 * Cierra conexión a Redis (útil para tests)
 */
export const disconnectRedis = async (): Promise<void> => {
  await closeRedis();
  console.log('✅ Redis desconectado exitosamente');
};

