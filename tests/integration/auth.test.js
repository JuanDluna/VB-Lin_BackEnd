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
describe('POST /api/auth/login', () => {
    let app;
    beforeAll(async () => {
        await (0, mongodb_1.connectMongoDB)();
        app = (0, app_1.createApp)();
    });
    afterAll(async () => {
        await (0, mongodb_1.disconnectMongoDB)();
    });
    beforeEach(async () => {
        await models_1.User.deleteMany({});
    });
    it('debe hacer login exitosamente con credenciales válidas', async () => {
        // Crear usuario de prueba
        const passwordHash = await bcrypt_1.default.hash('Password123!', 10);
        await models_1.User.create({
            email: 'test@test.com',
            passwordHash,
            firstName: 'Test',
            lastName: 'User',
            role: 'estudiante',
            active: true,
            createdAt: new Date(),
            lastAccess: new Date(),
        });
        const response = await (0, supertest_1.default)(app).post('/api/auth/login').send({
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
        const response = await (0, supertest_1.default)(app).post('/api/auth/login').send({
            email: 'test@test.com',
            password: 'WrongPassword',
        });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('error');
    });
    it('debe rechazar login con email inexistente', async () => {
        const response = await (0, supertest_1.default)(app).post('/api/auth/login').send({
            email: 'nonexistent@test.com',
            password: 'Password123!',
        });
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });
    it('debe validar email y password requeridos', async () => {
        const response = await (0, supertest_1.default)(app).post('/api/auth/login').send({});
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('error');
    });
});
//# sourceMappingURL=auth.test.js.map