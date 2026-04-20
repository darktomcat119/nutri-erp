import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdereatService } from '../ordereat/ordereat.service';
import { CreateRecepcionDto } from './dto/create-recepcion.dto';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class RecepcionesService {
  constructor(private prisma: PrismaService, private ordereat: OrdereatService) {}

  async findAll() {
    const recepciones = await this.prisma.recepcion.findMany({
      include: {
        sucursal: true,
        recibidoPor: true,
        ordenEntrega: { include: { ordenCompra: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: recepciones, message: 'Lista de recepciones' };
  }

  async getPendientes(user: JwtPayload) {
    const deliveries = await this.prisma.ordenEntrega.findMany({
      where: {
        sucursalId: user.sucursalId!,
        recepcion: null,
      },
      include: {
        items: {
          include: { producto: true, insumo: true },
        },
        ordenCompra: true,
        sucursal: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: deliveries, message: 'Entregas pendientes de recepcion' };
  }

  async crear(dto: CreateRecepcionDto, user: JwtPayload) {
    // Validate: OrdenEntrega exists and belongs to user's branch
    const ordenEntrega = await this.prisma.ordenEntrega.findUnique({
      where: { id: dto.ordenEntregaId },
      include: { items: true, recepcion: true },
    });

    if (!ordenEntrega) {
      throw new NotFoundException('Orden de entrega no encontrada');
    }

    if (ordenEntrega.sucursalId !== user.sucursalId) {
      throw new BadRequestException('La orden de entrega no pertenece a tu sucursal');
    }

    // Validate: No existing recepcion for this delivery
    if (ordenEntrega.recepcion) {
      throw new ConflictException('Ya existe una recepcion para esta orden de entrega');
    }

    // Build recepcion items from dto
    const recepcionItems = dto.items.map((dtoItem) => {
      const entregaItem = ordenEntrega.items.find((ei) => ei.id === dtoItem.ordenEntregaItemId);
      if (!entregaItem) {
        throw new BadRequestException(`Item de entrega no encontrado: ${dtoItem.ordenEntregaItemId}`);
      }

      const cantidadEsperada = Number(entregaItem.cantidadAsignada);
      const cantidadRecibida = dtoItem.cantidadRecibida;
      const diferencia = cantidadRecibida - cantidadEsperada;

      return {
        area: entregaItem.area,
        productoId: entregaItem.productoId,
        insumoId: entregaItem.insumoId,
        cantidadEsperada: new Decimal(cantidadEsperada.toFixed(2)),
        cantidadRecibida: new Decimal(cantidadRecibida.toFixed(2)),
        diferencia: new Decimal(diferencia.toFixed(2)),
        notas: dtoItem.notas,
      };
    });

    // Create Recepcion with items
    const recepcion = await this.prisma.recepcion.create({
      data: {
        ordenEntregaId: dto.ordenEntregaId,
        sucursalId: user.sucursalId!,
        recibidoPorId: user.sub,
        firmaDigital: dto.firmaDigital,
        notas: dto.notas,
        items: {
          create: recepcionItems,
        },
      },
      include: {
        items: {
          include: { producto: true, insumo: true },
        },
        ordenEntrega: true,
        sucursal: true,
        recibidoPor: true,
      },
    });

    return { data: recepcion, message: 'Recepcion registrada' };
  }

  async findOne(id: string) {
    const recepcion = await this.prisma.recepcion.findUnique({
      where: { id },
      include: {
        items: {
          include: { producto: true, insumo: true },
        },
        ordenEntrega: true,
        sucursal: true,
        recibidoPor: true,
      },
    });

    if (!recepcion) {
      throw new NotFoundException('Recepcion no encontrada');
    }

    return { data: recepcion, message: 'Detalle de recepcion' };
  }

  /**
   * Preview which reception items would be pushed to OrderEat (MOS items only, with ordereatId + positive received).
   * Does not call the OrderEat API — used by the UI to confirm before sending.
   */
  async previewPushToOrderEat(recepcionId: string) {
    const recepcion = await this.prisma.recepcion.findUnique({
      where: { id: recepcionId },
      include: {
        sucursal: true,
        items: { include: { producto: true, insumo: true } },
      },
    });
    if (!recepcion) throw new NotFoundException('Recepcion no encontrada');

    const eligible: Array<{
      productoId: string;
      productoNombre: string;
      ordereatProductId: number;
      cantidadRecibidaDisplays: number;
      pzXDisplay: number;
      amountPieces: number;
    }> = [];
    const skipped: Array<{ item: string; reason: string }> = [];

    for (const item of recepcion.items) {
      if (item.area !== 'MOS') {
        skipped.push({ item: item.insumo?.nombre || '(sin nombre)', reason: 'No es MOS (los insumos no se sincronizan)' });
        continue;
      }
      const p = item.producto;
      if (!p) {
        skipped.push({ item: '(producto desconocido)', reason: 'Producto no vinculado' });
        continue;
      }
      if (!p.ordereatId) {
        skipped.push({ item: p.nombre, reason: 'Producto sin ordereatId configurado' });
        continue;
      }
      const displays = Number(item.cantidadRecibida);
      if (displays <= 0) {
        skipped.push({ item: p.nombre, reason: 'Cantidad recibida cero o negativa' });
        continue;
      }
      const pzXDisplay = p.pzXDisplay || 1;
      const amountPieces = Math.round(displays * pzXDisplay);
      eligible.push({
        productoId: p.id,
        productoNombre: p.nombre,
        ordereatProductId: Number(p.ordereatId),
        cantidadRecibidaDisplays: displays,
        pzXDisplay,
        amountPieces,
      });
    }

    return {
      data: {
        recepcionId,
        sucursalId: recepcion.sucursalId,
        sucursalCodigo: recepcion.sucursal.codigo,
        eligible,
        skipped,
      },
      message: 'Preview de push a OrderEat',
    };
  }

  /**
   * Push reception items to OrderEat as IN stock movements.
   * Only MOS items with ordereatId and positive received quantity are sent.
   * Idempotent: if already pushed, returns 409 with the existing push timestamp.
   */
  async pushToOrderEat(recepcionId: string, userEmail: string) {
    // Idempotency check: already pushed?
    const existing = await this.prisma.recepcion.findUnique({
      where: { id: recepcionId },
      select: { pushedToOrderEatAt: true, pushedToOrderEatBy: true },
    });
    if (!existing) throw new NotFoundException('Recepcion no encontrada');
    if (existing.pushedToOrderEatAt) {
      throw new ConflictException(
        `Esta recepcion ya fue enviada a OrderEat (${existing.pushedToOrderEatAt.toISOString().slice(0, 16)} por ${existing.pushedToOrderEatBy || 'desconocido'}). No se puede reenviar.`,
      );
    }

    const preview = await this.previewPushToOrderEat(recepcionId);
    const { eligible, sucursalId, sucursalCodigo, skipped } = preview.data;

    if (eligible.length === 0) {
      throw new BadRequestException(
        `No hay items elegibles para enviar. Revisados: ${skipped.length}`,
      );
    }

    const movements = eligible.map((e) => ({
      productId: e.ordereatProductId,
      amount: e.amountPieces,
      description: `Recepcion ${recepcionId.slice(0, 8)} — ${sucursalCodigo}`,
      type: 'IN' as const,
    }));

    const result = await this.ordereat.pushStockMovementsForSucursal(sucursalId, movements);

    // Mark as pushed — must happen after the API call succeeds
    await this.prisma.recepcion.update({
      where: { id: recepcionId },
      data: {
        pushedToOrderEatAt: new Date(),
        pushedToOrderEatBy: userEmail,
      },
    });

    return {
      data: {
        recepcionId,
        enviados: eligible.length,
        omitidos: skipped.length,
        totalPiezas: eligible.reduce((sum, e) => sum + e.amountPieces, 0),
        detalle: eligible,
        omitidoDetalle: skipped,
        apiResult: result.data,
      },
      message: `${eligible.length} movimientos enviados a OrderEat`,
    };
  }
}
