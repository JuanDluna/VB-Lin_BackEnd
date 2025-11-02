import { Router } from 'express';
import { LoanController } from '../controllers/LoanController';
import {
  validateReserveLoan,
  validateReturnLoan,
  validateLoanFilters,
  validatePagination,
  validateMongoId,
} from '../middlewares/validators';
import { authMiddleware } from '../middlewares/auth';
import { roleMiddleware } from '../middlewares/role';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * @route GET /api/loans
 * @desc Obtener lista de préstamos (paginada, filtros opcionales)
 * @access Private
 */
router.get(
  '/',
  apiLimiter,
  authMiddleware,
  validatePagination,
  validateLoanFilters,
  LoanController.getLoans
);

/**
 * @route GET /api/loans/:id
 * @desc Obtener préstamo por ID
 * @access Private
 */
router.get(
  '/:id',
  apiLimiter,
  authMiddleware,
  validateMongoId('id'),
  LoanController.getLoanById
);

/**
 * @route POST /api/loans/reserve
 * @desc Crear reserva de préstamo
 * @access Private
 */
router.post(
  '/reserve',
  apiLimiter,
  authMiddleware,
  validateReserveLoan,
  LoanController.reserve
);

/**
 * @route PUT /api/loans/:id/checkout
 * @desc Marcar préstamo como activo (checkout)
 * @access Admin
 */
router.put(
  '/:id/checkout',
  apiLimiter,
  authMiddleware,
  roleMiddleware(['admin']),
  validateMongoId('id'),
  LoanController.checkout
);

/**
 * @route PUT /api/loans/:id/return
 * @desc Devolver préstamo
 * @access Private (propio o admin)
 */
router.put(
  '/:id/return',
  apiLimiter,
  authMiddleware,
  validateMongoId('id'),
  validateReturnLoan,
  LoanController.returnLoan
);

/**
 * @route GET /api/loans/user/:userId
 * @desc Obtener préstamos de un usuario
 * @access Private
 */
router.get(
  '/user/:userId',
  apiLimiter,
  authMiddleware,
  validateMongoId('userId'),
  LoanController.getUserLoans
);

export default router;

