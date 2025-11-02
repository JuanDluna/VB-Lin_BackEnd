import rateLimit from 'express-rate-limit';

/**
 * Rate limiter general para la API
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    success: false,
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter más estricto para autenticación
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos de login por IP
  message: {
    success: false,
    error: 'Demasiados intentos de autenticación, intenta de nuevo más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter para recuperación de contraseña
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 intentos por hora
  message: {
    success: false,
    error: 'Demasiados intentos de recuperación de contraseña, intenta de nuevo más tarde',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

