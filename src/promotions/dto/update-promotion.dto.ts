import { PartialType } from '@nestjs/swagger';
import { CreatePromotionDto } from './create-promotion.dto';

// PartialType hace que todos los campos sean opcionales para el PATCH
export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
