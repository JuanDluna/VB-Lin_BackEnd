import { Router } from 'express';
import { EquipmentController } from '../controllers/EquipmentController';
import {
  validateEquipment,
  validateUpdateEquipment,
  validatePagination,
  validateMongoId,
} from '../middlewares/validators';
import { authMiddleware } from '../middlewares/auth';
import { roleMiddleware } from '../middlewares/role';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * @route GET /api/equipment
 * @desc Obtener lista de equipos (paginada, filtros opcionales)
 * @access Public
 */
router.get('/', apiLimiter, validatePagination, EquipmentController.getEquipment);

/**
 * @route GET /api/equipment/:id
 * @desc Obtener equipo por ID
 * @access Public
 */
router.get(
  '/:id',
  apiLimiter,
  validateMongoId('id'),
  EquipmentController.getEquipmentById
);

/**
 * @route POST /api/equipment
 * @desc Crear nuevo equipo
 * @access Admin, Profesor
 */
router.post(
  '/',
  apiLimiter,
  authMiddleware,
  roleMiddleware(['admin', 'profesor']),
  validateEquipment,
  EquipmentController.createEquipment
);

/**
 * @route PUT /api/equipment/:id
 * @desc Actualizar equipo
 * @access Admin, Profesor
 */
router.put(
  '/:id',
  apiLimiter,
  authMiddleware,
  roleMiddleware(['admin', 'profesor']),
  validateMongoId('id'),
  validateUpdateEquipment,
  EquipmentController.updateEquipment
);

/**
 * @route DELETE /api/equipment/:id
 * @desc Eliminar equipo
 * @access Admin, Profesor
 */
router.delete(
  '/:id',
  apiLimiter,
  authMiddleware,
  roleMiddleware(['admin', 'profesor']),
  validateMongoId('id'),
  EquipmentController.deleteEquipment
);

export default router;

