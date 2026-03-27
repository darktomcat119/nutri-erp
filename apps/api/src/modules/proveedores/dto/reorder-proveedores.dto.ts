import { IsArray, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ProveedorOrden {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  ordenRuta: number;
}

export class ReorderProveedoresDto {
  @ApiProperty({ type: [ProveedorOrden] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProveedorOrden)
  proveedores: ProveedorOrden[];
}
