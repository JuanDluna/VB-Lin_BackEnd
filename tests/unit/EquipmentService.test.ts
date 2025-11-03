import { EquipmentService } from '../../src/services/EquipmentService';
import { Equipment } from '../../src/models';
import mongoose from 'mongoose';

describe('EquipmentService', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/VB-Lin_BackEnd_test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Equipment.deleteMany({});
  });

  describe('getAllEquipment', () => {
    it('debe obtener lista de equipos con paginación', async () => {
      // Crear equipos de prueba
      await Equipment.create([
        {
          code: 'TEST001',
          name: 'Test Equipment 1',
          description: 'Test',
          category: 'Test',
          status: 'disponible',
          location: 'Lab A',
        },
        {
          code: 'TEST002',
          name: 'Test Equipment 2',
          description: 'Test',
          category: 'Test',
          status: 'disponible',
          location: 'Lab B',
        },
      ]);

      const result = await EquipmentService.getAllEquipment({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toHaveProperty('total', 2);
      expect(result.pagination).toHaveProperty('page', 1);
    });

    it('debe paginar correctamente', async () => {
      // Crear más equipos
      const equipments = Array.from({ length: 15 }, (_, i) => ({
        code: `TEST${String(i + 1).padStart(3, '0')}`,
        name: `Test Equipment ${i + 1}`,
        description: 'Test',
        category: 'Test',
        status: 'disponible',
        location: 'Lab A',
      }));

      await Equipment.create(equipments);

      const result = await EquipmentService.getAllEquipment({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(10);
      expect(result.pagination).toHaveProperty('total', 15);
      expect(result.pagination).toHaveProperty('totalPages', 2);
    });
  });
});

