import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración centralizada de variables de entorno
 */
export const config = {
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'changeme_jwt_secret',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '2h',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'changeme_refresh_secret',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',

  // MongoDB - Nombre de BD: VB-Lin_BackEnd
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/VB-Lin_BackEnd',

  // Redis - Configuración para Upstash
  // Upstash requiere: REDIS_URL (ej: redis://xxxxx.upstash.io:6379) + REDIS_TOKEN
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisToken: process.env.REDIS_TOKEN || undefined, // Upstash usa TOKEN, no password

  // SMTP
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'pass',
  },

  // Firebase
  firebaseCredentialsPath: process.env.FIREBASE_CREDENTIALS_PATH || '',

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:9090'],
};

