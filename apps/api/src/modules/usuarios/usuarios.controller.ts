import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'sucursalId', required: false })
  async findAll(
    @Query('role') role?: string,
    @Query('sucursalId') sucursalId?: string,
  ) {
    return this.usuariosService.findAll({ role, sucursalId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  async findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario' })
  async create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  async update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar usuario' })
  async remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}
