import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InsumosService } from './insumos.service';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Insumos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('insumos')
export class InsumosController {
  constructor(private insumosService: InsumosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar insumos' })
  @ApiQuery({ name: 'categoria', required: false })
  @ApiQuery({ name: 'proveedorId', required: false })
  async findAll(@Query('categoria') categoria?: string, @Query('proveedorId') proveedorId?: string) {
    return this.insumosService.findAll({ categoria, proveedorId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener insumo' })
  async findOne(@Param('id') id: string) { return this.insumosService.findOne(id); }

  @Post()
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear insumo' })
  async create(@Body() dto: CreateInsumoDto) { return this.insumosService.create(dto); }

  @Patch(':id')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar insumo' })
  async update(@Param('id') id: string, @Body() dto: UpdateInsumoDto) { return this.insumosService.update(id, dto); }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Desactivar insumo' })
  async remove(@Param('id') id: string) { return this.insumosService.remove(id); }
}
