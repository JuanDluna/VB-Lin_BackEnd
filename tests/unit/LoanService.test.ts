import { LoanService } from '../../src/services/LoanService';
import { User, Equipment, Loan } from '../../src/models';
import { connectMongoDB, disconnectMongoDB } from '../../src/database/mongodb';
import bcrypt from 'bcrypt';

describe('LoanService', () => {
  beforeAll(async () => {
    await connectMongoDB();
  });

  afterAll(async () => {
    await disconnectMongoDB();
  });

  beforeEach(async () => {
    // Limpiar colecciones antes de cada test
    await User.deleteMany({});
    await Equipment.deleteMany({});
    await Loan.deleteMany({});
  });

  describe('createReservation', () => {
    let estudiante: any;
    let profesor: any;
    let equipo: any;

    beforeEach(async () => {
      // Crear usuarios de prueba
      const estudiantePasswordHash = await bcrypt.hash('password123', 10);
      const profesorPasswordHash = await bcrypt.hash('password123', 10);

      estudiante = await User.create({
        email: 'estudiante@test.com',
        passwordHash: estudiantePasswordHash,
        firstName: 'Estudiante',
        lastName: 'Test',
        role: 'estudiante',
        active: true,
        createdAt: new Date(),
        lastAccess: new Date(),
      });

      profesor = await User.create({
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
      equipo = await Equipment.create({
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

      const loan = await LoanService.createReservation(
        estudiante._id.toString(),
        equipo._id.toString(),
        startDate,
        endDate
      );

      expect(loan).toBeDefined();
      expect(loan.status).toBe('reservado');
      expect(loan.userId.toString()).toBe(estudiante._id.toString());
      expect(loan.equipmentId.toString()).toBe(equipo._id.toString());

      // Verificar que el equipo se marcó como prestado
      const updatedEquipment = await Equipment.findById(equipo._id);
      expect(updatedEquipment?.status).toBe('prestado');
    });

    it('debe crear una reserva exitosamente para un profesor (máximo 7 días)', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const loan = await LoanService.createReservation(
        profesor._id.toString(),
        equipo._id.toString(),
        startDate,
        endDate
      );

      expect(loan).toBeDefined();
      expect(loan.status).toBe('reservado');
    });

    it('debe rechazar reserva de estudiante que excede 3 días', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 4); // 4 días > 3

      await expect(
        LoanService.createReservation(
          estudiante._id.toString(),
          equipo._id.toString(),
          startDate,
          endDate
        )
      ).rejects.toThrow('El límite de reserva para estudiantes es de 3 días');
    });

    it('debe rechazar reserva de profesor que excede 7 días', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 8); // 8 días > 7

      await expect(
        LoanService.createReservation(
          profesor._id.toString(),
          equipo._id.toString(),
          startDate,
          endDate
        )
      ).rejects.toThrow('El límite de reserva para profesores es de 7 días');
    });

    it('debe rechazar reserva con solapamiento de fechas', async () => {
      const startDate1 = new Date();
      startDate1.setDate(startDate1.getDate() + 1);
      const endDate1 = new Date(startDate1);
      endDate1.setDate(endDate1.getDate() + 3);

      // Crear primera reserva
      await LoanService.createReservation(
        estudiante._id.toString(),
        equipo._id.toString(),
        startDate1,
        endDate1
      );

      // Intentar crear segunda reserva con solapamiento
      const startDate2 = new Date(startDate1);
      startDate2.setDate(startDate2.getDate() + 1); // Solapa
      const endDate2 = new Date(startDate2);
      endDate2.setDate(endDate2.getDate() + 2);

      await expect(
        LoanService.createReservation(
          profesor._id.toString(),
          equipo._id.toString(),
          startDate2,
          endDate2
        )
      ).rejects.toThrow(
        'El equipo ya está reservado o en préstamo en el rango de fechas solicitado'
      );
    });

    it('debe rechazar reserva para equipo en mantenimiento', async () => {
      equipo.status = 'mantenimiento';
      await equipo.save();

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 3);

      await expect(
        LoanService.createReservation(
          estudiante._id.toString(),
          equipo._id.toString(),
          startDate,
          endDate
        )
      ).rejects.toThrow('El equipo está en mantenimiento y no puede ser prestado');
    });
  });
});

