// scripts/test-conn.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI || process.argv[2];
  if (!uri) {
    console.error('Falta MONGO_URI. Pasa la URI como variable o argumento.');
    process.exit(1);
  }

  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(uri, {
      // opciones opcionales
      serverSelectionTimeoutMS: 10000,
      // useNewUrlParser: true, useUnifiedTopology: true  <- con mongoose 7 no es necesario
    } as any);
    console.log('Conectado OK ✅');
    const admin = await mongoose.connection.db.admin().ping();
    console.log('Ping:', admin);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('Error conectando a MongoDB:', err.message || err);
    process.exit(2);
  }
}

main();
