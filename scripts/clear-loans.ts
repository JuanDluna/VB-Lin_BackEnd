import dotenv from 'dotenv';
import { Loan, Equipment } from '../src/models';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongodb';

dotenv.config();

/**
 * Script para liberar reservaciones de MongoDB
 * Opciones:
 * - 'free': Marca todas las reservaciones activas como devueltas (libera equipos)
 * - 'delete': Elimina todas las reservaciones completamente
 */
const clearLoans = async (): Promise<void> => {
  const mode = process.argv[2] || 'free'; // 'free' o 'delete'

  try {
    console.log('🔍 Conectando a MongoDB...');
    await connectMongoDB();

    // Contar préstamos antes de procesar
    const countBefore = await Loan.countDocuments({});
    const activeCount = await Loan.countDocuments({
      status: { $in: ['reservado', 'activo', 'vencido'] },
    });
    console.log(`\n📊 Total de préstamos/reservaciones: ${countBefore}`);
    console.log(`📊 Reservaciones activas (reservado/activo/vencido): ${activeCount}`);

    if (countBefore === 0) {
      console.log('✅ No hay préstamos para procesar');
      await disconnectMongoDB();
      return;
    }

    if (mode === 'free') {
      // Modo: Liberar (marcar como devueltas)
      console.log('\n🔄 Liberando reservaciones (marcando como devueltas)...');
      
      const now = new Date();
      const result = await Loan.updateMany(
        { status: { $in: ['reservado', 'activo', 'vencido'] } },
        {
          $set: {
            status: 'devuelto',
            returnedAt: now,
            returnRemarks: 'Liberado automáticamente por script',
          },
        }
      );
      console.log(`\n✅ Liberadas ${result.modifiedCount} reservaciones (marcadas como devueltas)`);

      // Actualizar estado de todos los equipos a 'disponible'
      const equipmentResult = await Equipment.updateMany(
        { status: { $in: ['prestado'] } },
        { $set: { status: 'disponible' } }
      );
      console.log(`🔧 Actualizados ${equipmentResult.modifiedCount} equipos a estado 'disponible'`);
    } else if (mode === 'delete') {
      // Modo: Eliminar completamente
      console.log('\n🗑️  Eliminando todas las reservaciones...');
      
      const result = await Loan.deleteMany({});
      console.log(`\n🗑️  Eliminados ${result.deletedCount} préstamos/reservaciones`);

      // Actualizar estado de todos los equipos a 'disponible'
      const equipmentResult = await Equipment.updateMany(
        { status: { $in: ['prestado'] } },
        { $set: { status: 'disponible' } }
      );
      console.log(`🔧 Actualizados ${equipmentResult.modifiedCount} equipos a estado 'disponible'`);
    } else {
      console.error(`❌ Modo inválido: ${mode}. Usa 'free' o 'delete'`);
      process.exit(1);
    }

    console.log('\n✅ Proceso completado exitosamente\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await disconnectMongoDB();
  }
};

clearLoans();

