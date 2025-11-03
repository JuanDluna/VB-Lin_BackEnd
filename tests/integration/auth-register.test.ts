import request from 'supertest';
import { createApp } from '../../src/app';
import { connectMongoDB, disconnectMongoDB } from '../../src/database/mongodb';
import { User } from '../../src/models';

describe('POST /api/auth/register', () => {
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

  it('debe registrar nuevo usuario exitosamente', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'newuser@test.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('token');
    expect(response.body.data).toHaveProperty('refreshToken');
    expect(response.body.data.user).toHaveProperty('email', 'newuser@test.com');
    expect(response.body.data.user).toHaveProperty('role', 'estudiante');
  });

  it('debe rechazar registro con email duplicado', async () => {
    // Crear usuario primero
    await User.create({
      email: 'duplicate@test.com',
      passwordHash: 'hash',
      firstName: 'Test',
      lastName: 'User',
      role: 'estudiante',
    });

    const response = await request(app).post('/api/auth/register').send({
      email: 'duplicate@test.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
    });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it('debe validar campos requeridos', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'test@test.com',
      // Falta password
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('debe validar formato de email', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'invalid-email',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

