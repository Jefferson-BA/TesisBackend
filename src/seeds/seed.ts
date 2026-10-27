import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { RoleType } from '../roles/enums/role-type.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const roleRepository = dataSource.getRepository(Role);
  const userRepository = dataSource.getRepository(User);

  console.log('🌱 Iniciando proceso de Seeding...');

  // 1. Crear los roles principales usando el enum RoleType
  const defaultRoles = [
    { name: RoleType.SUPERADMIN, description: 'Super Administrador del sistema' },
    { name: RoleType.ADMIN, description: 'Administrador' },
    { name: RoleType.USER, description: 'Cliente usuario' },
  ];

  for (const roleData of defaultRoles) {
    let role = await roleRepository.findOne({ where: { name: roleData.name } });
    if (!role) {
      role = roleRepository.create(roleData);
      await roleRepository.save(role);
      console.log(`✅ Rol creado: ${roleData.name}`);
    }
  }

  // 2. Obtener la referencia del rol 'admin'
  const adminRole = await roleRepository.findOne({ where: { name: RoleType.ADMIN } });

  if (!adminRole) {
    console.error('❌ No se encontró el rol admin.');
    await app.close();
    return;
  }

  // 3. Crear el usuario Administrador
  const adminEmail = 'admin@gmail.com';
  const existingAdmin = await userRepository.findOne({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const adminUser = userRepository.create({
      name: 'Administrador Principal',
      email: adminEmail,
      password: 'Admin123!', // @BeforeInsert encriptará la clave automáticamente
      role: adminRole,
      isActive: true,
      phone: '999999999',
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
    });

    await userRepository.save(adminUser);
    console.log('==============================================');
    console.log('🎉 Usuario Administrador creado exitosamente!');
    console.log(`📧 Correo: ${adminEmail}`);
    console.log(`🔑 Clave: Admin123!`);
    console.log('==============================================');
  } else {
    console.log(`ℹ️ El usuario administrador (${adminEmail}) ya existe.`);
  }

  await app.close();
  process.exit(0);
}

bootstrap();