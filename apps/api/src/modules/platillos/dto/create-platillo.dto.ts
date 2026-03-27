import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlatilloDto {
  @ApiProperty({ example: 'Hamburguesa' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 35.00 })
  @IsNumber()
  @Min(0)
  costo: number;
}
