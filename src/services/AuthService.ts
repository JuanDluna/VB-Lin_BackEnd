import bcrypt from 'bcrypt';
import { User, IUser } from '../models';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getExpirationInSeconds,
} from '../utils/jwt';
import { saveRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../utils/redis';
import { config } from '../config';
import { AppError } from '../middlewares/errorHandler';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * Servicio de autenticación
 */
export class AuthService {
  /**
   * Registro de nuevo usuario (rol 'estudiante' por defecto)
   */
  static async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: 'estudiante' | 'profesor' | 'admin'
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token: string;
    refreshToken: string;
    user: Partial<IUser>;
  }> {
    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      throw new AppError('El email ya está registrado', 409);
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Validar rol (solo admin puede crear otros admins, pero por ahora permitimos profesor y estudiante)
    // Por seguridad, no permitir crear admins desde el registro público
    const userRole = role && role !== 'admin' ? role : 'estudiante';

    // Crear usuario con el rol especificado o 'estudiante' por defecto
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: userRole,
      active: true,
      createdAt: new Date(),
      lastAccess: new Date(),
    });

    await user.save();

    // Generar tokens
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Validar que los tokens se generaron correctamente
    if (!token || !refreshToken || typeof token !== 'string' || typeof refreshToken !== 'string') {
      throw new AppError('Error al generar tokens de autenticación', 500);
    }

    // Guardar refresh token en Redis
    const expiresInSeconds = getExpirationInSeconds(config.jwtRefreshExpires);
    await saveRefreshToken(user._id.toString(), refreshToken, expiresInSeconds);

    // Obtener datos del usuario sin passwordHash
    const userData = user.toJSON();

    // Calcular expires_in en segundos para el access token
    const accessTokenExpiresIn = getExpirationInSeconds(config.jwtAccessExpires);

    return {
      // Compatibilidad con Flutter: usar access_token y refresh_token
      access_token: token,
      refresh_token: refreshToken,
      expires_in: accessTokenExpiresIn,
      // Mantener nombres originales para compatibilidad con otros clientes
      token: token,
      refreshToken: refreshToken,
      user: userData,
    };
  }

  /**
   * Login de usuario
   */
  static async login(email: string, password: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token: string;
    refreshToken: string;
    user: Partial<IUser>;
  }> {
    const user = await User.findOne({ email: email.toLowerCase(), active: true });

    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // Actualizar último acceso
    user.lastAccess = new Date();
    await user.save();

    // Generar tokens
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Validar que los tokens se generaron correctamente
    if (!token || !refreshToken || typeof token !== 'string' || typeof refreshToken !== 'string') {
      throw new AppError('Error al generar tokens de autenticación', 500);
    }

    // Guardar refresh token en Redis
    const expiresInSeconds = getExpirationInSeconds(config.jwtRefreshExpires);
    await saveRefreshToken(user._id.toString(), refreshToken, expiresInSeconds);

    // Obtener datos del usuario sin passwordHash
    const userData = user.toJSON();

    // Calcular expires_in en segundos para el access token
    const accessTokenExpiresIn = getExpirationInSeconds(config.jwtAccessExpires);

    return {
      // Compatibilidad con Flutter: usar access_token y refresh_token
      access_token: token,
      refresh_token: refreshToken,
      expires_in: accessTokenExpiresIn,
      // Mantener nombres originales para compatibilidad con otros clientes
      token: token,
      refreshToken: refreshToken,
      user: userData,
    };
  }

  /**
   * Refrescar token de acceso
   */
  static async refreshToken(refreshToken: string): Promise<{
    token: string;
    refreshToken: string;
  }> {
    try {
      const decoded = verifyRefreshToken(refreshToken);

      // Verificar que el refresh token existe en Redis
      const exists = await this.checkRefreshToken(decoded.userId, refreshToken);

      if (!exists) {
        throw new AppError('Refresh token inválido o revocado', 401);
      }

      // Obtener usuario
      const user = await User.findById(decoded.userId);

      if (!user || !user.active) {
        throw new AppError('Usuario no encontrado o inactivo', 401);
      }

      // Revocar el refresh token anterior
      await revokeRefreshToken(decoded.userId, refreshToken);

      // Generar nuevos tokens
      const payload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      const newToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      // Guardar nuevo refresh token en Redis
      const expiresInSeconds = getExpirationInSeconds(config.jwtRefreshExpires);
      await saveRefreshToken(user._id.toString(), newRefreshToken, expiresInSeconds);

      return {
        token: newToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Error al refrescar el token', 401);
    }
  }

  /**
   * Logout (revocar refresh token)
   */
  static async logout(userId: string, refreshToken: string): Promise<void> {
    await revokeRefreshToken(userId, refreshToken);
  }

  /**
   * Verificar si un refresh token existe en Redis
   */
  static async checkRefreshToken(userId: string, token: string): Promise<boolean> {
    const { getRefreshToken } = await import('../utils/redis');
    return await getRefreshToken(userId, token);
  }

  /**
   * Generar token de recuperación de contraseña
   */
  static async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Por seguridad, no revelar si el usuario existe o no
      return;
    }

    // Generar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token en Redis
    const { getRedisClient } = await import('../utils/redis');
    const client = getRedisClient();
    await client.setex(
      `reset:${user._id.toString()}:${resetToken}`,
      3600,
      resetTokenExpiry.toISOString()
    );

    // Enviar email (simulado en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Reset password token for ${email}: ${resetToken}`);
    } else {
      await this.sendResetPasswordEmail(user.email, resetToken);
    }
  }

  /**
   * Resetear contraseña usando token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    // Buscar token en Redis usando scanStream (más eficiente que keys)
    const { getRedisClient } = await import('../utils/redis');
    const client = getRedisClient();
    const pattern = `reset:*:${token}`;
    const keys: string[] = [];
    
    // Escanear Redis usando scanStream para mejor rendimiento
    const stream = client.scanStream({
      match: pattern,
      count: 100,
    });
    
    stream.on('data', (resultKeys: string[]) => {
      keys.push(...resultKeys);
    });
    
    await new Promise<void>((resolve) => {
      stream.on('end', () => {
        resolve();
      });
    });

    if (keys.length === 0) {
      throw new AppError('Token de recuperación inválido o expirado', 400);
    }

    const key = keys[0];
    const userId = key.split(':')[1];

    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Hashear nueva contraseña
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    user.passwordHash = passwordHash;
    await user.save();

    // Eliminar token de Redis
    await client.del(key);

    // Revocar todos los tokens del usuario
    await revokeAllUserTokens(userId);
  }

  /**
   * Enviar email de recuperación de contraseña (simulado en dev)
   */
  private static async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

      await transporter.sendMail({
        from: config.smtp.user,
        to: email,
        subject: 'Recuperación de contraseña - Sistema de Préstamos UAA',
        html: `
          <h2>Recuperación de contraseña</h2>
          <p>Has solicitado recuperar tu contraseña. Haz clic en el siguiente enlace:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>Este enlace expira en 1 hora.</p>
          <p>Si no solicitaste este cambio, ignora este email.</p>
        `,
      });
    } catch (error) {
      console.error('Error enviando email de recuperación:', error);
      // No lanzar error para no revelar si el email existe
    }
  }
}

