import { Controller, Get, Post, Patch, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrdenesCompraService } from './ordenes-compra.service';
import { GenerarOcDto } from './dto/generar-oc.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Ordenes de Compra')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ordenes-compra')
export class OrdenesCompraController {
  constructor(private ordenesCompraService: OrdenesCompraService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR, Role.CHOFER)
  @ApiOperation({ summary: 'Listar ordenes de compra' })
  @ApiQuery({ name: 'semana', required: false })
  @ApiQuery({ name: 'estado', required: false })
  async findAll(@Query('semana') semana?: string, @Query('estado') estado?: string) {
    return this.ordenesCompraService.findAll({ semana, estado });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener OC con items' })
  async findOne(@Param('id') id: string) {
    return this.ordenesCompraService.findOne(id);
  }

  @Get(':id/por-proveedor')
  @ApiOperation({ summary: 'Obtener OC agrupada por proveedor' })
  async findBySupplier(@Param('id') id: string) {
    return this.ordenesCompraService.findBySupplier(id);
  }

  @Get(':id/cambios')
  @ApiOperation({ summary: 'Historial de cambios de la OC' })
  async getCambiosLog(@Param('id') id: string) {
    return this.ordenesCompraService.getCambiosLog(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Generar PDF de orden de compra' })
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.ordenesCompraService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=OC_${id.slice(0, 8)}.pdf`,
    });
    res.send(pdfBuffer);
  }

  @Post('generar')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR)
  @ApiOperation({ summary: 'Generar OC desde requisiciones aprobadas' })
  async generar(@Body() dto: GenerarOcDto) {
    return this.ordenesCompraService.generar(dto.semana);
  }

  @Patch(':id/aprobar')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Aprobar orden de compra' })
  async aprobar(@Param('id') id: string) {
    return this.ordenesCompraService.aprobar(id);
  }

  @Patch(':id/iniciar-ejecucion')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Iniciar ejecucion de compra' })
  async iniciarEjecucion(@Param('id') id: string) {
    return this.ordenesCompraService.iniciarEjecucion(id);
  }
}
