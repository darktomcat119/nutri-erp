import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('productos')
export class ProductosController {
  constructor(private productosService: ProductosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar productos MOS' })
  @ApiQuery({ name: 'categoria', required: false })
  @ApiQuery({ name: 'proveedorId', required: false })
  async findAll(
    @Query('categoria') categoria?: string,
    @Query('proveedorId') proveedorId?: string,
  ) {
    return this.productosService.findAll({ categoria, proveedorId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto con config de sucursales' })
  async findOne(@Param('id') id: string) {
    return this.productosService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear producto' })
  async create(@Body() dto: CreateProductoDto) {
    return this.productosService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar producto' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.productosService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar producto' })
  async remove(@Param('id') id: string) {
    return this.productosService.remove(id);
  }
}
