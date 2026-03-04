import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, IsArray } from 'class-validator';
import { ServiceCategory, PetSizeTier, PetSpecies } from '@prisma/client';

export class CreatePriceRuleDto {
  @IsOptional()
  @IsEnum(PetSpecies)
  species?: PetSpecies;

  @IsOptional()
  @IsEnum(PetSizeTier)
  sizeTier?: PetSizeTier;

  basePrice: number;
  durationMultiplier?: number;

  @IsOptional()
  @IsInt()
  priority?: number;
}

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  @IsOptional()
  @IsInt()
  baseDurationMin?: number;

  @IsOptional()
  @IsBoolean()
  taxable?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  priceRules?: CreatePriceRuleDto[];
}
