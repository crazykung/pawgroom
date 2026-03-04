// dto/create-customer.dto.ts
import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { CustomerType } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  phone: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  lineId?: string;

  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @IsOptional()
  @IsString()
  notes?: string;
}
