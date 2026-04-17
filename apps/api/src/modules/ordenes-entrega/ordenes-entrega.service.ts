import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createPdfDocument,
  drawHeader,
  drawInfoRow,
  drawTable,
  drawFooter,
  PdfTableColumn,
} from '../../common/utils/pdf.utils';

@Injectable()
export class OrdenesEntregaService {
  constructor(private prisma: PrismaService) {}

  async generar(ordenCompraId: string): Promise<unknown> {
    // 1. Find completed OC with items
    const oc = await this.prisma.ordenCompra.findUnique({
      where: { id: ordenCompraId },
      include: {
        items: {
          include: {
            producto: true,
            insumo: true,
          },
        },
      },
    });

    if (!oc) throw new NotFoundException('Orden de compra no encontrada');
    if (oc.estado !== 'COMPLETADA') {
      throw new BadRequestException('Solo se pueden generar entregas desde ordenes completadas');
    }

    // 2. Find all approved requisitions for the same week, group items by sucursalId
    const requisiciones = await this.prisma.requisicion.findMany({
      where: { semana: oc.semana, estado: 'APROBADA' },
      include: {
        items: true,
      },
    });

    if (requisiciones.length === 0) {
      throw new BadRequestException('No hay requisiciones aprobadas para esta semana');
    }

    // Build a map: sucursalId -> requisition items
    const sucursalItems = new Map<string, Array<{ area: string; productoId: string | null; insumoId: string | null; cantidadSolicitada: number }>>();
    // Also track total requested per product/insumo across all branches
    const totalRequested = new Map<string, number>();

    for (const req of requisiciones) {
      if (!sucursalItems.has(req.sucursalId)) {
        sucursalItems.set(req.sucursalId, []);
      }

      for (const item of req.items) {
        const key = item.productoId ? `P-${item.productoId}` : `I-${item.insumoId}`;
        const qty = Number(item.cantidadSolicitada);

        sucursalItems.get(req.sucursalId)!.push({
          area: item.area,
          productoId: item.productoId,
          insumoId: item.insumoId,
          cantidadSolicitada: qty,
        });

        totalRequested.set(key, (totalRequested.get(key) || 0) + qty);
      }
    }

    // Build a map of OC items by product/insumo key for quick lookup
    const ocItemMap = new Map<string, { cantidadComprada: number }>();
    for (const item of oc.items) {
      const key = item.productoId ? `P-${item.productoId}` : `I-${item.insumoId}`;
      ocItemMap.set(key, {
        cantidadComprada: item.cantidadComprada ? Number(item.cantidadComprada) : 0,
      });
    }

    // 3. For each branch, create OrdenEntrega with items
    const createdEntregas = [];

    for (const [sucursalId, items] of sucursalItems.entries()) {
      const entregaItems = items.map((reqItem) => {
        const key = reqItem.productoId ? `P-${reqItem.productoId}` : `I-${reqItem.insumoId}`;
        const ocItem = ocItemMap.get(key);
        const totalReq = totalRequested.get(key) || 0;

        let cantidadAsignada = 0;

        if (ocItem && ocItem.cantidadComprada > 0 && totalReq > 0) {
          if (ocItem.cantidadComprada >= totalReq) {
            // Fully purchased: assign what the branch requested
            cantidadAsignada = reqItem.cantidadSolicitada;
          } else {
            // Partially purchased: distribute proportionally
            cantidadAsignada = (reqItem.cantidadSolicitada / totalReq) * ocItem.cantidadComprada;
          }
        }
        // If not purchased (no ocItem or cantidadComprada is 0): cantidadAsignada stays 0

        return {
          area: reqItem.area as 'MOS' | 'INS',
          productoId: reqItem.productoId,
          insumoId: reqItem.insumoId,
          cantidadAsignada: new Decimal(cantidadAsignada.toFixed(2)),
        };
      });

      const entrega = await this.prisma.ordenEntrega.create({
        data: {
          ordenCompraId,
          sucursalId,
          items: { create: entregaItems },
        },
        include: {
          items: {
            include: { producto: true, insumo: true },
          },
          sucursal: true,
        },
      });

      createdEntregas.push(entrega);
    }

    return { data: createdEntregas, message: 'Ordenes de entrega generadas' };
  }

  async findAll(query?: { sucursalId?: string; semana?: string }): Promise<unknown> {
    const where: Record<string, unknown> = {};
    if (query?.sucursalId) where.sucursalId = query.sucursalId;
    if (query?.semana) where.ordenCompra = { semana: query.semana };

    const entregas = await this.prisma.ordenEntrega.findMany({
      where,
      include: {
        sucursal: true,
        ordenCompra: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: entregas, message: 'Ordenes de entrega obtenidas' };
  }

  async findOne(id: string): Promise<unknown> {
    const entrega = await this.prisma.ordenEntrega.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: true,
            insumo: true,
          },
        },
        sucursal: true,
        ordenCompra: true,
      },
    });

    if (!entrega) throw new NotFoundException('Orden de entrega no encontrada');

    return { data: entrega, message: 'Orden de entrega obtenida' };
  }

  async generatePdf(id: string): Promise<Buffer> {
    const result = await this.findOne(id);
    const delivery = (result as Record<string, unknown>).data as Record<string, unknown>;

    const sucursal = delivery.sucursal as Record<string, unknown>;
    const ordenCompra = delivery.ordenCompra as Record<string, unknown>;
    const items = delivery.items as Array<Record<string, unknown>>;

    const doc = createPdfDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    drawHeader(doc, 'Orden de Entrega', `Sucursal: ${sucursal.nombre}`);

    drawInfoRow(doc, 'Sucursal', String(sucursal.nombre));
    drawInfoRow(doc, 'Semana', String(ordenCompra.semana));
    drawInfoRow(doc, 'Fecha', new Date(delivery.createdAt as string).toLocaleDateString('es-MX'));
    drawInfoRow(doc, 'OC Folio', String(ordenCompra.folio));
    doc.moveDown(0.5);

    const columns: PdfTableColumn[] = [
      { header: 'Area', key: 'area', width: 60 },
      { header: 'Producto / Insumo', key: 'nombre', width: 300 },
      { header: 'Cantidad Asignada', key: 'cantAsignada', width: 172, align: 'right' },
    ];

    const rows = items.map((item) => {
      const producto = item.producto as Record<string, unknown> | null;
      const insumo = item.insumo as Record<string, unknown> | null;
      const nombre = producto ? String(producto.nombre) : insumo ? String(insumo.nombre) : '—';
      return {
        area: String(item.area),
        nombre,
        cantAsignada: Number(item.cantidadAsignada).toFixed(2),
      };
    });

    drawTable(doc, columns, rows);

    drawFooter(doc);
    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
