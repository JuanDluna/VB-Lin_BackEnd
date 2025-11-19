import dotenv from 'dotenv';
import { Loan, Equipment } from '../src/models';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongodb';

dotenv.config();

const clearLoans = async (): Promise<void> => {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await connectMongoDB();

    // Contar préstamos antes de eliminar
    const countBefore = await Loan.countDocuments({});
    console.log(`\n📊 Préstamos/reservaciones encontrados: ${countBefore}`);

    if (countBefore === 0) {
      console.log('✅ No hay préstamos para eliminar');
      await disconnectMongoDB();
      return;
    }

    // Eliminar todos los préstamos
    const result = await Loan.deleteMany({});
    console.log(`\n🗑️  Eliminados ${result.deletedCount} préstamos/reservaciones`);

    // Actualizar estado de todos los equipos a 'disponible'
    const equipmentResult = await Equipment.updateMany(
      { status: { $in: ['prestado'] } },
      { $set: { status: 'disponible' } }
    );
    console.log(`\n🔧 Actualizados ${equipmentResult.modifiedCount} equipos a estado 'disponible'`);

    console.log('\n✅ Limpieza completada exitosamente\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await disconnectMongoDB();
  }
};

clearLoans();

