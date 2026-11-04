import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from '../superadmin/entities/system-config.entity';
import { SettingsService } from './settings.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
