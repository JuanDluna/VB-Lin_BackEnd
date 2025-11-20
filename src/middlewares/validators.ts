import { body, query, param, ValidationChain } from 'express-validator';

/**
 * Validadores para autenticación
 */
export const validateLogin = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida'),
];

export const validateRefreshToken = [
  body('refreshToken').notEmpty().withMessage('El refresh token es requerido'),
];

export const validateLogout = [
  body('refreshToken').notEmpty().withMessage('El refresh token es requerido'),
];

export const validateForgotPassword = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
];

export const validateResetPassword = [
  body('token').notEmpty().withMessage('El token es requerido'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('La contraseña debe contener al menos una letra mayúscula')
    .matches(/[a-z]/)
    .withMessage('La contraseña debe contener al menos una letra minúscula')
    .matches(/[0-9]/)
    .withMessage('La contraseña debe contener al menos un número'),
];

/**
 * Validadores para usuarios
 */
export const validateRegister = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('La contraseña debe contener al menos una letra mayúscula')
    .matches(/[a-z]/)
    .withMessage('La contraseña debe contener al menos una letra minúscula')
    .matches(/[0-9]/)
    .withMessage('La contraseña debe contener al menos un número'),
  body('firstName').trim().notEmpty().withMessage('El nombre es requerido'),
  body('lastName').trim().notEmpty().withMessage('El apellido es requerido'),
  body('role')
    .optional()
    .isIn(['estudiante', 'profesor', 'admin'])
    .withMessage('Rol inválido. Debe ser: estudiante, profesor o admin'),
];

export const validateUpdateUser = [
  body('firstName').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('lastName').optional().trim().notEmpty().withMessage('El apellido no puede estar vacío'),
  body('role')
    .optional()
    .isIn(['estudiante', 'profesor', 'admin'])
    .withMessage('Rol inválido'),
  body('active').optional().isBoolean().withMessage('Active debe ser un booleano'),
];

export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe ser entre 1 y 100'),
];

/**
 * Validadores para equipos
 */
export const validateEquipment = [
  body('code').trim().notEmpty().withMessage('El código es requerido').toUpperCase(),
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('description').optional().trim(),
  body('category').trim().notEmpty().withMessage('La categoría es requerida'),
  body('status')
    .optional()
    .isIn(['disponible', 'prestado', 'mantenimiento'])
    .withMessage('Estado inválido'),
  body('location').trim().notEmpty().withMessage('La ubicación es requerida'),
  body('acquisitionDate').isISO8601().withMessage('Fecha de adquisición inválida'),
  body('estimatedValue').isFloat({ min: 0 }).withMessage('El valor estimado debe ser un número positivo'),
];

export const validateUpdateEquipment = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('description').optional().trim(),
  body('category').optional().trim().notEmpty().withMessage('La categoría no puede estar vacía'),
  body('status')
    .optional()
    .isIn(['disponible', 'prestado', 'mantenimiento'])
    .withMessage('Estado inválido'),
  body('location').optional().trim().notEmpty().withMessage('La ubicación no puede estar vacía'),
  body('acquisitionDate').optional().isISO8601().withMessage('Fecha de adquisición inválida'),
  body('estimatedValue').optional().isFloat({ min: 0 }).withMessage('El valor estimado debe ser un número positivo'),
];

/**
 * Validadores para préstamos
 */
export const validateReserveLoan = [
  body('equipmentId').isMongoId().withMessage('ID de equipo inválido'),
  body('startDate').isISO8601().withMessage('Fecha de inicio inválida'),
  body('endDate').isISO8601().withMessage('Fecha de fin inválida'),
  body('reservationRemarks').optional().trim(),
];

export const validateReturnLoan = [
  body('returnRemarks').optional().trim(),
];

export const validateLoanFilters = [
  query('status')
    .optional()
    .isIn(['reservado', 'activo', 'devuelto', 'vencido'])
    .withMessage('Estado inválido'),
  query('userId').optional().isMongoId().withMessage('ID de usuario inválido'),
];

/**
 * Validadores para notificaciones
 */
export const validateRegisterFCM = [
  // Aceptar tanto fcmToken como fcm_token para compatibilidad
  body('fcmToken')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El token FCM es requerido'),
  body('fcm_token')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El token FCM es requerido'),
  // Validar que al menos uno de los dos esté presente
  body().custom((value) => {
    if (!value.fcmToken && !value.fcm_token) {
      throw new Error('El token FCM es requerido (fcmToken o fcm_token)');
    }
    return true;
  }),
];

export const validateSendNotification = [
  body('userId').isMongoId().withMessage('ID de usuario inválido'),
  body('type')
    .isIn(['reserva', 'recordatorio', 'vencimiento'])
    .withMessage('Tipo de notificación inválido'),
  body('message').trim().notEmpty().withMessage('El mensaje es requerido'),
];

/**
 * Validadores para reportes
 */
export const validateReportDates = [
  query('from').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  query('to').optional().isISO8601().withMessage('Fecha de fin inválida'),
];

/**
 * Validador de parámetros ID
 */
export const validateMongoId = (field: string = 'id'): ValidationChain[] => {
  return [param(field).isMongoId().withMessage(`ID inválido para ${field}`)];
};

