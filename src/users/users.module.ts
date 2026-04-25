import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity'; // Importante importar la entidad Role aquí

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])], // Registramos ambas entidades en este módulo
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Exportamos el servicio para que AuthModule pueda usarlo
})
export class UsersModule {}