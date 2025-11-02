import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { EquipmentService } from '../services/EquipmentService';
import { AppError } from '../middlewares/errorHandler';

/**
 * Controlador de equipos
 */
export class EquipmentController {
  /**
   * GET /api/equipment
   */
  static async getEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const q = req.query.q as string | undefined;
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;

      const result = await EquipmentService.getEquipment(page, limit, q, category, status);

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
   * GET /api/equipment/:id
   */
  static async getEquipmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const equipment = await EquipmentService.getEquipmentById(id);

      res.status(200).json({
        success: true,
        data: equipment.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/equipment
   */
  static async createEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
        return;
      }

      const equipment = await EquipmentService.createEquipment(req.body);

      res.status(201).json({
        success: true,
        data: equipment.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/equipment/:id
   */
  static async updateEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const equipment = await EquipmentService.updateEquipment(id, req.body);

      res.status(200).json({
        success: true,
        data: equipment.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/equipment/:id
   */
  static async deleteEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      await EquipmentService.deleteEquipment(id);

      res.status(200).json({
        success: true,
        message: 'Equipo eliminado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

