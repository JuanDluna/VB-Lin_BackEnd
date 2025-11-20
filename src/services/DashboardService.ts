import { Loan } from '../models';

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  topEquipmentLimit?: number;
  topUsersLimit?: number;
  daysLimit?: number;
}

interface Summary {
  totalLoans: number;
  activeLoans: number;
  reservedLoans: number;
  returnedLoans: number;
  overdueLoans: number;
  pendingReturns: number;
}

interface TopBorrowedEquipment {
  equipmentId: string;
  equipmentName: string;
  equipmentCode: string;
  totalLoans: number;
  activeLoans: number;
  averageLoanDuration: number;
  overdueCount: number;
}

interface MostActiveUser {
  userId: string;
  userName: string;
  userEmail: string;
  totalLoans: number;
  activeLoans: number;
  overdueLoans: number;
  onTimeReturnRate: number;
}

interface LoanByDate {
  date: string;
  loansCount: number;
  returnsCount: number;
  overdueCount: number;
}

interface LoanByStatus {
  status: string;
  count: number;
}

interface DashboardData {
  summary: Summary;
  topBorrowedEquipment: TopBorrowedEquipment[];
  mostActiveUsers: MostActiveUser[];
  loansByDate: LoanByDate[];
  loansByStatus: LoanByStatus[];
  averageLoanDuration: number;
  onTimeReturnRate: number;
}

/**
 * Servicio de Dashboard
 */
export class DashboardService {
  /**
   * Obtener resumen general del dashboard
   */
  static async getSummary(): Promise<Summary> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalLoans,
      activeLoans,
      reservedLoans,
      returnedLoans,
      overdueLoans,
      pendingReturns,
    ] = await Promise.all([
      Loan.countDocuments({}),
      Loan.countDocuments({ status: 'activo' }),
      Loan.countDocuments({ status: 'reservado' }),
      Loan.countDocuments({ status: 'devuelto' }),
      Loan.countDocuments({
        status: { $ne: 'devuelto' },
        endDate: { $lt: now },
      }),
      Loan.countDocuments({
        status: { $ne: 'devuelto' },
        endDate: { $gte: todayStart, $lte: todayEnd },
      }),
    ]);

    return {
      totalLoans,
      activeLoans,
      reservedLoans,
      returnedLoans,
      overdueLoans,
      pendingReturns,
    };
  }

  /**
   * Obtener equipos más prestados
   */
  static async getTopBorrowedEquipment(limit: number = 10): Promise<TopBorrowedEquipment[]> {

    const equipmentStats = await Loan.aggregate([
      {
        $group: {
          _id: '$equipmentId',
          totalLoans: { $sum: 1 },
          activeLoans: {
            $sum: {
              $cond: [{ $eq: ['$status', 'activo'] }, 1, 0],
            },
          },
          returnedLoans: {
            $push: {
              $cond: [
                { $eq: ['$status', 'devuelto'] },
                {
                  checkoutAt: '$checkoutAt',
                  returnedAt: '$returnedAt',
                  endDate: '$endDate',
                },
                null,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'equipment',
          localField: '_id',
          foreignField: '_id',
          as: 'equipment',
        },
      },
      {
        $unwind: {
          path: '$equipment',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          equipmentId: { $toString: '$_id' },
          equipmentName: '$equipment.name',
          equipmentCode: '$equipment.code',
          totalLoans: 1,
          activeLoans: 1,
          returnedLoans: {
            $filter: {
              input: '$returnedLoans',
              as: 'loan',
              cond: { $ne: ['$$loan', null] },
            },
          },
        },
      },
      {
        $addFields: {
          averageLoanDuration: {
            $cond: {
              if: {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: '$returnedLoans',
                        as: 'loan',
                        cond: {
                          $and: [
                            { $ne: ['$$loan.checkoutAt', null] },
                            { $ne: ['$$loan.returnedAt', null] },
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
              then: {
                $divide: [
                  {
                    $sum: {
                      $map: {
                        input: {
                          $filter: {
                            input: '$returnedLoans',
                            as: 'loan',
                            cond: {
                              $and: [
                                { $ne: ['$$loan.checkoutAt', null] },
                                { $ne: ['$$loan.returnedAt', null] },
                              ],
                            },
                          },
                        },
                        as: 'loan',
                        in: {
                          $divide: [
                            {
                              $subtract: [
                                { $toLong: '$$loan.returnedAt' },
                                { $toLong: '$$loan.checkoutAt' },
                              ],
                            },
                            3600000, // Convertir a horas
                          ],
                        },
                      },
                    },
                  },
                  {
                    $size: {
                      $filter: {
                        input: '$returnedLoans',
                        as: 'loan',
                        cond: {
                          $and: [
                            { $ne: ['$$loan.checkoutAt', null] },
                            { $ne: ['$$loan.returnedAt', null] },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
              else: 0,
            },
          },
          overdueCount: {
            $size: {
              $filter: {
                input: '$returnedLoans',
                as: 'loan',
                cond: {
                  $and: [
                    { $ne: ['$$loan.returnedAt', null] },
                    { $ne: ['$$loan.endDate', null] },
                    {
                      $gt: [
                        { $toLong: '$$loan.returnedAt' },
                        { $toLong: '$$loan.endDate' },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $sort: { totalLoans: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    return equipmentStats.map((stat) => ({
      equipmentId: stat.equipmentId,
      equipmentName: stat.equipmentName || 'N/A',
      equipmentCode: stat.equipmentCode || 'N/A',
      totalLoans: stat.totalLoans || 0,
      activeLoans: stat.activeLoans || 0,
      averageLoanDuration: Math.round((stat.averageLoanDuration || 0) * 100) / 100,
      overdueCount: stat.overdueCount || 0,
    }));
  }

  /**
   * Obtener usuarios más activos
   */
  static async getMostActiveUsers(limit: number = 10): Promise<MostActiveUser[]> {
    const now = new Date();

    const userStats = await Loan.aggregate([
      {
        $group: {
          _id: '$userId',
          totalLoans: { $sum: 1 },
          activeLoans: {
            $sum: {
              $cond: [{ $eq: ['$status', 'activo'] }, 1, 0],
            },
          },
          overdueLoans: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', 'devuelto'] },
                    { $lt: ['$endDate', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          returnedLoans: {
            $push: {
              $cond: [
                { $eq: ['$status', 'devuelto'] },
                {
                  returnedAt: '$returnedAt',
                  endDate: '$endDate',
                },
                null,
              ],
            },
          },
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
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          userId: { $toString: '$_id' },
          userName: {
            $concat: ['$user.firstName', ' ', '$user.lastName'],
          },
          userEmail: '$user.email',
          totalLoans: 1,
          activeLoans: 1,
          overdueLoans: 1,
          returnedLoans: {
            $filter: {
              input: '$returnedLoans',
              as: 'loan',
              cond: { $ne: ['$$loan', null] },
            },
          },
        },
      },
      {
        $addFields: {
          onTimeReturnRate: {
            $cond: {
              if: {
                $gt: [{ $size: '$returnedLoans' }, 0],
              },
              then: {
                $multiply: [
                  {
                    $divide: [
                      {
                        $size: {
                          $filter: {
                            input: '$returnedLoans',
                            as: 'loan',
                            cond: {
                              $and: [
                                { $ne: ['$$loan.returnedAt', null] },
                                { $ne: ['$$loan.endDate', null] },
                                {
                                  $lte: [
                                    { $toLong: '$$loan.returnedAt' },
                                    { $toLong: '$$loan.endDate' },
                                  ],
                                },
                              ],
                            },
                          },
                        },
                      },
                      { $size: '$returnedLoans' },
                    ],
                  },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },
      {
        $sort: { totalLoans: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    return userStats.map((stat) => ({
      userId: stat.userId,
      userName: stat.userName || 'N/A',
      userEmail: stat.userEmail || 'N/A',
      totalLoans: stat.totalLoans || 0,
      activeLoans: stat.activeLoans || 0,
      overdueLoans: stat.overdueLoans || 0,
      onTimeReturnRate: Math.round((stat.onTimeReturnRate || 0) * 100) / 100,
    }));
  }

  /**
   * Obtener préstamos agrupados por fecha
   */
  static async getLoansByDate(
    startDate?: Date,
    endDate?: Date,
    daysLimit: number = 30
  ): Promise<LoanByDate[]> {
    let dateStart: Date;
    let dateEnd: Date = new Date();
    dateEnd.setHours(23, 59, 59, 999);

    if (startDate && endDate) {
      dateStart = new Date(startDate);
      dateStart.setHours(0, 0, 0, 0);
      dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);
    } else {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - daysLimit);
      dateStart.setHours(0, 0, 0, 0);
    }

    const loansByDate = await Loan.aggregate([
      {
        $match: {
          $or: [
            { reservedAt: { $gte: dateStart, $lte: dateEnd } },
            { returnedAt: { $gte: dateStart, $lte: dateEnd } },
            { endDate: { $gte: dateStart, $lte: dateEnd } },
          ],
        },
      },
      {
        $facet: {
          loansCreated: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$reservedAt',
                  },
                },
                count: { $sum: 1 },
              },
            },
          ],
          loansReturned: [
            {
              $match: {
                status: 'devuelto',
                returnedAt: { $ne: null },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$returnedAt',
                  },
                },
                count: { $sum: 1 },
              },
            },
          ],
          loansOverdue: [
            {
              $match: {
                $or: [
                  {
                    $and: [
                      { status: { $ne: 'devuelto' } },
                      { endDate: { $gte: dateStart, $lte: dateEnd } },
                    ],
                  },
                  {
                    $and: [
                      { status: 'devuelto' },
                      { returnedAt: { $ne: null } },
                      { endDate: { $ne: null } },
                      {
                        $expr: {
                          $gt: ['$returnedAt', '$endDate'],
                        },
                      },
                    ],
                  },
                ],
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$endDate',
                  },
                },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $project: {
          allDates: {
            $setUnion: [
              '$loansCreated._id',
              '$loansReturned._id',
              '$loansOverdue._id',
            ],
          },
          loansCreated: 1,
          loansReturned: 1,
          loansOverdue: 1,
        },
      },
      {
        $unwind: '$allDates',
      },
      {
        $project: {
          date: '$allDates',
          loansCount: {
            $ifNull: [
              {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: '$loansCreated',
                          as: 'item',
                          cond: { $eq: ['$$item._id', '$allDates'] },
                        },
                      },
                      as: 'item',
                      in: '$$item.count',
                    },
                  },
                  0,
                ],
              },
              0,
            ],
          },
          returnsCount: {
            $ifNull: [
              {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: '$loansReturned',
                          as: 'item',
                          cond: { $eq: ['$$item._id', '$allDates'] },
                        },
                      },
                      as: 'item',
                      in: '$$item.count',
                    },
                  },
                  0,
                ],
              },
              0,
            ],
          },
          overdueCount: {
            $ifNull: [
              {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: '$loansOverdue',
                          as: 'item',
                          cond: { $eq: ['$$item._id', '$allDates'] },
                        },
                      },
                      as: 'item',
                      in: '$$item.count',
                    },
                  },
                  0,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    return loansByDate.map((item) => ({
      date: item.date,
      loansCount: item.loansCount || 0,
      returnsCount: item.returnsCount || 0,
      overdueCount: item.overdueCount || 0,
    }));
  }

  /**
   * Obtener préstamos agrupados por status
   */
  static async getLoansByStatus(): Promise<LoanByStatus[]> {
    const statusCounts = await Loan.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusMap = new Map(statusCounts.map((item) => [item._id, item.count || 0]));

    const allStatuses = ['reservado', 'activo', 'devuelto', 'vencido'];

    return allStatuses.map((status) => ({
      status,
      count: statusMap.get(status) || 0,
    }));
  }

  /**
   * Calcular duración promedio de préstamos
   */
  static async getAverageLoanDuration(): Promise<number> {
    const result = await Loan.aggregate([
      {
        $match: {
          status: 'devuelto',
          checkoutAt: { $ne: null },
          returnedAt: { $ne: null },
        },
      },
      {
        $project: {
          duration: {
            $divide: [
              {
                $subtract: [
                  { $toLong: '$returnedAt' },
                  { $toLong: '$checkoutAt' },
                ],
              },
              3600000, // Convertir a horas
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          averageDuration: { $avg: '$duration' },
        },
      },
    ]);

    if (result.length === 0 || !result[0].averageDuration) {
      return 0;
    }

    return Math.round((result[0].averageDuration as number) * 100) / 100;
  }

  /**
   * Calcular tasa de devolución a tiempo
   */
  static async getOnTimeReturnRate(): Promise<number> {
    const result = await Loan.aggregate([
      {
        $match: {
          status: 'devuelto',
          returnedAt: { $ne: null },
          endDate: { $ne: null },
        },
      },
      {
        $project: {
          isOnTime: {
            $cond: [
              {
                $lte: [
                  { $toLong: '$returnedAt' },
                  { $toLong: '$endDate' },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          onTime: { $sum: '$isOnTime' },
        },
      },
    ]);

    if (result.length === 0 || result[0].total === 0) {
      return 0;
    }

    const rate = (result[0].onTime / result[0].total) * 100;
    return Math.round(rate * 100) / 100;
  }

  /**
   * Obtener todos los datos del dashboard
   */
  static async getDashboard(filters: DashboardFilters): Promise<DashboardData> {
    const {
      startDate,
      endDate,
      topEquipmentLimit = 10,
      topUsersLimit = 10,
      daysLimit = 30,
    } = filters;

    const [
      summary,
      topBorrowedEquipment,
      mostActiveUsers,
      loansByDate,
      loansByStatus,
      averageLoanDuration,
      onTimeReturnRate,
    ] = await Promise.all([
      this.getSummary(),
      this.getTopBorrowedEquipment(topEquipmentLimit),
      this.getMostActiveUsers(topUsersLimit),
      this.getLoansByDate(startDate, endDate, daysLimit),
      this.getLoansByStatus(),
      this.getAverageLoanDuration(),
      this.getOnTimeReturnRate(),
    ]);

    return {
      summary,
      topBorrowedEquipment,
      mostActiveUsers,
      loansByDate,
      loansByStatus,
      averageLoanDuration,
      onTimeReturnRate,
    };
  }
}

