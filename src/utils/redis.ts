import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

let redisClient: RedisClientType | null = null;

/**
 * Obtiene o crea la conexión a Redis
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({
    socket: {
      host: config.redisHost,
      port: config.redisPort,
    },
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  await redisClient.connect();
  return redisClient;
};

/**
 * Cierra la conexión a Redis
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
};

/**
 * Guarda un refresh token en Redis
 */
export const saveRefreshToken = async (
  userId: string,
  token: string,
  expiresIn: number
): Promise<void> => {
  const client = await getRedisClient();
  const key = `refresh:${userId}:${token}`;
  await client.setEx(key, expiresIn, '1');
};

/**
 * Verifica si un refresh token existe en Redis
 */
export const getRefreshToken = async (userId: string, token: string): Promise<boolean> => {
  const client = await getRedisClient();
  const key = `refresh:${userId}:${token}`;
  const result = await client.get(key);
  return result === '1';
};

/**
 * Revoca un refresh token de Redis
 */
export const revokeRefreshToken = async (userId: string, token: string): Promise<void> => {
  const client = await getRedisClient();
  const key = `refresh:${userId}:${token}`;
  await client.del(key);
};

/**
 * Revoca todos los refresh tokens de un usuario
 */
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  const client = await getRedisClient();
  const pattern = `refresh:${userId}:*`;
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(keys);
  }
};

