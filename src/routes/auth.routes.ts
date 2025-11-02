import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import {
  validateLogin,
  validateRefreshToken,
  validateLogout,
  validateForgotPassword,
  validateResetPassword,
} from '../middlewares/validators';
import { authMiddleware } from '../middlewares/auth';
import { authLimiter, passwordResetLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc Login de usuario
 * @access Public
 */
router.post('/login', authLimiter, validateLogin, AuthController.login);

/**
 * @route POST /api/auth/refresh
 * @desc Refrescar token de acceso
 * @access Public
 */
router.post('/refresh', validateRefreshToken, AuthController.refresh);

/**
 * @route POST /api/auth/logout
 * @desc Logout de usuario (revocar refresh token)
 * @access Private
 */
router.post('/logout', authMiddleware, validateLogout, AuthController.logout);

/**
 * @route POST /api/auth/forgot-password
 * @desc Solicitar recuperación de contraseña
 * @access Public
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateForgotPassword,
  AuthController.forgotPassword
);

/**
 * @route POST /api/auth/reset-password
 * @desc Resetear contraseña usando token
 * @access Public
 */
router.post('/reset-password', validateResetPassword, AuthController.resetPassword);

export default router;

