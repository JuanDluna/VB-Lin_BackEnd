import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import {
  validateUpdateUser,
  validatePagination,
  validateMongoId,
} from '../middlewares/validators';
import { authMiddleware } from '../middlewares/auth';
import { roleMiddleware } from '../middlewares/role';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * @route GET /api/users
 * @desc Obtener lista de usuarios (paginada)
 * @access Admin
 */
router.get(
  '/',
  apiLimiter,
  authMiddleware,
  roleMiddleware(['admin']),
  validatePagination,
  UserController.getUsers
);

/**
 * @route GET /api/users/:id
 * @desc Obtener usuario por ID
 * @access Private (propio o admin)
 */
router.get(
  '/:id',
  apiLimiter,
  authMiddleware,
  validateMongoId('id'),
  UserController.getUserById
);

  /**
   * @route PUT /api/users/:id
 * @desc Actualizar usuario
 * @access Private (propio o admin)
 */
router.put(
  '/:id',
  apiLimiter,
  authMiddleware,
  validateMongoId('id'),
  validateUpdateUser,
  UserController.updateUser
);

/**
 * @route DELETE /api/users/:id
 * @desc Eliminar usuario
 * @access Admin
 */
router.delete(
  '/:id',
  apiLimiter,
  authMiddleware,
  roleMiddleware(['admin']),
  validateMongoId('id'),
  UserController.deleteUser
);

export default router;

