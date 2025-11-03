import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ReportService } from '../services/ReportService';

/**
 * Controlador de reportes (solo admin)
 */
export class ReportController {
  /**
   * GET /api/reports/usage
   */
  static async getUsageReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
        return;
      }

      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;

      const report = await ReportService.getUsageReport(from, to);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports/equipment-stats
   */
  static async getEquipmentStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await ReportService.getEquipmentStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports/user-activity
   */
  static async getUserActivity(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await ReportService.getUserActivityReport();

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports/overdue
   */
  static async getOverdue(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await ReportService.getOverdueReport();

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}

