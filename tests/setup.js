"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Configuración global para tests
 */
const mongodb_1 = require("../src/database/mongodb");
const redis_1 = require("../src/database/redis");
/**
 * Limpieza después de todos los tests
 */
afterAll(async () => {
    await (0, mongodb_1.disconnectMongoDB)();
    await (0, redis_1.disconnectRedis)();
    // Dar tiempo para cerrar conexiones
    await new Promise((resolve) => setTimeout(resolve, 1000));
});
/**
 * Limpiar entre tests
 */
afterEach(async () => {
    // Aquí se pueden limpiar colecciones si es necesario
});
//# sourceMappingURL=setup.js.map