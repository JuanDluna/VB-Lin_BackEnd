import request from 'supertest';
import { createApp } from '../../src/app';
import { connectMongoDB, disconnectMongoDB } from '../../src/database/mongodb';
import { User } from '../../src/models';
import bcrypt from 'bcrypt';

describe('POST /api/auth/login', () => {
  let app: any;

  beforeAll(async () => {
    await connectMongoDB();
    app = createApp();
  });

  afterAll(async () => {
    await disconnectMongoDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('debe hacer login exitosamente con credenciales válidas', async () => {
    // Crear usuario de prueba
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await User.create({
      email: 'test@test.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: 'estudiante',
      active: true,
      createdAt: new Date(),
      lastAccess: new Date(),
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'test@test.com',
      password: 'Password123!',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data).toHaveProperty('refreshToken');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data.user).toHaveProperty('email', 'test@test.com');
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('debe rechazar login con credenciales inválidas', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'test@test.com',
      password: 'WrongPassword',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('error');
  });

  it('debe rechazar login con email inexistente', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@test.com',
      password: 'Password123!',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('debe validar email y password requeridos', async () => {
    const response = await request(app).post('/api/auth/login').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('error');
  });
});

