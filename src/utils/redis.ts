import Redis from 'ioredis';
import { config } from '../config';

/**
 * Cliente Redis usando ioredis (más robusto que redis package)
 * ioredis ofrece mejor manejo de reconexión automática y operaciones avanzadas
 */
let redisClient: Redis | null = null;

/**
 * Obtiene o crea la conexión a Redis
 * Usa ioredis para mejor manejo de conexiones y reconexión automática
 */
export const getRedisClient = (): Redis => {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }

  redisClient = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    retryStrategy: (times: number) => {
      // Estrategia de reintentos: esperar hasta 10 segundos
      const delay = Math.min(times * 50, 10000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redisClient.on('error', (err: Error) => {
    console.error('❌ Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis conectado');
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis listo');
  });

  return redisClient;
};

/**
 * Cierra la conexión a Redis
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};

/**
 * Guarda un refresh token en Redis con TTL
 * Key: refresh:<userId>:<token>
 * TTL: tiempo de expiración del refresh token (en segundos)
 */
export const saveRefreshToken = async (
  userId: string,
  token: string,
  expiresIn: number
): Promise<void> => {
  const client = getRedisClient();
  const key = `refresh:${userId}:${token}`;
  // Guardar con TTL en segundos
  await client.setex(key, expiresIn, '1');
};

/**
 * Verifica si un refresh token existe en Redis
 */
export const getRefreshToken = async (userId: string, token: string): Promise<boolean> => {
  const client = getRedisClient();
  const key = `refresh:${userId}:${token}`;
  const result = await client.get(key);
  return result === '1';
};

/**
 * Revoca un refresh token de Redis (rotación de tokens)
 */
export const revokeRefreshToken = async (userId: string, token: string): Promise<void> => {
  const client = getRedisClient();
  const key = `refresh:${userId}:${token}`;
  await client.del(key);
};

/**
 * Revoca todos los refresh tokens de un usuario
 * Útil para logout completo o cambios de seguridad
 */
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  const client = getRedisClient();
  const pattern = `refresh:${userId}:*`;
  const stream = client.scanStream({
    match: pattern,
    count: 100,
  });

  const keys: string[] = [];
  stream.on('data', (resultKeys: string[]) => {
    keys.push(...resultKeys);
  });

  await new Promise<void>((resolve) => {
    stream.on('end', () => {
      resolve();
    });
  });

  if (keys.length > 0) {
    await client.del(...keys);
  }
};
