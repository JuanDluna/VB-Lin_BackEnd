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

  // Configuración base
  const redisConfig: {
    host: string;
    port: number;
    password?: string;
    retryStrategy: (times: number) => number;
    maxRetriesPerRequest: null;
    enableReadyCheck: boolean;
    enableOfflineQueue: boolean;
    connectTimeout: number;
    lazyConnect: boolean;
    tls?: { rejectUnauthorized: boolean };
  } = {
    host: config.redisHost,
    port: config.redisPort,
    retryStrategy: (times: number) => {
      // Estrategia de reintentos: esperar hasta 10 segundos
      const delay = Math.min(times * 50, 10000);
      return delay;
    },
    maxRetriesPerRequest: null, // null = reintentar indefinidamente (mejor para producción)
    enableReadyCheck: true,
    enableOfflineQueue: true, // Permite encolar comandos cuando está desconectado
    connectTimeout: 10000, // 10 segundos para conectar
    lazyConnect: false,
  };

  // Agregar password solo si existe (Upstash requiere password)
  if (config.redisPassword) {
    redisConfig.password = config.redisPassword;
  }

  // Upstash requiere TLS - detectar automáticamente si es Upstash
  const isUpstash = config.redisHost.includes('upstash.io') || config.redisHost.includes('upstash.com');
  if (isUpstash || process.env.REDIS_TLS === 'true') {
    redisConfig.tls = {
      rejectUnauthorized: false, // Para servicios en la nube como Upstash
    };
  }

  redisClient = new Redis(redisConfig);

  redisClient.on('error', (err: Error) => {
    // No loguear errores de ECONNRESET si es temporal (se reconectará automáticamente)
    if (err.message.includes('ECONNRESET') || err.message.includes('ECONNREFUSED')) {
      console.warn('⚠️ Redis desconectado temporalmente, reconectando...');
    } else {
      console.error('❌ Redis Client Error:', err);
    }
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis conectado');
  });

  redisClient.on('ready', () => {
    console.log('✅ Redis listo');
  });

  redisClient.on('close', () => {
    console.warn('⚠️ Conexión Redis cerrada');
  });

  redisClient.on('reconnecting', () => {
    console.log('🔄 Redis reconectando...');
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
