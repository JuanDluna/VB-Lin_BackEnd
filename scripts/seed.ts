import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User, Equipment, Loan } from '../src/models';
import { connectMongoDB, disconnectMongoDB } from '../src/database/mongodb';
import { config } from '../src/config';
import { Types } from 'mongoose';

/**
 * Script para poblar la base de datos con datos iniciales
 */
const seed = async (): Promise<void> => {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Conectar a MongoDB
    await connectMongoDB();

    // Limpiar colecciones (opcional, comentar si quieres conservar datos existentes)
    console.log('🗑️  Limpiando colecciones...');
    await User.deleteMany({});
    await Equipment.deleteMany({});
    await Loan.deleteMany({});
    // Nota: No limpiar notifications para mantener historial

    // Crear usuarios
    console.log('👤 Creando usuarios...');
    const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10);
    const profesorPasswordHash = await bcrypt.hash('Profesor123!', 10);
    const estudiantePasswordHash = await bcrypt.hash('Estudiante123!', 10);

    const admin = await User.create({
      email: 'admin@uaa.mx',
      passwordHash: adminPasswordHash,
      firstName: 'Administrador',
      lastName: 'Sistema',
      role: 'admin',
      active: true,
      createdAt: new Date(),
      lastAccess: new Date(),
    });

    const profesor = await User.create({
      email: 'profesor@uaa.mx',
      passwordHash: profesorPasswordHash,
      firstName: 'Juan',
      lastName: 'Profesor',
      role: 'profesor',
      active: true,
      createdAt: new Date(),
      lastAccess: new Date(),
    });

    const estudiante = await User.create({
      email: 'estudiante@uaa.mx',
      passwordHash: estudiantePasswordHash,
      firstName: 'María',
      lastName: 'Estudiante',
      role: 'estudiante',
      active: true,
      createdAt: new Date(),
      lastAccess: new Date(),
    });

    console.log('✅ Usuarios creados:', {
      admin: admin.email,
      profesor: profesor.email,
      estudiante: estudiante.email,
    });

    // Crear equipos
    console.log('🔧 Creando equipos...');
    const equipos = await Equipment.create([
      {
        code: 'LAP001',
        name: 'Laptop Dell Inspiron 15',
        description: 'Laptop Dell Inspiron 15 pulgadas, Intel Core i5, 8GB RAM, 256GB SSD',
        category: 'Computadoras',
        status: 'disponible',
        location: 'Laboratorio A',
        acquisitionDate: new Date('2023-01-15'),
        estimatedValue: 12000,
      },
      {
        code: 'LAP002',
        name: 'Laptop HP Pavilion',
        description: 'Laptop HP Pavilion 14 pulgadas, AMD Ryzen 5, 8GB RAM, 512GB SSD',
        category: 'Computadoras',
        status: 'disponible',
        location: 'Laboratorio A',
        acquisitionDate: new Date('2023-02-20'),
        estimatedValue: 11500,
      },
      {
        code: 'PROY001',
        name: 'Proyector Epson XGA',
        description: 'Proyector Epson XGA 3500 lúmenes, resolución 1024x768',
        category: 'Proyectores',
        status: 'disponible',
        location: 'Laboratorio B',
        acquisitionDate: new Date('2023-03-10'),
        estimatedValue: 8500,
      },
      {
        code: 'MICRO001',
        name: 'Microcontrolador Arduino Uno',
        description: 'Kit Arduino Uno R3 con sensores y componentes básicos',
        category: 'Electrónica',
        status: 'disponible',
        location: 'Laboratorio C',
        acquisitionDate: new Date('2023-04-05'),
        estimatedValue: 800,
      },
      {
        code: 'MICRO002',
        name: 'Microcontrolador ESP32',
        description: 'Módulo ESP32 con WiFi y Bluetooth integrados',
        category: 'Electrónica',
        status: 'disponible',
        location: 'Laboratorio C',
        acquisitionDate: new Date('2023-05-12'),
        estimatedValue: 450,
      },
    ]);

    console.log(`✅ ${equipos.length} equipos creados`);

    // Crear préstamo activo
    console.log('📦 Creando préstamo activo...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1); // Ayer
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7); // 7 días después (profesor)

    const prestamoActivo = await Loan.create({
      userId: profesor._id,
      equipmentId: equipos[0]._id,
      reservedAt: new Date(),
      startDate: startDate,
      endDate: endDate,
      checkoutAt: new Date(),
      status: 'activo',
      reservationRemarks: 'Préstamo para proyecto de investigación',
      returnRemarks: '',
    });

    // Actualizar estado del equipo a prestado
    equipos[0].status = 'prestado';
    await equipos[0].save();

    console.log('✅ Préstamo activo creado:', {
      usuario: profesor.email,
      equipo: equipos[0].code,
      estado: prestamoActivo.status,
    });

    console.log('\n✅ Seed completado exitosamente!');
    console.log('\n📝 Credenciales de acceso:');
    console.log('   Admin: admin@uaa.mx / AdminPass123!');
    console.log('   Profesor: profesor@uaa.mx / Profesor123!');
    console.log('   Estudiante: estudiante@uaa.mx / Estudiante123!');
  } catch (error) {
    console.error('❌ Error en seed:', error);
    throw error;
  } finally {
    await disconnectMongoDB();
  }
};

// Ejecutar seed
seed()
  .then(() => {
    console.log('✅ Proceso de seed finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal en seed:', error);
    process.exit(1);
  });

