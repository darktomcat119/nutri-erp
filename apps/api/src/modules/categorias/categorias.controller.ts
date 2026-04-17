import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Categorias')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('categorias')
export class CategoriasController {
  constructor(private categoriasService: CategoriasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorias' })
  @ApiQuery({ name: 'tipo', required: false, enum: ['MOS', 'INS'] })
  async findAll(@Query('tipo') tipo?: string) {
    return this.categoriasService.findAll(tipo);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear categoria' })
  async create(@Body() dto: CreateCategoriaDto) {
    return this.categoriasService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar categoria' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoriaDto) {
    return this.categoriasService.update(id, dto);
  }

  @Patch(':id/toggle-activo')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar categoria' })
  async toggleActivo(@Param('id') id: string) {
    return this.categoriasService.toggleActivo(id);
  }

  @Post('seed')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sembrar categorias por defecto' })
  async seed() {
    return this.categoriasService.seed();
  }
}
