import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ComprarItemDto {
  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  cantidadComprada: number;

  @ApiProperty({ example: 48.50 })
  @IsNumber()
  @Min(0)
  precioReal: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo?: string;
}
