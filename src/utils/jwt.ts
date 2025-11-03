import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

/**
 * Payload del token JWT
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Genera un access token
 */
export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtAccessExpires,
  } as SignOptions);
};

/**
 * Genera un refresh token
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpires,
  } as SignOptions);
};

/**
 * Verifica y decodifica un access token
 */
export const verifyAccessToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwtSecret) as JWTPayload;
};

/**
 * Verifica y decodifica un refresh token
 */
export const verifyRefreshToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwtRefreshSecret) as JWTPayload;
};

/**
 * Obtiene el tiempo de expiración en segundos desde una cadena (ej: "7d", "2h")
 */
export const getExpirationInSeconds = (expiresIn: string): number => {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60; // Default 7 días
  }
};

