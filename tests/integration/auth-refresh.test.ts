import request from 'supertest';
import { createApp } from '../../src/app';
import { connectMongoDB, disconnectMongoDB } from '../../src/database/mongodb';
import { User } from '../../src/models';
import bcrypt from 'bcrypt';

describe('POST /api/auth/refresh', () => {
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

  it('debe refrescar token exitosamente con refresh token válido', async () => {
    // Crear usuario y obtener tokens
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await User.create({
      email: 'test@test.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: 'estudiante',
      active: true,
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'test@test.com',
      password: 'Password123!',
    });

    expect(loginResponse.status).toBe(200);
    const { refreshToken } = loginResponse.body.data;

    // Refrescar token
    const refreshResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken,
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data).toHaveProperty('token');
    expect(refreshResponse.body.data).toHaveProperty('refreshToken');
    expect(refreshResponse.body.data.token).not.toBe(loginResponse.body.data.token);
  });

  it('debe rechazar refresh token inválido', async () => {
    const response = await request(app).post('/api/auth/refresh').send({
      refreshToken: 'invalid_token',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('debe rechazar refresh token faltante', async () => {
    const response = await request(app).post('/api/auth/refresh').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

