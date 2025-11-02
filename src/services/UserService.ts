import bcrypt from 'bcrypt';
import { User, IUser } from '../models';
import { AppError } from '../middlewares/errorHandler';
import { revokeAllUserTokens } from '../utils/redis';

/**
 * Servicio de usuarios
 */
export class UserService {
  /**
   * Obtener lista paginada de usuarios
   */
  static async getUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener usuario por ID
   */
  static async getUserById(id: string): Promise<IUser> {
    const user = await User.findById(id);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    return user;
  }

  /**
   * Registrar nuevo usuario (rol 'estudiante' por defecto)
   */
  static async registerUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<IUser> {
    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      throw new AppError('El email ya está registrado', 409);
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: 'estudiante', // Por defecto
      active: true,
      createdAt: new Date(),
      lastAccess: new Date(),
    });

    await user.save();
    return user;
  }

  /**
   * Actualizar usuario
   */
  static async updateUser(
    id: string,
    updateData: {
      firstName?: string;
      lastName?: string;
      role?: 'estudiante' | 'profesor' | 'admin';
      active?: boolean;
    },
    currentUserId: string,
    currentUserRole: string
  ): Promise<IUser> {
    const user = await User.findById(id);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Solo admin puede cambiar roles y activar/desactivar usuarios
    if (updateData.role && currentUserRole !== 'admin') {
      throw new AppError('Solo los administradores pueden cambiar roles', 403);
    }

    if (updateData.active !== undefined && currentUserRole !== 'admin') {
      throw new AppError('Solo los administradores pueden activar/desactivar usuarios', 403);
    }

    // No permitir que un usuario se desactive a sí mismo
    if (updateData.active === false && id === currentUserId && currentUserRole === 'admin') {
      throw new AppError('No puedes desactivar tu propia cuenta', 400);
    }

    // Actualizar campos
    if (updateData.firstName !== undefined) user.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) user.lastName = updateData.lastName;
    if (updateData.role !== undefined) user.role = updateData.role;
    if (updateData.active !== undefined) {
      user.active = updateData.active;
      // Si se desactiva, revocar todos los tokens
      if (updateData.active === false) {
        await revokeAllUserTokens(id);
      }
    }

    await user.save();
    return user;
  }

  /**
   * Eliminar usuario (soft delete o hard delete)
   */
  static async deleteUser(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new AppError('No puedes eliminar tu propia cuenta', 400);
    }

    const user = await User.findById(id);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Revocar tokens antes de eliminar
    await revokeAllUserTokens(id);

    await User.findByIdAndDelete(id);
  }
}

