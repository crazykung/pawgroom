import { IsArray, IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { PetSizeTier, PetSpecies } from '@prisma/client';

export class PriceQuoteDto {
  @IsArray()
  @IsString({ each: true })
  serviceIds: string[];

  @IsOptional()
  @IsEnum(PetSizeTier)
  sizeTier?: PetSizeTier;

  @IsOptional()
  @IsEnum(PetSpecies)
  species?: PetSpecies;

  @IsOptional()
  @IsNumber()
  weightKg?: number;
}
