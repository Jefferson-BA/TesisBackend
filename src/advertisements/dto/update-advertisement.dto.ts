import { PartialType } from '@nestjs/swagger';
import { CreateAdvertisementDto } from './create-advertisement.dto';

// PartialType hace que todos los campos de CreateAdvertisementDto sean opcionales para la actualización
export class UpdateAdvertisementDto extends PartialType(CreateAdvertisementDto) {}