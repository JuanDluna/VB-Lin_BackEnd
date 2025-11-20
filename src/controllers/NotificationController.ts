import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { NotificationService } from '../services/NotificationService';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

/**
 * Controlador de notificaciones
 */
export class NotificationController {
  /**
   * GET /api/notifications
   */
  static async getNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
        return;
      }

      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('Usuario no autenticado', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await NotificationService.getNotifications(userId, page, limit);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/notifications/:id/read
   */
  static async markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
        return;
      }

      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('Usuario no autenticado', 401);
      }

      const notification = await NotificationService.markAsRead(id, userId);

      res.status(200).json({
        success: true,
        data: notification.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notifications/register
   */
  static async registerFCM(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
        return;
      }

      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('Usuario no autenticado', 401);
      }

      // Aceptar tanto fcmToken (camelCase) como fcm_token (snake_case) para compatibilidad
      const fcmToken = req.body.fcmToken || req.body.fcm_token;

      if (!fcmToken) {
        throw new AppError('El token FCM es requerido', 400);
      }

      await NotificationService.registerFCMToken(userId, fcmToken);

      res.status(200).json({
        success: true,
        message: 'Token FCM registrado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notifications/send
   */
  static async sendNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
        return;
      }

      const { userId, type, message } = req.body;

      const notification = await NotificationService.sendNotification(userId, type, message);

      res.status(201).json({
        success: true,
        data: notification.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
}

