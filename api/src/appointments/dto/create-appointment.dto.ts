import { IsString, IsOptional, IsDateString, IsArray, IsEnum, IsNumber } from 'class-validator';
import { AppointmentSource } from '@prisma/client';

export class CreateAppointmentItemDto {
  @IsString()
  serviceId: string;

  @IsNumber()
  estimatedPrice: number;   // required (Decimal NOT NULL in schema)

  @IsNumber()
  estimatedDuration: number; // required (Int NOT NULL in schema)
}

export class CreateAppointmentDto {
  @IsString()
  customerId: string;

  @IsString()
  petId: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsEnum(AppointmentSource)
  source?: AppointmentSource;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  items?: CreateAppointmentItemDto[];
}
