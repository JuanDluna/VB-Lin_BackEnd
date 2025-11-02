import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Middleware para verificar roles de usuario (RBAC)
 * @param allowedRoles Array de roles permitidos
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no autenticado',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'No tienes permisos para realizar esta acción',
      });
      return;
    }

    next();
  };
};

