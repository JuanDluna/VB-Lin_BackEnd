import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { DashboardService } from '../services/DashboardService';
import { AppError } from '../middlewares/errorHandler';

export class DashboardController {
  /**
   * GET /api/dashboard
   * Obtener todos los datos del dashboard
   */
  static async getDashboard(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        topEquipmentLimit,
        topUsersLimit,
        daysLimit,
      } = req.query;

      // Parsear fechas si están presentes
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          throw new AppError('startDate debe ser una fecha válida en formato ISO8601', 400);
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          throw new AppError('endDate debe ser una fecha válida en formato ISO8601', 400);
        }
      }

      // Validar que endDate sea posterior a startDate si ambas están presentes
      if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
        throw new AppError('endDate debe ser posterior a startDate', 400);
      }

      // Parsear límites
      const parsedTopEquipmentLimit = topEquipmentLimit
        ? parseInt(topEquipmentLimit as string, 10)
        : 10;
      const parsedTopUsersLimit = topUsersLimit
        ? parseInt(topUsersLimit as string, 10)
        : 10;
      const parsedDaysLimit = daysLimit
        ? parseInt(daysLimit as string, 10)
        : 30;

      // Validar límites
      if (isNaN(parsedTopEquipmentLimit) || parsedTopEquipmentLimit < 1 || parsedTopEquipmentLimit > 50) {
        throw new AppError('topEquipmentLimit debe ser un número entre 1 y 50', 400);
      }

      if (isNaN(parsedTopUsersLimit) || parsedTopUsersLimit < 1 || parsedTopUsersLimit > 50) {
        throw new AppError('topUsersLimit debe ser un número entre 1 y 50', 400);
      }

      if (isNaN(parsedDaysLimit) || parsedDaysLimit < 1 || parsedDaysLimit > 365) {
        throw new AppError('daysLimit debe ser un número entre 1 y 365', 400);
      }

      const dashboardData = await DashboardService.getDashboard({
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        topEquipmentLimit: parsedTopEquipmentLimit,
        topUsersLimit: parsedTopUsersLimit,
        daysLimit: parsedDaysLimit,
      });

      res.status(200).json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard/summary
   * Obtener solo el resumen general
   */
  static async getSummary(
    _req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const summary = await DashboardService.getSummary();

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

