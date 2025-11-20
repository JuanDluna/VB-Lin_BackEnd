import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { FCMToken, User } from '../src/models';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongodb';

dotenv.config();

const checkFCMTokens = async (): Promise<void> => {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await connectMongoDB();

    console.log('\n📱 TOKENS FCM REGISTRADOS:');
    console.log('='.repeat(50));
    const tokens = await FCMToken.find({})
      .populate('userId', 'firstName lastName email')
      .lean();

    console.log(`Total de tokens FCM: ${tokens.length}`);

    if (tokens.length === 0) {
      console.log('\n⚠️  No hay tokens FCM registrados.');
      console.log('   Los usuarios necesitan registrarse usando POST /api/notifications/register');
    } else {
      tokens.forEach((token, index) => {
        const user = token.userId as any;
        console.log(`\n${index + 1}. Token FCM`);
        console.log(`   Usuario: ${user?.firstName || 'N/A'} ${user?.lastName || 'N/A'} (${user?.email || 'N/A'})`);
        console.log(`   Plataforma: ${token.platform || 'web'}`);
        console.log(`   Token: ${token.token.substring(0, 50)}...`);
        console.log(`   Creado: ${token.createdAt}`);
        console.log(`   ID: ${token._id}`);
      });
    }

    console.log('\n✅ Consulta completada\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await disconnectMongoDB();
  }
};

checkFCMTokens();

