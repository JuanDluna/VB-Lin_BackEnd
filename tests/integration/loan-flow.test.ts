import request from 'supertest';
import { createApp } from '../../src/app';
import { connectMongoDB, disconnectMongoDB } from '../../src/database/mongodb';
import { User, Equipment, Loan } from '../../src/models';
import bcrypt from 'bcrypt';
import { generateAccessToken } from '../../src/utils/jwt';

describe('Flujo completo: login -> reserve -> GET /api/loans/:id', () => {
  let app: any;
  let userToken: string;
  let userId: string;
  let equipmentId: string;

  beforeAll(async () => {
    await connectMongoDB();
    app = createApp();
  });

  afterAll(async () => {
    await disconnectMongoDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Equipment.deleteMany({});
    await Loan.deleteMany({});

    // Crear usuario
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      email: 'test@test.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: 'estudiante',
      active: true,
      createdAt: new Date(),
      lastAccess: new Date(),
    });

    userId = user._id.toString();

    // Crear token
    userToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Crear equipo
    const equipment = await Equipment.create({
      code: 'TEST001',
      name: 'Equipo de Prueba',
      description: 'Equipo para tests',
      category: 'Test',
      status: 'disponible',
      location: 'Lab Test',
      acquisitionDate: new Date(),
      estimatedValue: 1000,
    });

    equipmentId = equipment._id.toString();
  });

  it('debe completar el flujo completo: login -> reserve -> get loan', async () => {
    // Paso 1: Login
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'test@test.com',
      password: 'Password123!',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    const { token, refreshToken } = loginResponse.body.data;

    // Paso 2: Crear reserva
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);

    const reserveResponse = await request(app)
      .post('/api/loans/reserve')
      .set('Authorization', `Bearer ${token}`)
      .send({
        equipmentId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reservationRemarks: 'Préstamo de prueba',
      });

    expect(reserveResponse.status).toBe(201);
    expect(reserveResponse.body.success).toBe(true);
    expect(reserveResponse.body.data.status).toBe('reservado');
    const loanId = reserveResponse.body.data.id || reserveResponse.body.data._id;

    // Paso 3: Obtener préstamo por ID
    const getLoanResponse = await request(app)
      .get(`/api/loans/${loanId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getLoanResponse.status).toBe(200);
    expect(getLoanResponse.body.success).toBe(true);
    expect(getLoanResponse.body.data).toHaveProperty('userId');
    expect(getLoanResponse.body.data).toHaveProperty('equipmentId');
    expect(getLoanResponse.body.data.status).toBe('reservado');
    expect(getLoanResponse.body.data.reservationRemarks).toBe('Préstamo de prueba');
  });

  it('debe rechazar reserva sin autenticación', async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);

    const response = await request(app).post('/api/loans/reserve').send({
      equipmentId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

