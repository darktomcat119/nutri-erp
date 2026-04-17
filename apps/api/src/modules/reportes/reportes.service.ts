import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  async resumenSemanal(semana: string) {
    // 1. Find all OCs for this week with items
    const ordenesCompra = await this.prisma.ordenCompra.findMany({
      where: { semana },
      include: {
        items: true,
      },
    });

    // 2. Find all requisiciones for this week
    const requisiciones = await this.prisma.requisicion.findMany({
      where: { semana },
    });

    // 3. Find all entregas for this week's OCs
    const entregas = await this.prisma.ordenEntrega.findMany({
      where: {
        ordenCompra: { semana },
      },
    });

    // 4. Find all recepciones for this week's deliveries
    const recepciones = await this.prisma.recepcion.findMany({
      where: {
        ordenEntrega: {
          ordenCompra: { semana },
        },
      },
    });

    // 5. Calculate spending totals from purchased OC items
    let gastoTotal = 0;
    let gastoMos = 0;
    let gastoIns = 0;

    for (const oc of ordenesCompra) {
      for (const item of oc.items) {
        if (item.comprado && item.precioReal && item.cantidadComprada) {
          const total = Number(item.precioReal) * Number(item.cantidadComprada);
          gastoTotal += total;
          if (item.area === 'MOS') {
            gastoMos += total;
          } else {
            gastoIns += total;
          }
        }
      }
    }

    gastoTotal = Math.round(gastoTotal * 100) / 100;
    gastoMos = Math.round(gastoMos * 100) / 100;
    gastoIns = Math.round(gastoIns * 100) / 100;

    return {
      data: {
        totalRequisiciones: requisiciones.length,
        totalOC: ordenesCompra.length,
        totalEntregas: entregas.length,
        totalRecepciones: recepciones.length,
        gastoTotal,
        gastoMos,
        gastoIns,
      },
      message: 'Resumen semanal',
    };
  }

  async diferencias(semana: string) {
    // Find all RecepcionItems where the recepcion's OE's OC.semana matches
    // and diferencia != 0
    const recepcionItems = await this.prisma.recepcionItem.findMany({
      where: {
        recepcion: {
          ordenEntrega: {
            ordenCompra: { semana },
          },
        },
        NOT: {
          diferencia: 0,
        },
      },
      include: {
        producto: true,
        insumo: true,
        recepcion: {
          include: {
            sucursal: true,
          },
        },
      },
    });

    const items = recepcionItems.map((ri) => ({
      id: ri.id,
      area: ri.area,
      nombre: ri.producto?.nombre || ri.insumo?.nombre || 'Desconocido',
      cantidadEsperada: Number(ri.cantidadEsperada),
      cantidadRecibida: Number(ri.cantidadRecibida),
      diferencia: Number(ri.diferencia),
      sucursal: ri.recepcion.sucursal.nombre,
      sucursalId: ri.recepcion.sucursalId,
    }));

    return { data: items, message: 'Diferencias en recepciones' };
  }

  async gastosProveedor(semana: string) {
    // Find all OC items for this week where comprado=true
    const ocItems = await this.prisma.ordenCompraItem.findMany({
      where: {
        ordenCompra: { semana },
        comprado: true,
        precioReal: { not: null },
        cantidadComprada: { not: null },
      },
      include: {
        proveedor: true,
      },
    });

    // Group by proveedor
    const proveedorMap = new Map<
      string,
      { proveedor: { id: string; nombre: string }; total: number; itemCount: number }
    >();

    for (const item of ocItems) {
      const provId = item.proveedorId;
      const total = Number(item.precioReal) * Number(item.cantidadComprada);

      if (proveedorMap.has(provId)) {
        const entry = proveedorMap.get(provId)!;
        entry.total += total;
        entry.itemCount += 1;
      } else {
        proveedorMap.set(provId, {
          proveedor: { id: item.proveedor.id, nombre: item.proveedor.nombre },
          total,
          itemCount: 1,
        });
      }
    }

    // Convert to array sorted by total desc
    const result = Array.from(proveedorMap.values())
      .map((entry) => ({
        ...entry,
        total: Math.round(entry.total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);

    return { data: result, message: 'Gastos por proveedor' };
  }
}
