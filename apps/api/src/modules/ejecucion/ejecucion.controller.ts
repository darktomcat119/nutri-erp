import { Controller, Get, Patch, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { EjecucionService } from './ejecucion.service';
import { ComprarItemDto } from './dto/comprar-item.dto';
import { CambiarProveedorDto } from './dto/cambiar-proveedor.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Ejecucion de Compra')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.CHOFER)
@Controller('ejecucion')
export class EjecucionController {
  constructor(private ejecucionService: EjecucionService) {}

  @Get(':ordenCompraId/ruta')
  @ApiOperation({ summary: 'Obtener ruta de proveedores con items' })
  async getRuta(@Param('ordenCompraId') ordenCompraId: string) {
    return this.ejecucionService.getRuta(ordenCompraId);
  }

  @Patch(':itemId/comprar')
  @ApiOperation({ summary: 'Registrar compra de un item' })
  async comprarItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ComprarItemDto,
  ) {
    return this.ejecucionService.comprarItem(itemId, user, dto);
  }

  @Patch(':itemId/cambiar-proveedor')
  @ApiOperation({ summary: 'Cambiar proveedor de un item' })
  async cambiarProveedor(
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CambiarProveedorDto,
  ) {
    return this.ejecucionService.cambiarProveedor(itemId, user, dto);
  }

  @Post(':ordenCompraId/completar')
  @ApiOperation({ summary: 'Completar ejecucion de compra' })
  async completar(@Param('ordenCompraId') ordenCompraId: string) {
    return this.ejecucionService.completar(ordenCompraId);
  }
}
