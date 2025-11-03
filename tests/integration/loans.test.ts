import request from 'supertest';
import { createApp } from '../../src/app';
import { connectMongoDB, disconnectMongoDB } from '../../src/database/mongodb';
import { User, Equipment, Loan } from '../../src/models';
import bcrypt from 'bcrypt';

describe('POST /api/loans/reserve', () => {
  let app: any;
  let studentToken: string;
  let adminToken: string;
  let equipmentId: string;
  let studentId: string;

  beforeAll(async () => {
    await connectMongoDB();
    app = createApp();

    // Crear usuario estudiante
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const student = await User.create({
      email: 'student@test.com',
      passwordHash,
      firstName: 'Student',
      lastName: 'Test',
      role: 'estudiante',
      active: true,
    });
    studentId = student._id.toString();

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

    // Crear equipo
    const equipment = await Equipment.create({
      code: 'TEST001',
      name: 'Test Equipment',
      description: 'Test',
      category: 'Test',
      status: 'disponible',
      location: 'Lab A',
    });
    equipmentId = equipment._id.toString();

    // Obtener tokens
    const studentLogin = await request(app).post('/api/auth/login').send({
      email: 'student@test.com',
      password: 'Password123!',
    });
    studentToken = studentLogin.body.data.token;

    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'Admin123!',
    });
    adminToken = adminLogin.body.data.token;
  });

  afterAll(async () => {
    await disconnectMongoDB();
  });

  beforeEach(async () => {
    await Loan.deleteMany({});
  });

  it('debe crear reserva exitosamente como estudiante', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2); // 2 días (dentro del límite de 3)

    const response = await request(app)
      .post('/api/loans/reserve')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        equipmentId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('status', 'reservado');
  });

  it('debe rechazar reserva de estudiante mayor a 3 días', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 4); // 4 días (excede límite de 3)

    const response = await request(app)
      .post('/api/loans/reserve')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        equipmentId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('debe rechazar reserva sin autenticación', async () => {
    const response = await request(app).post('/api/loans/reserve').send({
      equipmentId,
      startDate: '2025-11-04',
      endDate: '2025-11-06',
    });

    expect(response.status).toBe(401);
  });
});

