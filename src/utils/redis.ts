import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

/**
 * Cliente Redis usando el paquete oficial 'redis' (compatible con Upstash)
 * Upstash requiere: REDIS_URL + REDIS_TOKEN (no host/port/password separados)
 */
let redisClient: RedisClientType | null = null;
let isConnecting = false;

/**
 * Obtiene o crea la conexión a Redis
 * Configurado para Upstash: usa URL + TOKEN
 */
export const getRedisClient = async (): Promise<RedisClientType> => {
  // Si ya está conectado, retornarlo
  if (redisClient && redisClient.isReady) {
    return redisClient;
  }

  // Si ya se está conectando, esperar
  if (isConnecting) {
    // Esperar hasta que se conecte (máximo 10 segundos)
    const maxWait = 10000;
    const startTime = Date.now();
    while (!redisClient?.isReady && Date.now() - startTime < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (redisClient?.isReady) {
      return redisClient;
    }
  }

  isConnecting = true;

  try {
    // Configuración para Upstash
    const redisConfig: {
      url: string;
      password?: string;
      socket?: {
        reconnectStrategy: (retries: number) => number | Error;
      };
    } = {
      url: config.redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            console.error('❌ Redis: límite de reintentos alcanzado');
            return new Error('Redis retry limit reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    };

    // Agregar TOKEN (Upstash usa password, no username)
    if (config.redisToken) {
      redisConfig.password = config.redisToken;
    }

    // Crear cliente
    redisClient = createClient(redisConfig) as RedisClientType;

    // Event listeners
    redisClient.on('connect', () => {
      console.log('🔗 Redis conectando...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis conectado y listo (Upstash)');
      isConnecting = false;
    });

    redisClient.on('error', (err: Error) => {
      // No loguear errores de ECONNRESET si es temporal
      if (err.message.includes('ECONNRESET') || err.message.includes('ECONNREFUSED')) {
        console.warn('⚠️ Redis desconectado temporalmente, reconectando...');
      } else {
        console.error('❌ Redis Client Error:', err);
      }
      isConnecting = false;
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconectando...');
    });

    // Conectar
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    isConnecting = false;
    console.error('❌ Error al crear cliente Redis:', error);
    throw error;
  }
};

/**
 * Cierra la conexión a Redis
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('✅ Redis desconectado exitosamente');
    } catch (error) {
      console.error('❌ Error al desconectar Redis:', error);
    } finally {
      redisClient = null;
    }
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
  const client = await getRedisClient();
  const key = `refresh:${userId}:${token}`;
  // Guardar con TTL en segundos
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
 * Revoca un refresh token de Redis (rotación de tokens)
 */
export const revokeRefreshToken = async (userId: string, token: string): Promise<void> => {
  const client = await getRedisClient();
  const key = `refresh:${userId}:${token}`;
  await client.del(key);
};

/**
 * Revoca todos los refresh tokens de un usuario
 * Útil para logout completo o cambios de seguridad
 */
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  const client = await getRedisClient();
  const pattern = `refresh:${userId}:*`;
  
  // Escanear todas las keys que coincidan con el patrón
  const keys: string[] = [];
  for await (const key of client.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  })) {
    keys.push(key);
  }

  if (keys.length > 0) {
    // Eliminar todas las keys (del() puede aceptar múltiples keys)
    // Usar unapproach compatible con el tipo del cliente
    for (const key of keys) {
      await client.del(key);
    }
  }
};
