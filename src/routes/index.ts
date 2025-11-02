import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import equipmentRoutes from './equipment.routes';
import loanRoutes from './loan.routes';
import notificationRoutes from './notification.routes';
import reportRoutes from './report.routes';

const router = Router();

// Rutas de la API
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/loans', loanRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);

export default router;

