import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComprarItemDto } from './dto/comprar-item.dto';
import { CambiarProveedorDto } from './dto/cambiar-proveedor.dto';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EjecucionService {
  constructor(private prisma: PrismaService) {}

  async getRuta(ordenCompraId: string): Promise<unknown> {
    const oc = await this.prisma.ordenCompra.findUnique({
      where: { id: ordenCompraId },
      include: {
        items: {
          include: { producto: true, insumo: true, proveedor: true },
          orderBy: { proveedor: { ordenRuta: 'asc' } },
        },
      },
    });
    if (!oc) throw new NotFoundException('Orden de compra no encontrada');
    if (oc.estado !== 'EN_EJECUCION' && oc.estado !== 'APROBADA') {
      throw new BadRequestException('La orden no esta en ejecucion');
    }

    // Group by supplier
    const grouped: Record<string, {
      proveedor: { id: string; nombre: string; ordenRuta: number; categoria: string | null };
      items: unknown[];
      totalEstimado: number;
      completado: boolean;
    }> = {};

    for (const item of oc.items) {
      const prov = item.proveedor;
      if (!grouped[prov.id]) {
        grouped[prov.id] = {
          proveedor: { id: prov.id, nombre: prov.nombre, ordenRuta: prov.ordenRuta, categoria: prov.categoria },
          items: [],
          totalEstimado: 0,
          completado: true,
        };
      }
      grouped[prov.id].items.push(item);
      grouped[prov.id].totalEstimado += Number(item.precioEstimado) * Number(item.cantidadSolicitada);
      if (!item.comprado) grouped[prov.id].completado = false;
    }

    const ruta = Object.values(grouped).sort((a, b) => a.proveedor.ordenRuta - b.proveedor.ordenRuta);
    return { ordenCompra: { id: oc.id, folio: oc.folio, semana: oc.semana, estado: oc.estado }, ruta };
  }

  async comprarItem(itemId: string, user: JwtPayload, dto: ComprarItemDto): Promise<unknown> {
    const item = await this.prisma.ordenCompraItem.findUnique({
      where: { id: itemId },
      include: { ordenCompra: true },
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (item.ordenCompra.estado !== 'EN_EJECUCION') {
      throw new BadRequestException('La orden no esta en ejecucion');
    }

    const changes: Array<{ tipoCambio: 'CANTIDAD' | 'PRECIO'; valorAnterior: string; valorNuevo: string; motivo?: string }> = [];

    if (dto.cantidadComprada !== Number(item.cantidadSolicitada)) {
      changes.push({
        tipoCambio: 'CANTIDAD',
        valorAnterior: String(item.cantidadSolicitada),
        valorNuevo: String(dto.cantidadComprada),
        motivo: dto.motivo,
      });
    }

    if (dto.precioReal !== Number(item.precioEstimado)) {
      changes.push({
        tipoCambio: 'PRECIO',
        valorAnterior: String(item.precioEstimado),
        valorNuevo: String(dto.precioReal),
        motivo: dto.motivo,
      });
    }

    // Update item
    const updated = await this.prisma.ordenCompraItem.update({
      where: { id: itemId },
      data: {
        cantidadComprada: new Decimal(dto.cantidadComprada.toFixed(2)),
        precioReal: new Decimal(dto.precioReal.toFixed(2)),
        comprado: true,
      },
      include: { producto: true, insumo: true, proveedor: true },
    });

    // Log changes
    if (changes.length > 0) {
      await this.prisma.cambioCompraLog.createMany({
        data: changes.map((c) => ({
          itemId,
          usuarioId: user.sub,
          tipoCambio: c.tipoCambio,
          valorAnterior: c.valorAnterior,
          valorNuevo: c.valorNuevo,
          motivo: c.motivo,
        })),
      });
    }

    return updated;
  }

  async cambiarProveedor(itemId: string, user: JwtPayload, dto: CambiarProveedorDto): Promise<unknown> {
    const item = await this.prisma.ordenCompraItem.findUnique({
      where: { id: itemId },
      include: { ordenCompra: true, proveedor: true },
    });
    if (!item) throw new NotFoundException('Item no encontrado');
    if (item.ordenCompra.estado !== 'EN_EJECUCION') {
      throw new BadRequestException('La orden no esta en ejecucion');
    }

    const nuevoProveedor = await this.prisma.proveedor.findUnique({ where: { id: dto.nuevoProveedorId } });
    if (!nuevoProveedor) throw new NotFoundException('Proveedor no encontrado');

    // Log change
    await this.prisma.cambioCompraLog.create({
      data: {
        itemId,
        usuarioId: user.sub,
        tipoCambio: 'PROVEEDOR',
        valorAnterior: item.proveedor.nombre,
        valorNuevo: nuevoProveedor.nombre,
        motivo: dto.motivo,
      },
    });

    return this.prisma.ordenCompraItem.update({
      where: { id: itemId },
      data: { proveedorId: dto.nuevoProveedorId },
      include: { producto: true, insumo: true, proveedor: true },
    });
  }

  async completar(ordenCompraId: string): Promise<unknown> {
    const oc = await this.prisma.ordenCompra.findUnique({
      where: { id: ordenCompraId },
      include: { items: true },
    });
    if (!oc) throw new NotFoundException('Orden de compra no encontrada');
    if (oc.estado !== 'EN_EJECUCION') {
      throw new BadRequestException('La orden no esta en ejecucion');
    }

    const allPurchased = oc.items.every((item) => item.comprado);
    if (!allPurchased) {
      throw new BadRequestException('Aun hay items sin comprar');
    }

    // Calculate total real
    const totalReal = oc.items.reduce((sum, item) => {
      return sum + Number(item.cantidadComprada || 0) * Number(item.precioReal || 0);
    }, 0);

    return this.prisma.ordenCompra.update({
      where: { id: ordenCompraId },
      data: {
        estado: 'COMPLETADA',
        totalReal: new Decimal(totalReal.toFixed(2)),
      },
    });
  }
}
