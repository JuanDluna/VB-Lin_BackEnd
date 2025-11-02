import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';

/**
 * Extiende la interfaz Request de Express para incluir información del usuario
 */
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * Middleware para verificar el token JWT de acceso
 */
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Token de acceso no proporcionado',
      });
      return;
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Token de acceso inválido o expirado',
      });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Error al verificar el token de acceso',
    });
  }
};

