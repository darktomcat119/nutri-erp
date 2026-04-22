import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RequisicionMosService } from './requisicion-mos.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Requisicion MOS')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('requisicion-mos')
export class RequisicionMosController {
  constructor(private requisicionMosService: RequisicionMosService) {}

  @Post('generar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Generar requisicion MOS desde Excel de inventario' })
  async generar(
    @UploadedFile() file: Express.Multer.File,
    @Body('sucursalId') sucursalId: string,
    @Body('semana') semana: string,
  ) {
    if (!file) throw new BadRequestException('Se requiere un archivo Excel');
    if (!sucursalId) throw new BadRequestException('Se requiere sucursalId');
    if (!semana) throw new BadRequestException('Se requiere semana');

    return this.requisicionMosService.generateFromInventoryExcel(
      file.buffer,
      sucursalId,
      semana,
    );
  }

  @Post('generar-live')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Generar requisicion MOS desde inventario live de OrderEat' })
  async generarLive(
    @Body('sucursalId') sucursalId: string,
    @Body('semana') semana: string,
  ) {
    if (!sucursalId) throw new BadRequestException('Se requiere sucursalId');
    if (!semana) throw new BadRequestException('Se requiere semana');
    return this.requisicionMosService.generateFromOrderEatLive(sucursalId, semana);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Listar requisiciones MOS' })
  @ApiQuery({ name: 'semana', required: false })
  async findAll(@Query('semana') semana?: string) {
    return this.requisicionMosService.findAll(semana);
  }

  @Get('branch/:semana/:sucursalId')
  @ApiOperation({ summary: 'Obtener requisicion MOS para sucursal y semana' })
  async getForBranch(
    @Param('semana') semana: string,
    @Param('sucursalId') sucursalId: string,
  ) {
    return this.requisicionMosService.getForBranch(semana, sucursalId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de requisicion MOS' })
  async findOne(@Param('id') id: string) {
    return this.requisicionMosService.findOne(id);
  }

  @Patch(':id/sugerir/:itemId')
  @UseGuards(RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiOperation({ summary: 'Encargado sugiere cambio en un item' })
  async suggestChange(
    @Param('id') _id: string,
    @Param('itemId') itemId: string,
    @Body('sugerencia') sugerencia: string,
    @Body('cantidadFinal') cantidadFinal: number,
  ) {
    if (!sugerencia || typeof sugerencia !== 'string' || !sugerencia.trim()) {
      throw new BadRequestException('Se requiere comentario de sugerencia');
    }
    if (cantidadFinal == null || Number.isNaN(Number(cantidadFinal)) || Number(cantidadFinal) < 0) {
      throw new BadRequestException('Cantidad final invalida');
    }
    return this.requisicionMosService.suggestChange(
      itemId,
      sugerencia.trim(),
      Math.floor(Number(cantidadFinal)),
    );
  }

  @Patch(':id/revisar')
  @UseGuards(RolesGuard)
  @Roles(Role.ENCARGADO)
  @ApiOperation({ summary: 'Encargado marca la requisicion como revisada (sin cambios)' })
  async markReviewed(@Param('id') id: string) {
    return this.requisicionMosService.markReviewed(id);
  }

  @Patch(':id/aprobar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar requisicion MOS' })
  async approve(@Param('id') id: string) {
    return this.requisicionMosService.approve(id);
  }
}
