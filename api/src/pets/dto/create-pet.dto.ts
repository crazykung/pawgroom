import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { PetSpecies, PetSizeTier } from '@prisma/client';

export class CreatePetDto {
  @IsString()
  customerId: string;

  @IsString()
  name: string;

  @IsEnum(PetSpecies)
  species: PetSpecies;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsEnum(PetSizeTier)
  sizeTier?: PetSizeTier;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
