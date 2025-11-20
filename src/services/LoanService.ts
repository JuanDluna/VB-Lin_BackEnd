import { Loan, ILoan, Equipment, User } from '../models';
import { AppError } from '../middlewares/errorHandler';
import { NotificationService } from './NotificationService';
import { Types } from 'mongoose';

/**
 * Servicio de préstamos
 */
export class LoanService {
  /**
   * Obtener lista paginada de préstamos con filtros
   */
  static async getLoans(
    page: number = 1,
    limit: number = 20,
    status?: string,
    userId?: string
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (userId) {
      filter.userId = userId;
    }

    const [loans, total] = await Promise.all([
      Loan.find(filter)
        .populate('userId', 'firstName lastName email role')
        .populate('equipmentId', 'code name category')
        .skip(skip)
        .limit(limit)
        .sort({ reservedAt: -1 }),
      Loan.countDocuments(filter),
    ]);

    return {
      data: loans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener préstamo por ID
   */
  static async getLoanById(id: string): Promise<ILoan> {
    const loan = await Loan.findById(id)
      .populate('userId', 'firstName lastName email role')
      .populate('equipmentId', 'code name category status location');

    if (!loan) {
      throw new AppError('Préstamo no encontrado', 404);
    }

    return loan;
  }

  /**
   * Crear reserva de préstamo
   * Reglas de negocio:
   * - Estudiantes: máximo 3 días
   * - Profesores: máximo 7 días
   * - No permitir solapamiento de reservas/activos
   */
  static async createReservation(
    userId: string,
    equipmentId: string,
    startDate: Date,
    endDate: Date,
    reservationRemarks?: string
  ): Promise<ILoan> {
    // Validar que el equipo existe
    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) {
      throw new AppError('Equipo no encontrado', 404);
    }

    // Validar que el equipo está disponible
    if (equipment.status === 'mantenimiento') {
      throw new AppError('El equipo está en mantenimiento y no puede ser prestado', 400);
    }

    // Validar que el usuario existe
    const user = await User.findById(userId);
    if (!user || !user.active) {
      throw new AppError('Usuario no encontrado o inactivo', 404);
    }

    // Validar fechas
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
      throw new AppError('La fecha de inicio debe ser en el futuro', 400);
    }

    if (end <= start) {
      throw new AppError('La fecha de fin debe ser posterior a la fecha de inicio', 400);
    }

    // Validar límite de días según rol
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const maxDays = user.role === 'profesor' ? 7 : 3;

    if (daysDiff > maxDays) {
      throw new AppError(
        `El límite de reserva para ${user.role}s es de ${maxDays} días`,
        400
      );
    }

    // Verificar solapamiento de reservas/activos
    const overlappingLoan = await Loan.findOne({
      equipmentId: new Types.ObjectId(equipmentId),
      status: { $in: ['reservado', 'activo'] },
      $or: [
        {
          // Caso 1: Nueva reserva comienza durante un préstamo existente
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      ],
    });

    if (overlappingLoan) {
      throw new AppError(
        'El equipo ya está reservado o en préstamo en el rango de fechas solicitado',
        409
      );
    }

    // Crear reserva
    const loan = new Loan({
      userId: new Types.ObjectId(userId),
      equipmentId: new Types.ObjectId(equipmentId),
      startDate: start,
      endDate: end,
      status: 'reservado',
      reservedAt: new Date(),
      reservationRemarks: reservationRemarks || '',
    });

    await loan.save();

    // Actualizar estado del equipo a 'prestado'
    equipment.status = 'prestado';
    await equipment.save();

    // Enviar notificación
    await NotificationService.createNotification(
      userId,
      'reserva',
      `Tu reserva para el equipo ${equipment.code} ha sido creada exitosamente.`
    );

    // Poblar equipmentId y userId antes de devolver
    const populatedLoan = await Loan.findById(loan._id)
      .populate('userId', 'firstName lastName email role')
      .populate('equipmentId', 'code name category');

    if (!populatedLoan) {
      throw new AppError('Error al obtener préstamo creado', 500);
    }

    return populatedLoan;
  }

  /**
   * Realizar checkout (marcar como activo)
   */
  static async checkout(id: string): Promise<ILoan> {
    const loan = await Loan.findById(id).populate('equipmentId');

    if (!loan) {
      throw new AppError('Préstamo no encontrado', 404);
    }

    if (loan.status !== 'reservado') {
      throw new AppError('Solo se puede hacer checkout de préstamos reservados', 400);
    }

    loan.status = 'activo';
    loan.checkoutAt = new Date();
    await loan.save();

    return loan;
  }

  /**
   * Devolver préstamo
   */
  static async returnLoan(id: string, returnRemarks?: string, userId?: string): Promise<ILoan> {
    const loan = await Loan.findById(id)
      .populate('userId', 'firstName lastName email role')
      .populate('equipmentId', 'code name category');

    if (!loan) {
      throw new AppError('Préstamo no encontrado', 404);
    }

    // Verificar que el usuario que devuelve sea el dueño del préstamo o admin
    if (userId) {
      // Obtener el ID del usuario del préstamo (puede estar poblado o no)
      const loanUserId = (loan.userId as any)._id 
        ? (loan.userId as any)._id.toString() 
        : loan.userId.toString();
      
      if (loanUserId !== userId) {
        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') {
          throw new AppError('No tienes permisos para devolver este préstamo', 403);
        }
      }
    }

    if (loan.status === 'devuelto') {
      throw new AppError('Este préstamo ya ha sido devuelto', 400);
    }

    loan.status = 'devuelto';
    loan.returnedAt = new Date();
    loan.returnRemarks = returnRemarks || '';

    await loan.save();

    // Actualizar estado del equipo a disponible si no hay otros préstamos activos
    const equipment = loan.equipmentId as any;
    const activeLoans = await Loan.countDocuments({
      equipmentId: equipment._id,
      status: { $in: ['reservado', 'activo'] },
    });

    if (activeLoans === 0) {
      equipment.status = 'disponible';
      await equipment.save();
    }

    // Volver a poblar después de guardar para asegurar datos actualizados
    const updatedLoan = await Loan.findById(id)
      .populate('userId', 'firstName lastName email role')
      .populate('equipmentId', 'code name category');

    if (!updatedLoan) {
      throw new AppError('Error al obtener préstamo actualizado', 500);
    }

    return updatedLoan;
  }

  /**
   * Obtener préstamos de un usuario
   */
  static async getUserLoans(userId: string) {
    const loans = await Loan.find({ userId })
      .populate('equipmentId', 'code name category')
      .sort({ reservedAt: -1 });

    return loans;
  }

  /**
   * Marcar préstamos vencidos (debe ejecutarse periódicamente)
   */
  static async checkOverdueLoans(): Promise<void> {
    const now = new Date();

    const overdueLoans = await Loan.find({
      status: { $in: ['reservado', 'activo'] },
      endDate: { $lt: now },
    })
      .populate('userId', 'firstName lastName email')
      .populate('equipmentId', 'code name category');

    for (const loan of overdueLoans) {
      loan.status = 'vencido';
      await loan.save();

      // Enviar notificación
      const user = loan.userId as any;
      const equipment = loan.equipmentId as any;
      await NotificationService.createNotification(
        user._id.toString(),
        'vencimiento',
        `Tu préstamo del equipo ${equipment?.code || 'N/A'} - ${equipment?.name || 'N/A'} ha vencido. Por favor, devuélvelo lo antes posible.`
      );
    }
  }

  /**
   * Verificar y enviar notificaciones de recordatorio para préstamos próximos a vencer
   * Se ejecuta periódicamente para enviar recordatorios 24h antes, el día de vencimiento, y para vencidos
   */
  static async checkAndSendLoanReminders(): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Inicio del día siguiente

    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // Inicio del día actual

    // Obtener préstamos activos y reservados que no han sido devueltos
    const activeLoans = await Loan.find({
      status: { $in: ['reservado', 'activo'] },
      returnedAt: null, // No devueltos
    })
      .populate('userId', 'firstName lastName email')
      .populate('equipmentId', 'code name category');

    for (const loan of activeLoans) {
      const user = loan.userId as any;
      const equipment = loan.equipmentId as any;
      const userId = user._id.toString();
      const equipmentName = equipment?.name || 'Equipo';
      const equipmentCode = equipment?.code || 'N/A';
      const endDate = new Date(loan.endDate);

      // Calcular diferencia en días
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Verificar si ya se envió una notificación del mismo tipo hoy
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      // Recordatorio 24h antes (mañana vence)
      if (diffDays === 1) {
        const alreadySent24h = await NotificationService.hasNotificationToday(
          userId,
          'recordatorio',
          `El equipo "${equipmentName}" debe devolverse mañana`
        );
        if (!alreadySent24h) {
          await NotificationService.sendLoanReminderPush(
            userId,
            equipmentName,
            equipmentCode,
            loan._id.toString(),
            equipment?._id?.toString() || '',
            endDate.toISOString(),
            1,
            'recordatorio_24h'
          );
        }
      }
      // Recordatorio el día de vencimiento (vence hoy)
      else if (diffDays === 0) {
        const alreadySentToday = await NotificationService.hasNotificationToday(
          userId,
          'recordatorio',
          `El equipo "${equipmentName}" debe devolverse hoy`
        );
        if (!alreadySentToday) {
          await NotificationService.sendLoanReminderPush(
            userId,
            equipmentName,
            equipmentCode,
            loan._id.toString(),
            equipment?._id?.toString() || '',
            endDate.toISOString(),
            0,
            'recordatorio_hoy'
          );
        }
      }
      // Alerta de vencimiento (ya venció)
      else if (diffDays < 0) {
        // Solo enviar si el préstamo aún no está marcado como vencido
        if (loan.status !== 'vencido') {
          loan.status = 'vencido';
          await loan.save();
        }

        const alreadySentOverdue = await NotificationService.hasNotificationToday(
          userId,
          'vencimiento',
          `El equipo "${equipmentName}" ha vencido`
        );
        if (!alreadySentOverdue) {
          await NotificationService.sendLoanReminderPush(
            userId,
            equipmentName,
            equipmentCode,
            loan._id.toString(),
            equipment?._id?.toString() || '',
            endDate.toISOString(),
            diffDays,
            'vencido'
          );
        }
      }
    }
  }
}

