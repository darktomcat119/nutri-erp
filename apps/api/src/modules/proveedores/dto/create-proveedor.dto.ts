import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProveedorDto {
  @ApiProperty({ example: 'Costco' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Autoservicio' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional({ example: 'Juan Perez' })
  @IsOptional()
  @IsString()
  contacto?: string;

  @ApiPropertyOptional({ example: '555-1234' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ordenRuta?: number;
}
