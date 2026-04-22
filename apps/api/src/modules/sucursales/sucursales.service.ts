import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/utils/crypto.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';

const PUBLIC_FIELDS = {
  id: true,
  codigo: true,
  nombre: true,
  cafeteriaId: true,
  activa: true,
  createdAt: true,
  updatedAt: true,
  ordereatTokenLast4: true,
  ordereatTokenUpdatedAt: true,
  ordereatTokenUpdatedBy: true,
} as const;

@Injectable()
export class SucursalesService {
  constructor(private prisma: PrismaService, private crypto: CryptoService) {}

  async findAll() {
    return this.prisma.sucursal.findMany({
      select: PUBLIC_FIELDS,
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
    return sucursal;
  }

  async create(dto: CreateSucursalDto) {
    const existing = await this.prisma.sucursal.findUnique({ where: { codigo: dto.codigo } });
    if (existing) throw new ConflictException('El codigo de sucursal ya existe');
    return this.prisma.sucursal.create({ data: dto, select: PUBLIC_FIELDS });
  }

  async update(id: string, dto: UpdateSucursalDto) {
    await this.findOne(id);
    return this.prisma.sucursal.update({ where: { id }, data: dto, select: PUBLIC_FIELDS });
  }

  async toggleActivo(id: string) {
    const sucursal = await this.prisma.sucursal.findUnique({ where: { id }, select: { activa: true } });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
    return this.prisma.sucursal.update({
      where: { id },
      data: { activa: !sucursal.activa },
      select: PUBLIC_FIELDS,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sucursal.update({
      where: { id },
      data: { activa: false },
      select: PUBLIC_FIELDS,
    });
  }

  /**
   * Check what records would block a hard-delete for this sucursal.
   * Returns per-relation counts; UI shows a summary before the user confirms.
   */
  async checkHardDelete(id: string) {
    await this.findOne(id);
    const [
      usuarios,
      presupuestos,
      requisicionesIns,
      requisicionesMos,
      ordenesEntrega,
      recepciones,
      inventarioPos,
      config,
    ] = await Promise.all([
      this.prisma.usuario.count({ where: { sucursalId: id } }),
      this.prisma.presupuestoIns.count({ where: { sucursalId: id } }),
      this.prisma.requisicion.count({ where: { sucursalId: id } }),
      this.prisma.requisicionMos.count({ where: { sucursalId: id } }),
      this.prisma.ordenEntrega.count({ where: { sucursalId: id } }),
      this.prisma.recepcion.count({ where: { sucursalId: id } }),
      this.prisma.inventarioPos.count({ where: { sucursalId: id } }),
      this.prisma.configSucursalProducto.count({ where: { sucursalId: id } }),
    ]);
    const blockers = {
      usuarios,
      presupuestosIns: presupuestos,
      requisicionesIns,
      requisicionesMos,
      ordenesEntrega,
      recepciones,
      inventarioPos,
    };
    const total = Object.values(blockers).reduce((a, b) => a + b, 0);
    return { canDelete: total === 0, blockers, configLinks: config };
  }

  /**
   * Permanently delete a sucursal — only if it has no history (enforced by checkHardDelete).
   * ConfigSucursalProducto rows are cleaned up as part of the delete since they carry no history.
   */
  async hardDelete(id: string) {
    const check = await this.checkHardDelete(id);
    if (!check.canDelete) {
      throw new BadRequestException(
        'No se puede eliminar: la sucursal tiene movimientos/historial asociados. Use desactivar.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.configSucursalProducto.deleteMany({ where: { sucursalId: id } }),
      this.prisma.sucursal.delete({ where: { id } }),
    ]);
    return { success: true };
  }

  async setOrdereatToken(id: string, token: string, updatedBy: string) {
    const suc = await this.prisma.sucursal.findUnique({ where: { id }, select: { id: true } });
    if (!suc) throw new NotFoundException('Sucursal no encontrada');
    const trimmed = token.trim();
    if (!trimmed) throw new BadRequestException('Token vacio');
    const enc = this.crypto.encrypt(trimmed);
    const last4 = this.crypto.last4(trimmed);
    await this.prisma.sucursal.update({
      where: { id },
      data: {
        ordereatTokenEnc: enc,
        ordereatTokenLast4: last4,
        ordereatTokenUpdatedAt: new Date(),
        ordereatTokenUpdatedBy: updatedBy,
      },
    });
    return { success: true, last4 };
  }

  async getOrdereatTokenStatus(id: string) {
    const suc = await this.prisma.sucursal.findUnique({
      where: { id },
      select: {
        cafeteriaId: true,
        ordereatTokenLast4: true,
        ordereatTokenUpdatedAt: true,
        ordereatTokenUpdatedBy: true,
      },
    });
    if (!suc) throw new NotFoundException('Sucursal no encontrada');
    const daysOld = suc.ordereatTokenUpdatedAt
      ? Math.floor((Date.now() - suc.ordereatTokenUpdatedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      cafeteriaId: suc.cafeteriaId,
      configured: !!suc.ordereatTokenLast4,
      last4: suc.ordereatTokenLast4,
      updatedAt: suc.ordereatTokenUpdatedAt,
      updatedBy: suc.ordereatTokenUpdatedBy,
      daysOld,
    };
  }

  async clearOrdereatToken(id: string) {
    await this.findOne(id);
    await this.prisma.sucursal.update({
      where: { id },
      data: {
        ordereatTokenEnc: null,
        ordereatTokenLast4: null,
        ordereatTokenUpdatedAt: null,
        ordereatTokenUpdatedBy: null,
      },
    });
    return { success: true };
  }
}
