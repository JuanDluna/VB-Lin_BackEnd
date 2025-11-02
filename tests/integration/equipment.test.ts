import request from 'supertest';
import { createApp } from '../../src/app';
import { connectMongoDB, disconnectMongoDB } from '../../src/database/mongodb';
import { User, Equipment } from '../../src/models';
import bcrypt from 'bcrypt';
import { generateAccessToken } from '../../src/utils/jwt';

describe('GET /api/equipment', () => {
  let app: any;
  let token: string;

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

    // Crear usuario y token
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

    token = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Crear equipos de prueba
    await Equipment.create([
      {
        code: 'EQ001',
        name: 'Equipo 1',
        description: 'Descripción 1',
        category: 'Categoría A',
        status: 'disponible',
        location: 'Lab A',
        acquisitionDate: new Date(),
        estimatedValue: 1000,
      },
      {
        code: 'EQ002',
        name: 'Equipo 2',
        description: 'Descripción 2',
        category: 'Categoría B',
        status: 'disponible',
        location: 'Lab B',
        acquisitionDate: new Date(),
        estimatedValue: 2000,
      },
      {
        code: 'EQ003',
        name: 'Equipo 3',
        description: 'Descripción 3',
        category: 'Categoría A',
        status: 'prestado',
        location: 'Lab A',
        acquisitionDate: new Date(),
        estimatedValue: 1500,
      },
    ]);
  });

  it('debe obtener lista de equipos paginada sin autenticación', async () => {
    const response = await request(app).get('/api/equipment?page=1&limit=2');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination).toHaveProperty('page', 1);
    expect(response.body.pagination).toHaveProperty('limit', 2);
    expect(response.body.pagination).toHaveProperty('total', 3);
    expect(response.body.pagination).toHaveProperty('totalPages', 2);
  });

  it('debe filtrar equipos por categoría', async () => {
    const response = await request(app).get('/api/equipment?category=Categoría A');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    response.body.data.forEach((eq: any) => {
      expect(eq.category).toBe('Categoría A');
    });
  });

  it('debe filtrar equipos por estado', async () => {
    const response = await request(app).get('/api/equipment?status=disponible');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    response.body.data.forEach((eq: any) => {
      expect(eq.status).toBe('disponible');
    });
  });

  it('debe buscar equipos por nombre (query)', async () => {
    const response = await request(app).get('/api/equipment?q=Equipo 1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0].name).toContain('Equipo 1');
  });
});

