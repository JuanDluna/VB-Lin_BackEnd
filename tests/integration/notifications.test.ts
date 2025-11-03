import request from 'supertest';
import { createApp } from '../../src/app';
import { connectMongoDB, disconnectMongoDB } from '../../src/database/mongodb';
import { User, FCMToken, Notification } from '../../src/models';
import bcrypt from 'bcrypt';

describe('POST /api/notifications/register', () => {
  let app: any;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    await connectMongoDB();
    app = createApp();

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      email: 'test@test.com',
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      role: 'estudiante',
      active: true,
    });
    userId = user._id.toString();

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'test@test.com',
      password: 'Password123!',
    });
    userToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await disconnectMongoDB();
  });

  beforeEach(async () => {
    await FCMToken.deleteMany({});
    await Notification.deleteMany({});
  });

  it('debe registrar token FCM exitosamente', async () => {
    const response = await request(app)
      .post('/api/notifications/register')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        fcmToken: 'test_fcm_token_12345',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('registrado');

    // Verificar que se guardó en BD
    const token = await FCMToken.findOne({ userId, token: 'test_fcm_token_12345' });
    expect(token).toBeTruthy();
  });

  it('debe rechazar registro sin token FCM', async () => {
    const response = await request(app)
      .post('/api/notifications/register')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('debe rechazar registro sin autenticación', async () => {
    const response = await request(app).post('/api/notifications/register').send({
      fcmToken: 'test_token',
    });

    expect(response.status).toBe(401);
  });
});

describe('GET /api/notifications', () => {
  let app: any;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    await connectMongoDB();
    app = createApp();

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      email: 'notif@test.com',
      passwordHash,
      firstName: 'Notif',
      lastName: 'User',
      role: 'estudiante',
      active: true,
    });
    userId = user._id.toString();

    // Crear notificaciones de prueba
    await Notification.create([
      {
        userId,
        type: 'reserva',
        message: 'Notification 1',
        read: false,
        sentAt: new Date(),
      },
      {
        userId,
        type: 'recordatorio',
        message: 'Notification 2',
        read: true,
        sentAt: new Date(),
      },
    ]);

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'notif@test.com',
      password: 'Password123!',
    });
    userToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await disconnectMongoDB();
  });

  it('debe obtener lista de notificaciones', async () => {
    const response = await request(app)
      .get('/api/notifications?page=1&limit=10')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.pagination).toHaveProperty('total', 2);
  });

  it('debe paginar notificaciones correctamente', async () => {
    const response = await request(app)
      .get('/api/notifications?page=1&limit=1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toHaveProperty('limit', 1);
  });
});

