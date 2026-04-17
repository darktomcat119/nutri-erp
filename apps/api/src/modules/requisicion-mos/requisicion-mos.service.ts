import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdereatService } from '../ordereat/ordereat.service';
import { Decimal } from '@prisma/client/runtime/library';
import ExcelJS from 'exceljs';

type InventoryItem = { producto: string; disponible: number; ordereatProductId?: number };

@Injectable()
export class RequisicionMosService {
  private readonly logger = new Logger(RequisicionMosService.name);

  constructor(private prisma: PrismaService, private ordereat: OrdereatService) {}

  /**
   * Generate a MOS requisition from an inventory Excel file.
   */
  async generateFromInventoryExcel(
    fileBuffer: Buffer,
    sucursalId: string,
    semana: string,
  ) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer.buffer as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new BadRequestException('Archivo sin hojas');

    let headerRow = 0;
    ws.eachRow((row, ri) => {
      const firstCell = String(row.getCell(1).value || '').trim();
      if (firstCell === 'Producto' && String(row.getCell(2).value || '').includes('Inventario')) {
        headerRow = ri;
      }
    });
    if (!headerRow) throw new BadRequestException('No se encontro la fila de encabezados (Producto + Inventario)');

    const inventoryItems: InventoryItem[] = [];
    ws.eachRow((row, ri) => {
      if (ri <= headerRow) return;
      const producto = String(row.getCell(1).value || '').trim();
      if (!producto) return;
      const disponible = Number(row.getCell(4).value) || Number(row.getCell(2).value) || 0;
      inventoryItems.push({ producto, disponible });
    });

    const fechaInventarioText = String(ws.getRow(1).getCell(1).value || '');
    return this.computeAndSave(sucursalId, semana, inventoryItems, { fechaInventarioTexto: fechaInventarioText, source: 'excel' });
  }

  /**
   * Generate a MOS requisition from OrderEat live API.
   */
  async generateFromOrderEatLive(sucursalId: string, semana: string) {
    const result = await this.ordereat.getInventoryForSucursal(sucursalId);
    const apiItems = result.data.items as Array<{ producto: string; disponible: number; productId: number }>;
    const inventoryItems: InventoryItem[] = apiItems.map(i => ({
      producto: i.producto,
      disponible: i.disponible,
      ordereatProductId: i.productId,
    }));
    return this.computeAndSave(sucursalId, semana, inventoryItems, { fechaInventarioTexto: `Live OrderEat — ${new Date().toISOString()}`, source: 'api' });
  }

  /**
   * Shared compute-and-save logic for both Excel and Live sources.
   * Matches inventory items against the productos catalog (by ordereatId first, then by name),
   * applies maxSemanal config, calculates purchase needs in displays, persists the requisicion.
   */
  private async computeAndSave(
    sucursalId: string,
    semana: string,
    inventoryItems: InventoryItem[],
    meta: { fechaInventarioTexto: string; source: 'excel' | 'api' },
  ) {
    const allProducts = await this.prisma.producto.findMany({ where: { activo: true } });
    const productByName = new Map<string, (typeof allProducts)[0]>();
    const productByOrdereatId = new Map<string, (typeof allProducts)[0]>();
    for (const p of allProducts) {
      productByName.set((p.nombreSistema || p.nombre).toLowerCase().trim(), p);
      if (p.nombreSistema) productByName.set(p.nombre.toLowerCase().trim(), p);
      if (p.ordereatId) productByOrdereatId.set(String(p.ordereatId), p);
    }

    const configs = await this.prisma.configSucursalProducto.findMany({
      where: { sucursalId },
      include: { producto: true },
    });
    const configMap = new Map(configs.map((c) => [c.productoId, c]));

    const purchases: Array<{
      productoId: string;
      productoNombre: string;
      inventarioActual: number;
      maximo: number;
      compraNecesaria: number;
      displaysAComprar: number;
      pzXDisplay: number;
      costoDisplay: number;
      dinero: number;
    }> = [];
    const unmatchedInventory: string[] = [];

    for (const inv of inventoryItems) {
      let producto = inv.ordereatProductId != null
        ? productByOrdereatId.get(String(inv.ordereatProductId))
        : undefined;
      if (!producto) {
        producto = productByName.get(inv.producto.toLowerCase().trim());
      }
      if (!producto) {
        unmatchedInventory.push(inv.producto);
        continue;
      }

      const config = configMap.get(producto.id);
      const maximo = config?.maxSemanal ?? 0;
      if (maximo <= 0) continue;

      const compraNecesaria = Math.max(0, maximo - inv.disponible);
      if (compraNecesaria <= 0) continue;

      const pzXDisplay = producto.pzXDisplay;
      const displaysAComprar = pzXDisplay > 0 ? Math.round(compraNecesaria / pzXDisplay) : 0;
      if (displaysAComprar <= 0) continue;

      const costoDisplay = Number(producto.costoDisplay);
      const dinero = displaysAComprar * costoDisplay;

      purchases.push({
        productoId: producto.id,
        productoNombre: producto.nombre,
        inventarioActual: inv.disponible,
        maximo,
        compraNecesaria,
        displaysAComprar,
        pzXDisplay,
        costoDisplay,
        dinero,
      });
    }

    const totalDisplays = purchases.reduce((sum, p) => sum + p.displaysAComprar, 0);
    const totalDinero = Math.round(purchases.reduce((sum, p) => sum + p.dinero, 0) * 100) / 100;

    // Upsert: one requisicion per (semana, sucursalId) pair
    const existing = await this.prisma.requisicionMos.findUnique({
      where: { semana_sucursalId: { semana, sucursalId } },
    });
    if (existing) {
      await this.prisma.requisicionMosItem.deleteMany({ where: { requisicionMosId: existing.id } });
    }

    const requisicion = existing
      ? await this.prisma.requisicionMos.update({
          where: { id: existing.id },
          data: {
            fechaInventario: new Date(),
            totalDisplays,
            totalDinero: new Decimal(totalDinero.toFixed(2)),
            estado: 'GENERADA',
            items: {
              create: purchases.map((p) => ({
                productoId: p.productoId,
                inventarioActual: p.inventarioActual,
                maximo: p.maximo,
                compraNecesaria: p.compraNecesaria,
                displaysAComprar: p.displaysAComprar,
                costoDisplay: new Decimal(p.costoDisplay.toFixed(2)),
                dinero: new Decimal(p.dinero.toFixed(2)),
              })),
            },
          },
          include: { sucursal: true, items: { include: { producto: true } } },
        })
      : await this.prisma.requisicionMos.create({
          data: {
            semana,
            sucursalId,
            fechaInventario: new Date(),
            totalDisplays,
            totalDinero: new Decimal(totalDinero.toFixed(2)),
            items: {
              create: purchases.map((p) => ({
                productoId: p.productoId,
                inventarioActual: p.inventarioActual,
                maximo: p.maximo,
                compraNecesaria: p.compraNecesaria,
                displaysAComprar: p.displaysAComprar,
                costoDisplay: new Decimal(p.costoDisplay.toFixed(2)),
                dinero: new Decimal(p.dinero.toFixed(2)),
              })),
            },
          },
          include: { sucursal: true, items: { include: { producto: true } } },
        });

    return {
      data: {
        requisicion,
        resumen: {
          totalProductos: purchases.length,
          totalDisplays,
          totalDinero,
          productosNoVinculados: unmatchedInventory.length,
          noVinculados: unmatchedInventory,
          fechaInventarioTexto: meta.fechaInventarioTexto,
          source: meta.source,
        },
      },
      message: `Requisicion MOS generada desde ${meta.source === 'api' ? 'OrderEat API' : 'Excel'}`,
    };
  }

  /**
   * List all MOS requisitions, optionally filtered by semana.
   */
  async findAll(semana?: string) {
    const where: Record<string, unknown> = {};
    if (semana) where.semana = semana;

    const requisiciones = await this.prisma.requisicionMos.findMany({
      where,
      include: {
        sucursal: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: requisiciones, message: 'Requisiciones MOS' };
  }

  /**
   * Get a single MOS requisition with all items.
   */
  async findOne(id: string) {
    const requisicion = await this.prisma.requisicionMos.findUnique({
      where: { id },
      include: {
        sucursal: true,
        items: {
          include: { producto: true },
        },
      },
    });
    if (!requisicion) throw new NotFoundException('Requisicion MOS no encontrada');
    return { data: requisicion, message: 'Detalle requisicion MOS' };
  }

  /**
   * Get MOS requisition for a specific branch and week.
   */
  async getForBranch(semana: string, sucursalId: string) {
    const requisicion = await this.prisma.requisicionMos.findUnique({
      where: { semana_sucursalId: { semana, sucursalId } },
      include: {
        sucursal: true,
        items: {
          include: { producto: true },
        },
      },
    });

    if (!requisicion) {
      return { data: null, message: 'No hay requisicion MOS para esta sucursal y semana' };
    }

    return { data: requisicion, message: 'Requisicion MOS' };
  }

  /**
   * Encargado suggests a change to a specific item (quantity override).
   */
  async suggestChange(itemId: string, sugerencia: string, cantidadFinal: number) {
    const item = await this.prisma.requisicionMosItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item de requisicion MOS no encontrado');

    const updated = await this.prisma.requisicionMosItem.update({
      where: { id: itemId },
      data: {
        sugerenciaEncargado: sugerencia,
        cantidadFinal,
      },
      include: { producto: true },
    });

    // Also update the parent requisicion estado to REVISADA if it was GENERADA
    const requisicion = await this.prisma.requisicionMos.findUnique({
      where: { id: item.requisicionMosId },
    });
    if (requisicion && requisicion.estado === 'GENERADA') {
      await this.prisma.requisicionMos.update({
        where: { id: item.requisicionMosId },
        data: { estado: 'REVISADA' },
      });
    }

    return { data: updated, message: 'Sugerencia registrada' };
  }

  /**
   * Approve a MOS requisition.
   */
  async approve(id: string) {
    const requisicion = await this.prisma.requisicionMos.findUnique({ where: { id } });
    if (!requisicion) throw new NotFoundException('Requisicion MOS no encontrada');
    if (requisicion.estado === 'APROBADA') {
      throw new BadRequestException('Esta requisicion ya fue aprobada');
    }

    const updated = await this.prisma.requisicionMos.update({
      where: { id },
      data: { estado: 'APROBADA' },
      include: {
        sucursal: true,
        items: { include: { producto: true } },
      },
    });

    return { data: updated, message: 'Requisicion MOS aprobada' };
  }
}
