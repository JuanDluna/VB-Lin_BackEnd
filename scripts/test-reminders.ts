import dotenv from 'dotenv';
import { LoanService } from '../src/services/LoanService';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongodb';

dotenv.config();

const testReminders = async (): Promise<void> => {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await connectMongoDB();

    console.log('\n📋 Ejecutando verificación de recordatorios...\n');
    
    // Ejecutar el método de recordatorios
    await LoanService.checkAndSendLoanReminders();
    
    console.log('\n✅ Verificación completada\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await disconnectMongoDB();
  }
};

testReminders();

