import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;
  @IsOptional()
  @IsEmail()
  email?: string;
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  password?: string;
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
