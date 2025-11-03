"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../src/app");
const mongodb_1 = require("../../src/database/mongodb");
const models_1 = require("../../src/models");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("../../src/utils/jwt");
describe('Flujo completo: login -> reserve -> GET /api/loans/:id', () => {
    let app;
    let userToken;
    let userId;
    let equipmentId;
    beforeAll(async () => {
        await (0, mongodb_1.connectMongoDB)();
        app = (0, app_1.createApp)();
    });
    afterAll(async () => {
        await (0, mongodb_1.disconnectMongoDB)();
    });
    beforeEach(async () => {
        await models_1.User.deleteMany({});
        await models_1.Equipment.deleteMany({});
        await models_1.Loan.deleteMany({});
        // Crear usuario
        const passwordHash = await bcrypt_1.default.hash('Password123!', 10);
        const user = await models_1.User.create({
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
        userToken = (0, jwt_1.generateAccessToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });
        // Crear equipo
        const equipment = await models_1.Equipment.create({
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
        const loginResponse = await (0, supertest_1.default)(app).post('/api/auth/login').send({
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
        const reserveResponse = await (0, supertest_1.default)(app)
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
        const getLoanResponse = await (0, supertest_1.default)(app)
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
        const response = await (0, supertest_1.default)(app).post('/api/loans/reserve').send({
            equipmentId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });
});
//# sourceMappingURL=loan-flow.test.js.map