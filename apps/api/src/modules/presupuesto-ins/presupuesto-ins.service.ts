import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdereatService } from '../ordereat/ordereat.service';
import { Decimal } from '@prisma/client/runtime/library';
import ExcelJS from 'exceljs';

type SaleItem = { producto: string; cantidadVendida: number };

@Injectable()
export class PresupuestoInsService {
  private readonly logger = new Logger(PresupuestoInsService.name);

  constructor(private prisma: PrismaService, private ordereat: OrdereatService) {}

  /**
   * Generate INS budget from a sales Excel file.
   */
  async generateFromSalesExcel(
    fileBuffer: Buffer,
    sucursalId: string,
    semana: string,
    fechaEjecucion: Date,
    userId: string,
  ) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer.buffer as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('Archivo sin hojas');

    let headerRow = 0;
    ws.eachRow((row, ri) => {
      const firstCell = String(row.getCell(1).value || '').trim();
      if (firstCell === 'Producto' && String(row.getCell(2).value || '').includes('Cantidad')) {
        headerRow = ri;
      }
    });
    if (!headerRow) throw new BadRequestException('No se encontro la fila de encabezados (Producto + Cantidad vendida)');

    const salesItems: SaleItem[] = [];
    ws.eachRow((row, ri) => {
      if (ri <= headerRow) return;
      const producto = String(row.getCell(1).value || '').trim();
      if (!producto || producto.startsWith('Descuento') || producto.startsWith('Total vendido')) return;
      salesItems.push({
        producto,
        cantidadVendida: Number(row.getCell(2).value) || 0,
      });
    });

    const periodoVentas = String(ws.getRow(1).getCell(1).value || '');
    return this.computeAndSave(sucursalId, semana, fechaEjecucion, userId, salesItems, periodoVentas, 'excel');
  }

  /**
   * Generate INS budget from OrderEat live sales API.
   * Rule: use the 7 previous FULL days — fechaEjecucion itself is NOT included.
   * Default window: [fechaEjecucion - 7 days, fechaEjecucion - 1 day] inclusive = 7 days.
   */
  async generateFromOrderEatLive(
    sucursalId: string,
    semana: string,
    fechaEjecucion: Date,
    userId: string,
    from?: Date,
    until?: Date,
  ) {
    const DAY = 24 * 60 * 60 * 1000;
    const untilDate = until ?? new Date(fechaEjecucion.getTime() - DAY);
    const fromDate = from ?? new Date(untilDate.getTime() - 6 * DAY);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const untilStr = untilDate.toISOString().slice(0, 10);

    const result = await this.ordereat.getSalesForSucursal(sucursalId, fromStr, untilStr);
    const items = result.data.items as Array<{ producto: string; cantidadVendida: number }>;
    const salesItems: SaleItem[] = items.map(i => ({ producto: i.producto, cantidadVendida: i.cantidadVendida }));
    const periodoVentas = `${fromStr} — ${untilStr} (live OrderEat)`;
    return this.computeAndSave(sucursalId, semana, fechaEjecucion, userId, salesItems, periodoVentas, 'api');
  }

  /**
   * Shared compute-and-save. Matches sold products against platillos, calculates total cost.
   */
  private async computeAndSave(
    sucursalId: string,
    semana: string,
    fechaEjecucion: Date,
    userId: string,
    salesItems: SaleItem[],
    periodoVentas: string,
    source: 'excel' | 'api',
  ) {
    const platillos = await this.prisma.platillo.findMany({ where: { activo: true } });
    const platilloMap = new Map(platillos.map((p) => [p.nombre.toLowerCase().trim(), p]));

    const productos = await this.prisma.producto.findMany({ where: { activo: true } });
    const productoMap = new Map(
      productos.map((p) => [(p.nombreSistema || p.nombre).toLowerCase().trim(), p]),
    );

    let montoCalculado = 0;
    const matched: Array<{
      productoVendido: string;
      cantidadVendida: number;
      costoPlatillo: number;
      subtotal: number;
    }> = [];
    const unmatched: string[] = [];

    for (const item of salesItems) {
      const key = item.producto.toLowerCase().trim();
      const platillo = platilloMap.get(key);
      const productoMos = productoMap.get(key);

      if (platillo) {
        const subtotal = item.cantidadVendida * Number(platillo.costo);
        montoCalculado += subtotal;
        matched.push({
          productoVendido: item.producto,
          cantidadVendida: item.cantidadVendida,
          costoPlatillo: Number(platillo.costo),
          subtotal,
        });
      } else if (!productoMos) {
        unmatched.push(item.producto);
      }
    }

    montoCalculado = Math.round(montoCalculado * 100) / 100;

    // Upsert by (semana, sucursalId) — wrapped in a transaction so the delete + create
    // cannot leave the presupuesto in a partial state if the insert fails.
    const detallesCreate = matched.map((m) => ({
      productoVendido: m.productoVendido,
      cantidadVendida: m.cantidadVendida,
      costoPlatillo: new Decimal(m.costoPlatillo.toFixed(2)),
      subtotal: new Decimal(m.subtotal.toFixed(2)),
      vinculado: true,
    }));
    const includeShape = {
      sucursal: true,
      generadoPor: { select: { id: true, nombre: true, email: true } },
      detalles: true,
    } as const;

    const presupuesto = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.presupuestoIns.findUnique({
        where: { semana_sucursalId: { semana, sucursalId } },
      });
      if (existing) {
        if (existing.estado === 'APROBADO') {
          throw new BadRequestException(
            'No se puede regenerar un presupuesto ya aprobado. Rechazalo primero.',
          );
        }
        await tx.presupuestoInsDetalle.deleteMany({
          where: { presupuestoInsId: existing.id },
        });
        return tx.presupuestoIns.update({
          where: { id: existing.id },
          data: {
            fechaEjecucion,
            periodoVentas,
            montoCalculado: new Decimal(montoCalculado.toFixed(2)),
            generadoPorId: userId,
            estado: 'BORRADOR',
            detalles: { create: detallesCreate },
          },
          include: includeShape,
        });
      }
      return tx.presupuestoIns.create({
        data: {
          semana,
          sucursalId,
          fechaEjecucion,
          periodoVentas,
          montoCalculado: new Decimal(montoCalculado.toFixed(2)),
          generadoPorId: userId,
          detalles: { create: detallesCreate },
        },
        include: includeShape,
      });
    });

    return {
      data: {
        presupuesto,
        resumen: {
          productosVinculados: matched.length,
          productosNoEncontrados: unmatched.length,
          noEncontrados: unmatched,
          montoCalculado,
          source,
        },
      },
      message: `Presupuesto INS generado desde ${source === 'api' ? 'OrderEat API' : 'Excel'}`,
    };
  }

  /**
   * List all INS budgets, optionally filtered by semana.
   */
  async findAll(semana?: string) {
    const where: Record<string, unknown> = {};
    if (semana) where.semana = semana;

    const presupuestos = await this.prisma.presupuestoIns.findMany({
      where,
      include: {
        sucursal: true,
        generadoPor: { select: { id: true, nombre: true, email: true } },
        _count: { select: { detalles: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: presupuestos, message: 'Presupuestos INS' };
  }

  /**
   * Get a single INS budget with all detalles.
   */
  async findOne(id: string) {
    const presupuesto = await this.prisma.presupuestoIns.findUnique({
      where: { id },
      include: {
        sucursal: true,
        generadoPor: { select: { id: true, nombre: true, email: true } },
        aprobadoPor: { select: { id: true, nombre: true, email: true } },
        detalles: true,
      },
    });
    if (!presupuesto) throw new NotFoundException('Presupuesto INS no encontrado');
    return { data: presupuesto, message: 'Detalle presupuesto INS' };
  }

  /**
   * Approve an INS budget. Optionally override the approved amount.
   */
  async approve(id: string, userId: string, montoAprobado?: number) {
    const presupuesto = await this.prisma.presupuestoIns.findUnique({ where: { id } });
    if (!presupuesto) throw new NotFoundException('Presupuesto INS no encontrado');
    if (presupuesto.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden aprobar presupuestos en estado BORRADOR');
    }

    const monto = montoAprobado != null
      ? new Decimal(montoAprobado.toFixed(2))
      : presupuesto.montoCalculado;

    const updated = await this.prisma.presupuestoIns.update({
      where: { id },
      data: {
        estado: 'APROBADO',
        aprobadoPorId: userId,
        montoAprobado: monto,
      },
      include: {
        sucursal: true,
        generadoPor: { select: { id: true, nombre: true } },
        aprobadoPor: { select: { id: true, nombre: true } },
      },
    });

    return { data: updated, message: 'Presupuesto INS aprobado' };
  }

  /**
   * Reject an INS budget with notes.
   */
  async reject(id: string, notas: string) {
    const presupuesto = await this.prisma.presupuestoIns.findUnique({ where: { id } });
    if (!presupuesto) throw new NotFoundException('Presupuesto INS no encontrado');
    if (presupuesto.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden rechazar presupuestos en estado BORRADOR');
    }

    const updated = await this.prisma.presupuestoIns.update({
      where: { id },
      data: {
        estado: 'RECHAZADO',
        notas,
      },
      include: { sucursal: true },
    });

    return { data: updated, message: 'Presupuesto INS rechazado' };
  }

  /**
   * Get the approved budget for a specific branch and week.
   */
  async getForBranch(semana: string, sucursalId: string) {
    const presupuesto = await this.prisma.presupuestoIns.findUnique({
      where: { semana_sucursalId: { semana, sucursalId } },
      include: {
        sucursal: true,
        detalles: true,
        generadoPor: { select: { id: true, nombre: true } },
        aprobadoPor: { select: { id: true, nombre: true } },
      },
    });

    if (!presupuesto || presupuesto.estado !== 'APROBADO') {
      return { data: null, message: 'No hay presupuesto INS aprobado para esta sucursal y semana' };
    }

    return { data: presupuesto, message: 'Presupuesto INS aprobado' };
  }
}
