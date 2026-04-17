import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { OrdereatService } from './ordereat.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('OrderEat Integration')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ordereat')
export class OrdereatController {
  constructor(private ordereatService: OrdereatService) {}

  @Post('parse-sales')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Procesar reporte de ventas OrderEat' })
  async parseSales(@UploadedFile() file: Express.Multer.File) {
    return this.ordereatService.parseSalesReport(file.buffer);
  }

  @Post('parse-inventory')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Procesar reporte de inventario OrderEat' })
  async parseInventory(@UploadedFile() file: Express.Multer.File) {
    return this.ordereatService.parseInventoryReport(file.buffer);
  }

  @Post('calculate-ins-budget')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Calcular presupuesto INS desde ventas' })
  async calculateInsBudget(
    @UploadedFile() file: Express.Multer.File,
    @Body('sucursalId') sucursalId: string,
  ) {
    return this.ordereatService.calculateInsBudget(file.buffer, sucursalId);
  }

  @Post('calculate-mos-purchase')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Calcular compra MOS desde inventario' })
  async calculateMosPurchase(
    @UploadedFile() file: Express.Multer.File,
    @Body('sucursalId') sucursalId: string,
  ) {
    return this.ordereatService.calculateMosPurchase(file.buffer, sucursalId);
  }

  @Post('import-mo02')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar configuracion de maximos/precios por sucursal (MO02)' })
  async importMo02(@UploadedFile() file: Express.Multer.File) {
    return this.ordereatService.importMo02Config(file.buffer);
  }

  @Post('import-in02')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar recetas/platillos (IN02)' })
  async importIn02(@UploadedFile() file: Express.Multer.File) {
    return this.ordereatService.importIn02Recipes(file.buffer);
  }

  @Get('status')
  @ApiOperation({ summary: 'Estado de conexion con OrderEat API' })
  async getStatus() {
    return this.ordereatService.getApiStatus();
  }

  @Get('api/inventory/:sucursalId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener inventario live de OrderEat para una sucursal' })
  async getInventoryForSucursal(@Param('sucursalId') sucursalId: string) {
    return this.ordereatService.getInventoryForSucursal(sucursalId);
  }

  @Get('api/sales/:sucursalId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener ventas live de OrderEat para una sucursal' })
  async getSalesForSucursal(
    @Param('sucursalId') sucursalId: string,
    @Query('from') from: string,
    @Query('until') until: string,
  ) {
    return this.ordereatService.getSalesForSucursal(sucursalId, from, until);
  }

  @Get('api/stock-history/:sucursalId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Historial de movimientos de stock de un producto' })
  async getStockHistoryForSucursal(
    @Param('sucursalId') sucursalId: string,
    @Query('productId') productId: string,
    @Query('from') from: string,
    @Query('until') until: string,
  ) {
    return this.ordereatService.getStockHistoryForSucursal(sucursalId, Number(productId), from, until);
  }

  @Post('api/stock/:sucursalId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Enviar movimientos de stock a OrderEat API' })
  async pushStock(
    @Param('sucursalId') sucursalId: string,
    @Body() movements: Array<{ productId: number; amount: number; description: string; type?: 'IN' | 'OUT' | 'INITIALIZE_STOCK' | 'CLEAR_STOCK' }>,
  ) {
    return this.ordereatService.pushStockMovementsForSucursal(sucursalId, movements);
  }

  @Get('template/sales')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Descargar template de reporte de ventas' })
  async salesTemplate(@Res() res: Response) {
    const buffer = await this.ordereatService.generateSalesTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=template_ventas.xlsx',
    });
    res.send(buffer);
  }

  @Get('template/inventory')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Descargar template de inventario' })
  async inventoryTemplate(@Res() res: Response) {
    const buffer = await this.ordereatService.generateInventoryTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=template_inventario.xlsx',
    });
    res.send(buffer);
  }
}
