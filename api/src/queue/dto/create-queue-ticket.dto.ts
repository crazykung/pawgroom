import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateQueueTicketDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  petId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceIds?: string[];

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  priceOverrides?: Record<string, number>;

  @IsOptional()
  @IsString()
  notes?: string;
}
