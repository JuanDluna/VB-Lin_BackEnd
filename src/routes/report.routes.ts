import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { validateReportDates } from '../middlewares/validators';
import { authMiddleware } from '../middlewares/auth';
import { roleMiddleware } from '../middlewares/role';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// Todas las rutas de reportes requieren autenticación y rol admin
router.use(authMiddleware);
router.use(roleMiddleware(['admin']));
router.use(apiLimiter);

/**
 * @route GET /api/reports/usage
 * @desc Reporte de uso de equipos en un rango de fechas
 * @access Admin
 */
router.get('/usage', validateReportDates, ReportController.getUsageReport);

/**
 * @route GET /api/reports/equipment-stats
 * @desc Estadísticas de equipos
 * @access Admin
 */
router.get('/equipment-stats', ReportController.getEquipmentStats);

/**
 * @route GET /api/reports/user-activity
 * @desc Reporte de actividad de usuarios
 * @access Admin
 */
router.get('/user-activity', ReportController.getUserActivity);

/**
 * @route GET /api/reports/overdue
 * @desc Reporte de préstamos vencidos
 * @access Admin
 */
router.get('/overdue', ReportController.getOverdue);

export default router;

