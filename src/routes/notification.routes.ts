import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import {
  validatePagination,
  validateRegisterFCM,
  validateSendNotification,
  validateMongoId,
} from '../middlewares/validators';
import { authMiddleware } from '../middlewares/auth';
import { roleMiddleware } from '../middlewares/role';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * @route GET /api/notifications
 * @desc Obtener lista de notificaciones del usuario (paginada)
 * @access Private
 */
router.get(
  '/',
  apiLimiter,
  authMiddleware,
  validatePagination,
  NotificationController.getNotifications
);

/**
 * @route PUT /api/notifications/:id/read
 * @desc Marcar notificación como leída
 * @access Private
 */
router.put(
  '/:id/read',
  apiLimiter,
  authMiddleware,
  validateMongoId('id'),
  NotificationController.markAsRead
);

/**
 * @route POST /api/notifications/register
 * @desc Registrar token FCM para push notifications
 * @access Private
 */
router.post(
  '/register',
  apiLimiter,
  authMiddleware,
  validateRegisterFCM,
  NotificationController.registerFCM
);

/**
 * @route POST /api/notifications/send
 * @desc Enviar notificación manual (admin)
 * @access Admin
 */
router.post(
  '/send',
  apiLimiter,
  authMiddleware,
  roleMiddleware(['admin']),
  validateSendNotification,
  NotificationController.sendNotification
);

export default router;

