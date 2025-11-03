import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { UserService } from '../services/UserService';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

/**
 * Controlador de usuarios
 */
export class UserController {
  /**
   * GET /api/users
   */
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await UserService.getUsers(page, limit);

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
   * GET /api/users/:id
   */
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const user = await UserService.getUserById(id);

      res.status(200).json({
        success: true,
        data: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/users/:id
   */
  static async updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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
      const { firstName, lastName, role, active } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new AppError('Usuario no autenticado', 401);
      }

      const user = await UserService.updateUser(
        id,
        { firstName, lastName, role, active },
        userId,
        userRole
      );

      res.status(200).json({
        success: true,
        data: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/users/:id
   */
  static async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      await UserService.deleteUser(id, userId);

      res.status(200).json({
        success: true,
        message: 'Usuario eliminado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

