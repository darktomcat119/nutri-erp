import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CambiarProveedorDto {
  @ApiProperty()
  @IsUUID()
  nuevoProveedorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  motivo?: string;
}
