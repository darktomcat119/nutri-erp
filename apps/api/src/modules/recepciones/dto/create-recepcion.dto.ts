import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRecepcionItemDto {
  @ApiProperty({ example: 'uuid-del-item-entrega' })
  @IsString()
  ordenEntregaItemId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  cantidadRecibida: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;
}

export class CreateRecepcionDto {
  @ApiProperty({ example: 'uuid-de-la-orden-entrega' })
  @IsString()
  ordenEntregaId: string;

  @ApiPropertyOptional({ description: 'Firma digital en base64 (canvas signature)' })
  @IsOptional()
  @IsString()
  firmaDigital?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [CreateRecepcionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecepcionItemDto)
  items: CreateRecepcionItemDto[];
}
