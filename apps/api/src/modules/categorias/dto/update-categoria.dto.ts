import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoriaDto {
  @ApiPropertyOptional({ example: 'GALLETAS' })
  @IsOptional()
  @IsString()
  nombre?: string;
}
