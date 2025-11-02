/**
 * Configuración global para tests
 */
import { disconnectMongoDB } from '../src/database/mongodb';
import { disconnectRedis } from '../src/database/redis';

/**
 * Limpieza después de todos los tests
 */
afterAll(async () => {
  await disconnectMongoDB();
  await disconnectRedis();
  // Dar tiempo para cerrar conexiones
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

/**
 * Limpiar entre tests
 */
afterEach(async () => {
  // Aquí se pueden limpiar colecciones si es necesario
});

