"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const LoanService_1 = require("../../src/services/LoanService");
const models_1 = require("../../src/models");
const mongodb_1 = require("../../src/database/mongodb");
const bcrypt_1 = __importDefault(require("bcrypt"));
describe('LoanService', () => {
    beforeAll(async () => {
        await (0, mongodb_1.connectMongoDB)();
    });
    afterAll(async () => {
        await (0, mongodb_1.disconnectMongoDB)();
    });
    beforeEach(async () => {
        // Limpiar colecciones antes de cada test
        await models_1.User.deleteMany({});
        await models_1.Equipment.deleteMany({});
        await models_1.Loan.deleteMany({});
    });
    describe('createReservation', () => {
        let estudiante;
        let profesor;
        let equipo;
        beforeEach(async () => {
            // Crear usuarios de prueba
            const estudiantePasswordHash = await bcrypt_1.default.hash('password123', 10);
            const profesorPasswordHash = await bcrypt_1.default.hash('password123', 10);
            estudiante = await models_1.User.create({
                email: 'estudiante@test.com',
                passwordHash: estudiantePasswordHash,
                firstName: 'Estudiante',
                lastName: 'Test',
                role: 'estudiante',
                active: true,
                createdAt: new Date(),
                lastAccess: new Date(),
            });
            profesor = await models_1.User.create({
                email: 'profesor@test.com',
                passwordHash: profesorPasswordHash,
                firstName: 'Profesor',
                lastName: 'Test',
                role: 'profesor',
                active: true,
                createdAt: new Date(),
                lastAccess: new Date(),
            });
            // Crear equipo de prueba
            equipo = await models_1.Equipment.create({
                code: 'TEST001',
                name: 'Equipo de Prueba',
                description: 'Equipo para tests',
                category: 'Test',
                status: 'disponible',
                location: 'Lab Test',
                acquisitionDate: new Date(),
                estimatedValue: 1000,
            });
        });
        it('debe crear una reserva exitosamente para un estudiante (máximo 3 días)', async () => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 3);
            const loan = await LoanService_1.LoanService.createReservation(estudiante._id.toString(), equipo._id.toString(), startDate, endDate);
            expect(loan).toBeDefined();
            expect(loan.status).toBe('reservado');
            expect(loan.userId.toString()).toBe(estudiante._id.toString());
            expect(loan.equipmentId.toString()).toBe(equipo._id.toString());
            // Verificar que el equipo se marcó como prestado
            const updatedEquipment = await models_1.Equipment.findById(equipo._id);
            expect(updatedEquipment?.status).toBe('prestado');
        });
        it('debe crear una reserva exitosamente para un profesor (máximo 7 días)', async () => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 7);
            const loan = await LoanService_1.LoanService.createReservation(profesor._id.toString(), equipo._id.toString(), startDate, endDate);
            expect(loan).toBeDefined();
            expect(loan.status).toBe('reservado');
        });
        it('debe rechazar reserva de estudiante que excede 3 días', async () => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 4); // 4 días > 3
            await expect(LoanService_1.LoanService.createReservation(estudiante._id.toString(), equipo._id.toString(), startDate, endDate)).rejects.toThrow('El límite de reserva para estudiantes es de 3 días');
        });
        it('debe rechazar reserva de profesor que excede 7 días', async () => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 8); // 8 días > 7
            await expect(LoanService_1.LoanService.createReservation(profesor._id.toString(), equipo._id.toString(), startDate, endDate)).rejects.toThrow('El límite de reserva para profesores es de 7 días');
        });
        it('debe rechazar reserva con solapamiento de fechas', async () => {
            const startDate1 = new Date();
            startDate1.setDate(startDate1.getDate() + 1);
            const endDate1 = new Date(startDate1);
            endDate1.setDate(endDate1.getDate() + 3);
            // Crear primera reserva
            await LoanService_1.LoanService.createReservation(estudiante._id.toString(), equipo._id.toString(), startDate1, endDate1);
            // Intentar crear segunda reserva con solapamiento
            const startDate2 = new Date(startDate1);
            startDate2.setDate(startDate2.getDate() + 1); // Solapa
            const endDate2 = new Date(startDate2);
            endDate2.setDate(endDate2.getDate() + 2);
            await expect(LoanService_1.LoanService.createReservation(profesor._id.toString(), equipo._id.toString(), startDate2, endDate2)).rejects.toThrow('El equipo ya está reservado o en préstamo en el rango de fechas solicitado');
        });
        it('debe rechazar reserva para equipo en mantenimiento', async () => {
            equipo.status = 'mantenimiento';
            await equipo.save();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 3);
            await expect(LoanService_1.LoanService.createReservation(estudiante._id.toString(), equipo._id.toString(), startDate, endDate)).rejects.toThrow('El equipo está en mantenimiento y no puede ser prestado');
        });
    });
});
//# sourceMappingURL=LoanService.test.js.map