import { AuthService } from '../../src/services/AuthService';
import { User } from '../../src/models';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

describe('AuthService', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/VB-Lin_BackEnd_test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('register', () => {
    it('debe registrar nuevo usuario exitosamente', async () => {
      const result = await AuthService.register({
        email: 'newuser@test.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('newuser@test.com');
      expect(result.user.role).toBe('estudiante');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('debe rechazar email duplicado', async () => {
      await User.create({
        email: 'duplicate@test.com',
        passwordHash: await bcrypt.hash('Password123!', 10),
        firstName: 'Test',
        lastName: 'User',
        role: 'estudiante',
      });

      await expect(
        AuthService.register({
          email: 'duplicate@test.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
        })
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('debe hacer login exitosamente con credenciales válidas', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      await User.create({
        email: 'login@test.com',
        passwordHash,
        firstName: 'Login',
        lastName: 'User',
        role: 'estudiante',
        active: true,
      });

      const result = await AuthService.login('login@test.com', 'Password123!');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('login@test.com');
    });

    it('debe rechazar login con credenciales inválidas', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      await User.create({
        email: 'wrong@test.com',
        passwordHash,
        firstName: 'Wrong',
        lastName: 'User',
        role: 'estudiante',
        active: true,
      });

      await expect(AuthService.login('wrong@test.com', 'WrongPassword')).rejects.toThrow();
    });
  });
});

