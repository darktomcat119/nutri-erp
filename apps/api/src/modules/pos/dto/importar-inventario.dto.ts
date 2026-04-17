import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportarInventarioDto {
  @ApiProperty({ example: 'uuid-sucursal' })
  @IsString()
  sucursalId: string;
}
