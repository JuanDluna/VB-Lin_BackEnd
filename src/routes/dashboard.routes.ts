import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { validateDashboardFilters } from '../middlewares/validators';
import { authMiddleware } from '../middlewares/auth';
import { roleMiddleware } from '../middlewares/role';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * @route GET /api/dashboard
 * @desc Obtener todos los datos del dashboard
 * @access Admin, Profesor
 */
router.get(
  '/',
  apiLimiter,
  authMiddleware,
  roleMiddleware(['admin', 'profesor']),
  validateDashboardFilters,
  DashboardController.getDashboard
);

/**
 * @route GET /api/dashboard/summary
 * @desc Obtener solo el resumen general del dashboard
 * @access Admin, Profesor
 */
router.get(
  '/summary',
  apiLimiter,
  authMiddleware,
  roleMiddleware(['admin', 'profesor']),
  DashboardController.getSummary
);

export default router;

