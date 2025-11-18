import { Equipment, IEquipment } from '../models';
import { AppError } from '../middlewares/errorHandler';

/**
 * Servicio de equipos
 */
export class EquipmentService {
  /**
   * Obtener lista paginada de equipos con filtros
   */
  static async getEquipment(
    page: number = 1,
    limit: number = 20,
    q?: string,
    category?: string,
    status?: string
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    // Filtro de búsqueda por nombre o descripción
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    // Filtro por categoría
    if (category) {
      filter.category = category;
    }

    // Filtro por estado
    if (status) {
      filter.status = status;
    }

    const [equipment, total] = await Promise.all([
      Equipment.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Equipment.countDocuments(filter),
    ]);

    // Serializar equipos a JSON correctamente
    const equipmentList = equipment.map((eq) => eq.toJSON());

    return {
      data: equipmentList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener equipo por ID
   */
  static async getEquipmentById(id: string): Promise<IEquipment> {
    const equipment = await Equipment.findById(id);

    if (!equipment) {
      throw new AppError('Equipo no encontrado', 404);
    }

    return equipment;
  }

  /**
   * Crear nuevo equipo
   */
  static async createEquipment(data: {
    code: string;
    name: string;
    description?: string;
    category: string;
    status?: 'disponible' | 'prestado' | 'mantenimiento';
    location: string;
    acquisitionDate: Date;
    estimatedValue: number;
  }): Promise<IEquipment> {
    // Verificar si el código ya existe
    const existing = await Equipment.findOne({ code: data.code.toUpperCase() });

    if (existing) {
      throw new AppError('El código del equipo ya existe', 409);
    }

    const equipment = new Equipment({
      ...data,
      code: data.code.toUpperCase(),
      status: data.status || 'disponible',
    });

    await equipment.save();
    return equipment;
  }

  /**
   * Actualizar equipo
   */
  static async updateEquipment(id: string, updateData: Partial<IEquipment>): Promise<IEquipment> {
    const equipment = await Equipment.findById(id);

    if (!equipment) {
      throw new AppError('Equipo no encontrado', 404);
    }

    // Si se actualiza el código, verificar que no exista
    if (updateData.code && updateData.code !== equipment.code) {
      const existing = await Equipment.findOne({ code: updateData.code.toUpperCase() });
      if (existing) {
        throw new AppError('El código del equipo ya existe', 409);
      }
      updateData.code = updateData.code.toUpperCase();
    }

    // Actualizar campos
    Object.assign(equipment, updateData);
    await equipment.save();

    return equipment;
  }

  /**
   * Eliminar equipo
   */
  static async deleteEquipment(id: string): Promise<void> {
    const equipment = await Equipment.findById(id);

    if (!equipment) {
      throw new AppError('Equipo no encontrado', 404);
    }

    // Verificar si tiene préstamos activos
    const { Loan } = await import('../models');
    const activeLoans = await Loan.countDocuments({
      equipmentId: id,
      status: { $in: ['reservado', 'activo'] },
    });

    if (activeLoans > 0) {
      throw new AppError(
        'No se puede eliminar un equipo con préstamos activos o reservados',
        409
      );
    }

    await Equipment.findByIdAndDelete(id);
  }
}

