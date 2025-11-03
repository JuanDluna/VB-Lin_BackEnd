import request from 'supertest';
import { createApp } from '../../src/app';
import { connectMongoDB, disconnectMongoDB } from '../../src/database/mongodb';
import { User } from '../../src/models';
import bcrypt from 'bcrypt';

describe('GET /api/users', () => {
  let app: any;
  let adminToken: string;
  let studentToken: string;

  beforeAll(async () => {
    await connectMongoDB();
    app = createApp();

    // Crear admin
    const adminHash = await bcrypt.hash('Admin123!', 10);
    await User.create({
      email: 'admin@test.com',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Test',
      role: 'admin',
      active: true,
    });

    // Crear estudiante
    const studentHash = await bcrypt.hash('Student123!', 10);
    await User.create({
      email: 'student@test.com',
      passwordHash: studentHash,
      firstName: 'Student',
      lastName: 'Test',
      role: 'estudiante',
      active: true,
    });

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'Admin123!',
    });
    adminToken = adminLogin.body.data.token;

    const studentLogin = await request(app).post('/api/auth/login').send({
      email: 'student@test.com',
      password: 'Student123!',
    });
    studentToken = studentLogin.body.data.token;
  });

  afterAll(async () => {
    await disconnectMongoDB();
  });

  beforeEach(async () => {
    // Mantener usuarios base, solo limpiar extras
  });

  it('debe permitir a admin obtener lista de usuarios', async () => {
    const response = await request(app)
      .get('/api/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.pagination).toHaveProperty('total');
  });

  it('debe rechazar acceso a estudiantes para listar usuarios', async () => {
    const response = await request(app)
      .get('/api/users?page=1&limit=10')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('debe rechazar acceso sin autenticación', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(401);
  });
});

