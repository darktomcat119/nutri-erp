import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { PosService } from './pos.service';
import { ImportarInventarioDto } from './dto/importar-inventario.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('POS Integration')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('pos')
export class PosController {
  constructor(private posService: PosService) {}

  @Post('importar-inventario')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Importar inventario desde Excel de OrderEat' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importarInventario(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportarInventarioDto,
  ) {
    return this.posService.importarInventario(file, dto.sucursalId);
  }

  @Get('inventario/:sucursalId')
  @ApiOperation({ summary: 'Obtener inventario POS de una sucursal' })
  async getInventario(@Param('sucursalId') sucursalId: string) {
    return this.posService.getInventario(sucursalId);
  }

  @Post('generar-carga/:ordenEntregaId')
  @Roles(Role.SUPERVISOR, Role.ADMIN)
  @ApiOperation({ summary: 'Generar archivo de carga para OrderEat' })
  async generarCarga(@Param('ordenEntregaId') ordenEntregaId: string) {
    return this.posService.generarCarga(ordenEntregaId);
  }

  @Get('uploads')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar archivos de carga generados' })
  async getUploads() {
    return this.posService.getUploads();
  }

  @Get('uploads/:id/download')
  @ApiOperation({ summary: 'Descargar archivo de carga generado' })
  async downloadUpload(@Param('id') id: string) {
    return this.posService.downloadUpload(id);
  }
}
