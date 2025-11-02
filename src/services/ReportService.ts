import { Loan, Equipment, User } from '../models';

/**
 * Servicio de reportes (solo admin)
 */
export class ReportService {
  /**
   * Reporte de uso de equipos en un rango de fechas
   */
  static async getUsageReport(from?: Date, to?: Date) {
    const filter: any = {};

    if (from && to) {
      filter.reservedAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    const loans = await Loan.find(filter)
      .populate('equipmentId', 'code name category')
      .populate('userId', 'firstName lastName email role')
      .sort({ reservedAt: -1 });

    const stats = {
      totalLoans: loans.length,
      byStatus: {
        reservado: loans.filter((l) => l.status === 'reservado').length,
        activo: loans.filter((l) => l.status === 'activo').length,
        devuelto: loans.filter((l) => l.status === 'devuelto').length,
        vencido: loans.filter((l) => l.status === 'vencido').length,
      },
      byRole: {
        estudiante: loans.filter((l: any) => l.userId?.role === 'estudiante').length,
        profesor: loans.filter((l: any) => l.userId?.role === 'profesor').length,
      },
      loans,
    };

    return stats;
  }

  /**
   * Estadísticas de equipos
   */
  static async getEquipmentStats() {
    const [total, byStatus, byCategory] = await Promise.all([
      Equipment.countDocuments(),
      Equipment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Equipment.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusMap: Record<string, number> = {
      disponible: 0,
      prestado: 0,
      mantenimiento: 0,
    };

    byStatus.forEach((item) => {
      statusMap[item._id] = item.count;
    });

    return {
      total,
      byStatus: statusMap,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Reporte de actividad de usuarios
   */
  static async getUserActivityReport() {
    const [totalUsers, activeUsers, loansByUser] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ active: true }),
      Loan.aggregate([
        {
          $group: {
            _id: '$userId',
            loanCount: { $sum: 1 },
            lastLoan: { $max: '$reservedAt' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: '$user',
        },
        {
          $project: {
            userId: '$_id',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            email: '$user.email',
            role: '$user.role',
            loanCount: 1,
            lastLoan: 1,
          },
        },
        {
          $sort: { loanCount: -1 },
        },
      ]),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      topUsers: loansByUser.slice(0, 10),
      loansByUser,
    };
  }

  /**
   * Reporte de préstamos vencidos
   */
  static async getOverdueReport() {
    const overdueLoans = await Loan.find({
      status: 'vencido',
    })
      .populate('userId', 'firstName lastName email role')
      .populate('equipmentId', 'code name category location')
      .sort({ endDate: 1 });

    const now = new Date();
    const stats = {
      totalOverdue: overdueLoans.length,
      byDaysOverdue: overdueLoans.map((loan) => {
        const daysOverdue = Math.floor(
          (now.getTime() - loan.endDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          loanId: loan._id,
          daysOverdue,
          endDate: loan.endDate,
          userId: loan.userId,
          equipmentId: loan.equipmentId,
        };
      }),
      loans: overdueLoans,
    };

    return stats;
  }
}

