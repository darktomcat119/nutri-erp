import { Controller, Get, Post, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrdenesEntregaService } from './ordenes-entrega.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Ordenes de Entrega')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ordenes-entrega')
export class OrdenesEntregaController {
  constructor(private ordenesEntregaService: OrdenesEntregaService) {}

  @Post('generar/:ordenCompraId')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Generar entregas desde OC completada' })
  async generar(@Param('ordenCompraId') ordenCompraId: string) {
    return this.ordenesEntregaService.generar(ordenCompraId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ordenes de entrega' })
  @ApiQuery({ name: 'sucursalId', required: false })
  @ApiQuery({ name: 'semana', required: false })
  async findAll(
    @Query('sucursalId') sucursalId?: string,
    @Query('semana') semana?: string,
  ) {
    return this.ordenesEntregaService.findAll({ sucursalId, semana });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener orden de entrega con items' })
  async findOne(@Param('id') id: string) {
    return this.ordenesEntregaService.findOne(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Generar PDF de orden de entrega' })
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.ordenesEntregaService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=ENT_${id.slice(0, 8)}.pdf`,
    });
    res.send(pdfBuffer);
  }
}
