import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User, Loan, Equipment } from '../src/models';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongodb';

dotenv.config();

const checkData = async (): Promise<void> => {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await connectMongoDB();

    console.log('\n📊 USUARIOS:');
    console.log('='.repeat(50));
    const users = await User.find({}).select('-passwordHash').lean();
    console.log(`Total de usuarios: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   Activo: ${user.active}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Creado: ${user.createdAt}`);
    });

    console.log('\n\n📦 PRÉSTAMOS/RESERVACIONES:');
    console.log('='.repeat(50));
    const loans = await Loan.find({})
      .populate('userId', 'firstName lastName email')
      .populate('equipmentId', 'code name')
      .lean();
    console.log(`Total de préstamos/reservaciones: ${loans.length}`);
    loans.forEach((loan, index) => {
      const user = loan.userId as any;
      const equipment = loan.equipmentId as any;
      console.log(`\n${index + 1}. Reservación/Préstamo`);
      console.log(`   Usuario: ${user?.firstName || 'N/A'} ${user?.lastName || 'N/A'} (${user?.email || 'N/A'})`);
      console.log(`   Equipo: ${equipment?.code || 'N/A'} - ${equipment?.name || 'N/A'}`);
      console.log(`   Estado: ${loan.status}`);
      console.log(`   Fecha inicio: ${loan.startDate}`);
      console.log(`   Fecha fin: ${loan.endDate}`);
      console.log(`   Reservado en: ${loan.reservedAt}`);
      if (loan.checkoutAt) {
        console.log(`   Checkout: ${loan.checkoutAt}`);
      }
      if (loan.returnedAt) {
        console.log(`   Devolución: ${loan.returnedAt}`);
      }
      console.log(`   ID: ${loan._id}`);
    });

    console.log('\n\n🔧 EQUIPOS:');
    console.log('='.repeat(50));
    const equipment = await Equipment.find({}).lean();
    console.log(`Total de equipos: ${equipment.length}`);
    equipment.forEach((eq, index) => {
      console.log(`\n${index + 1}. ${eq.code} - ${eq.name}`);
      console.log(`   Categoría: ${eq.category}`);
      console.log(`   Estado: ${eq.status}`);
      console.log(`   Ubicación: ${eq.location}`);
      console.log(`   ID: ${eq._id}`);
    });

    console.log('\n✅ Consulta completada\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await disconnectMongoDB();
  }
};

checkData();

