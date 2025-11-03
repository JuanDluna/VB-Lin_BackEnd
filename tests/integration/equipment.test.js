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
describe('GET /api/equipment', () => {
    let app;
    let token;
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
        // Crear usuario y token
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
        token = (0, jwt_1.generateAccessToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });
        // Crear equipos de prueba
        await models_1.Equipment.create([
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
        const response = await (0, supertest_1.default)(app).get('/api/equipment?page=1&limit=2');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.pagination).toHaveProperty('page', 1);
        expect(response.body.pagination).toHaveProperty('limit', 2);
        expect(response.body.pagination).toHaveProperty('total', 3);
        expect(response.body.pagination).toHaveProperty('totalPages', 2);
    });
    it('debe filtrar equipos por categoría', async () => {
        const response = await (0, supertest_1.default)(app).get('/api/equipment?category=Categoría A');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        response.body.data.forEach((eq) => {
            expect(eq.category).toBe('Categoría A');
        });
    });
    it('debe filtrar equipos por estado', async () => {
        const response = await (0, supertest_1.default)(app).get('/api/equipment?status=disponible');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        response.body.data.forEach((eq) => {
            expect(eq.status).toBe('disponible');
        });
    });
    it('debe buscar equipos por nombre (query)', async () => {
        const response = await (0, supertest_1.default)(app).get('/api/equipment?q=Equipo 1');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].name).toContain('Equipo 1');
    });
});
//# sourceMappingURL=equipment.test.js.map