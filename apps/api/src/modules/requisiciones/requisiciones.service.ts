import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateRequisicionDto } from './dto/create-requisicion.dto';
import { UpdateRequisicionDto } from './dto/update-requisicion.dto';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

type ItemDto = {
  area: 'INS' | 'MOS';
  productoId?: string;
  insumoId?: string;
  cantidadSolicitada: number;
  notas?: string;
};

type PricedItem = {
  area: 'INS' | 'MOS';
  productoId: string | null;
  insumoId: string | null;
  cantidadSolicitada: Decimal;
  costoUnitario: Decimal | null;
  subtotal: Decimal | null;
  notas: string | null;
};

@Injectable()
export class RequisicionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { semana?: string; sucursalId?: string; estado?: string }): Promise<unknown[]> {
    const where: Record<string, unknown> = {};
    if (query?.semana) where.semana = query.semana;
    if (query?.sucursalId && query.sucursalId !== 'all') where.sucursalId = query.sucursalId;
    // Treat 'all' / empty string as "no estado filter"
    if (query?.estado && query.estado !== 'all') where.estado = query.estado;

    return this.prisma.requisicion.findMany({
      where,
      include: {
        sucursal: true,
        creadoPor: { select: { id: true, nombre: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByBranch(sucursalId: string): Promise<unknown[]> {
    return this.prisma.requisicion.findMany({
      where: { sucursalId },
      include: {
        sucursal: true,
        creadoPor: { select: { id: true, nombre: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<unknown> {
    const req = await this.prisma.requisicion.findUnique({
      where: { id },
      include: {
        sucursal: true,
        creadoPor: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: { include: { proveedor: true } },
            insumo: { include: { proveedor: true } },
          },
        },
      },
    });
    if (!req) throw new NotFoundException('Requisicion no encontrada');
    return req;
  }

  /**
   * Price each item by looking up its insumo or producto cost.
   * Falls back to costoUnitario = null (and subtotal = null) if not resolvable,
   * so an unknown id won't block the save — the Admin can still see the item.
   */
  private async priceItems(items: ItemDto[]): Promise<{ priced: PricedItem[]; montoTotal: Decimal }> {
    const insumoIds = items.map((i) => i.insumoId).filter((x): x is string => !!x);
    const productoIds = items.map((i) => i.productoId).filter((x): x is string => !!x);

    const [insumos, productos] = await Promise.all([
      insumoIds.length
        ? this.prisma.insumo.findMany({ where: { id: { in: insumoIds } }, select: { id: true, costoUnitario: true } })
        : Promise.resolve([]),
      productoIds.length
        ? this.prisma.producto.findMany({ where: { id: { in: productoIds } }, select: { id: true, costoDisplay: true, pzXDisplay: true } })
        : Promise.resolve([]),
    ]);
    const insumoCost = new Map(insumos.map((i) => [i.id, new Decimal(i.costoUnitario)]));
    const productoCost = new Map(
      productos.map((p) => {
        const pz = p.pzXDisplay || 0;
        const costoPz = pz > 0 ? new Decimal(p.costoDisplay).div(pz) : null;
        return [p.id, costoPz];
      }),
    );

    let montoTotal = new Decimal(0);
    const priced: PricedItem[] = items.map((item) => {
      const cantidad = new Decimal(item.cantidadSolicitada);
      let costoUnitario: Decimal | null = null;
      if (item.insumoId) costoUnitario = insumoCost.get(item.insumoId) ?? null;
      else if (item.productoId) costoUnitario = productoCost.get(item.productoId) ?? null;
      const subtotal = costoUnitario ? cantidad.mul(costoUnitario) : null;
      if (subtotal) montoTotal = montoTotal.add(subtotal);
      return {
        area: item.area,
        productoId: item.productoId || null,
        insumoId: item.insumoId || null,
        cantidadSolicitada: cantidad,
        costoUnitario,
        subtotal,
        notas: item.notas || null,
      };
    });

    return { priced, montoTotal };
  }

  async create(user: JwtPayload, dto: CreateRequisicionDto): Promise<unknown> {
    if (!user.sucursalId) {
      throw new ForbiddenException('Usuario sin sucursal asignada');
    }

    const area = dto.area || 'INS';
    const existing = await this.prisma.requisicion.findUnique({
      where: { semana_sucursalId_area: { semana: dto.semana, sucursalId: user.sucursalId, area } },
    });
    if (existing) {
      throw new BadRequestException('Ya existe una requisicion para esta semana, sucursal y area');
    }

    const { priced, montoTotal } = await this.priceItems(dto.items);

    // Validate budget if provided, compute excedePresupuesto
    let excedePresupuesto = false;
    if (dto.presupuestoInsId) {
      const presupuesto = await this.prisma.presupuestoIns.findUnique({ where: { id: dto.presupuestoInsId } });
      if (presupuesto) {
        const budget = new Decimal(presupuesto.montoAprobado || presupuesto.montoCalculado);
        excedePresupuesto = montoTotal.gt(budget);
      }
    }

    return this.prisma.requisicion.create({
      data: {
        semana: dto.semana,
        sucursalId: user.sucursalId,
        creadoPorId: user.sub,
        area,
        notas: dto.notas,
        presupuestoInsId: dto.presupuestoInsId || null,
        justificacionExceso: dto.justificacionExceso || null,
        montoTotal,
        excedePresupuesto,
        items: { create: priced },
      },
      include: {
        sucursal: true,
        items: { include: { producto: true, insumo: true } },
      },
    });
  }

  async update(id: string, user: JwtPayload, dto: UpdateRequisicionDto): Promise<unknown> {
    const req = await this.prisma.requisicion.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Requisicion no encontrada');
    if (req.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden editar requisiciones en borrador');
    }
    if (req.sucursalId !== user.sucursalId) {
      throw new ForbiddenException('No puedes editar requisiciones de otra sucursal');
    }

    return this.prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = {};
      if (dto.notas !== undefined) data.notas = dto.notas;
      if (dto.presupuestoInsId !== undefined) data.presupuestoInsId = dto.presupuestoInsId || null;
      if (dto.justificacionExceso !== undefined) {
        data.justificacionExceso = dto.justificacionExceso || null;
      }

      if (dto.items) {
        await tx.requisicionItem.deleteMany({ where: { requisicionId: id } });
        const { priced, montoTotal } = await this.priceItems(dto.items);
        data.montoTotal = montoTotal;

        // Recompute excedePresupuesto if budget is known
        const presupuestoId = dto.presupuestoInsId ?? req.presupuestoInsId;
        if (presupuestoId) {
          const presupuesto = await tx.presupuestoIns.findUnique({ where: { id: presupuestoId } });
          if (presupuesto) {
            const budget = new Decimal(presupuesto.montoAprobado || presupuesto.montoCalculado);
            data.excedePresupuesto = montoTotal.gt(budget);
          }
        }

        await tx.requisicionItem.createMany({
          data: priced.map((p) => ({
            requisicionId: id,
            area: p.area,
            productoId: p.productoId,
            insumoId: p.insumoId,
            cantidadSolicitada: p.cantidadSolicitada,
            costoUnitario: p.costoUnitario,
            subtotal: p.subtotal,
            notas: p.notas,
          })),
        });
      }

      return tx.requisicion.update({
        where: { id },
        data,
        include: {
          sucursal: true,
          items: { include: { producto: true, insumo: true } },
        },
      });
    });
  }

  async submit(id: string, user: JwtPayload): Promise<unknown> {
    const req = await this.prisma.requisicion.findUnique({ where: { id }, include: { items: true } });
    if (!req) throw new NotFoundException('Requisicion no encontrada');
    if (req.estado !== 'BORRADOR') throw new BadRequestException('Solo se pueden enviar borradores');
    if (req.sucursalId !== user.sucursalId) throw new ForbiddenException('No es tu sucursal');
    if (req.items.length === 0) throw new BadRequestException('No puedes enviar una requisicion vacia');

    return this.prisma.requisicion.update({
      where: { id },
      data: { estado: 'ENVIADA' },
      include: { sucursal: true, items: true },
    });
  }

  async approve(id: string): Promise<unknown> {
    const req = await this.prisma.requisicion.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Requisicion no encontrada');
    if (req.estado !== 'ENVIADA') throw new BadRequestException('Solo se pueden aprobar requisiciones enviadas');

    return this.prisma.requisicion.update({
      where: { id },
      data: { estado: 'APROBADA' },
      include: { sucursal: true },
    });
  }

  async reject(id: string, notas?: string): Promise<unknown> {
    const req = await this.prisma.requisicion.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Requisicion no encontrada');
    if (req.estado !== 'ENVIADA') throw new BadRequestException('Solo se pueden rechazar requisiciones enviadas');

    return this.prisma.requisicion.update({
      where: { id },
      data: { estado: 'RECHAZADA', notas: notas || req.notas },
      include: { sucursal: true },
    });
  }
}
