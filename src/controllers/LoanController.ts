import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { LoanService } from '../services/LoanService';
import { AppError } from '../middlewares/errorHandler';
import { AuthRequest } from '../middlewares/auth';

/**
 * Controlador de préstamos
 */
export class LoanController {
  /**
   * GET /api/loans
   */
  static async getLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const status = req.query.status as string | undefined;
      const userId = req.query.userId as string | undefined;

      const result = await LoanService.getLoans(page, limit, status, userId);

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
   * GET /api/loans/:id
   */
  static async getLoanById(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const loan = await LoanService.getLoanById(id);

      res.status(200).json({
        success: true,
        data: loan.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/loans/reserve
   */
  static async reserve(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      const { equipmentId, startDate, endDate, reservationRemarks } = req.body;

      const loan = await LoanService.createReservation(
        userId,
        equipmentId,
        new Date(startDate),
        new Date(endDate),
        reservationRemarks
      );

      res.status(201).json({
        success: true,
        data: loan.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/loans/:id/checkout
   */
  static async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const loan = await LoanService.checkout(id);

      res.status(200).json({
        success: true,
        data: loan.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/loans/:id/return
   */
  static async returnLoan(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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
      const { returnRemarks } = req.body;
      const userId = req.user?.userId;

      const loan = await LoanService.returnLoan(id, returnRemarks, userId);

      res.status(200).json({
        success: true,
        data: loan.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/loans/user/:userId
   */
  static async getUserLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
        return;
      }

      const { userId } = req.params;
      const loans = await LoanService.getUserLoans(userId);

      res.status(200).json({
        success: true,
        data: loans,
      });
    } catch (error) {
      next(error);
    }
  }
}

