import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ReorderProveedoresDto } from './dto/reorder-proveedores.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Proveedores')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('proveedores')
export class ProveedoresController {
  constructor(private proveedoresService: ProveedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar proveedores' })
  @ApiQuery({ name: 'categoria', required: false })
  @ApiQuery({ name: 'activo', required: false })
  async findAll(@Query('categoria') categoria?: string, @Query('activo') activo?: string) {
    return this.proveedoresService.findAll({ categoria, activo });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  async findOne(@Param('id') id: string) {
    return this.proveedoresService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear proveedor' })
  async create(@Body() dto: CreateProveedorDto) {
    return this.proveedoresService.create(dto);
  }

  @Patch('reorder')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reordenar ruta de proveedores' })
  async reorder(@Body() dto: ReorderProveedoresDto) {
    return this.proveedoresService.reorder(dto);
  }

  @Patch(':id/toggle-activo')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar proveedor' })
  async toggleActivo(@Param('id') id: string) {
    return this.proveedoresService.toggleActivo(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar proveedor' })
  async update(@Param('id') id: string, @Body() dto: UpdateProveedorDto) {
    return this.proveedoresService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar proveedor' })
  async remove(@Param('id') id: string) {
    return this.proveedoresService.remove(id);
  }

  @Get(':id/check-hard-delete')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Verificar si el proveedor puede eliminarse permanentemente' })
  async checkHardDelete(@Param('id') id: string) {
    return this.proveedoresService.checkHardDelete(id);
  }

  @Delete(':id/hard')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar permanentemente (solo sin historial asociado)' })
  async hardDelete(@Param('id') id: string) {
    return this.proveedoresService.hardDelete(id);
  }
}
