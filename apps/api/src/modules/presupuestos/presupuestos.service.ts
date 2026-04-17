import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePresupuestoDto } from './dto/create-presupuesto.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PresupuestosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const presupuestos = await this.prisma.presupuestoSemanal.findMany({
      include: { sucursal: true },
      orderBy: { semana: 'desc' },
    });

    return { data: presupuestos, message: 'Presupuestos semanales' };
  }

  async upsert(dto: CreatePresupuestoDto) {
    const presupuesto = await this.prisma.presupuestoSemanal.upsert({
      where: {
        semana_sucursalId: {
          semana: dto.semana,
          sucursalId: dto.sucursalId,
        },
      },
      update: {
        presupuestoMos: new Decimal(dto.presupuestoMos.toFixed(2)),
        presupuestoIns: new Decimal(dto.presupuestoIns.toFixed(2)),
      },
      create: {
        semana: dto.semana,
        sucursalId: dto.sucursalId,
        presupuestoMos: new Decimal(dto.presupuestoMos.toFixed(2)),
        presupuestoIns: new Decimal(dto.presupuestoIns.toFixed(2)),
      },
      include: { sucursal: true },
    });

    return { data: presupuesto, message: 'Presupuesto guardado' };
  }

  async cerrarSemana(semana: string, userId: string, notas?: string) {
    // Check if already closed
    const existing = await this.prisma.semanaCerrada.findUnique({ where: { semana } });
    if (existing) throw new ConflictException('Esta semana ya fue cerrada');

    const cerrada = await this.prisma.semanaCerrada.create({
      data: { semana, cerradoPorId: userId, notas },
      include: { cerradoPor: { select: { nombre: true, email: true } } },
    });
    return { data: cerrada, message: 'Semana cerrada exitosamente' };
  }

  async reabrirSemana(semana: string) {
    const existing = await this.prisma.semanaCerrada.findUnique({ where: { semana } });
    if (!existing) throw new NotFoundException('Semana no encontrada');
    await this.prisma.semanaCerrada.delete({ where: { semana } });
    return { data: null, message: 'Semana reabierta' };
  }

  async isCerrada(semana: string) {
    const cerrada = await this.prisma.semanaCerrada.findUnique({
      where: { semana },
      include: { cerradoPor: { select: { nombre: true } } },
    });
    return { data: { cerrada: !!cerrada, detalle: cerrada }, message: 'Estado de semana' };
  }

  async getSemanasСerradas() {
    const semanas = await this.prisma.semanaCerrada.findMany({
      include: { cerradoPor: { select: { nombre: true } } },
      orderBy: { semana: 'desc' },
    });
    return { data: semanas, message: 'Semanas cerradas' };
  }

  async getBudgetVsActual(semana: string, sucursalId: string) {
    // 1. Find presupuesto record (or return zeros)
    const presupuesto = await this.prisma.presupuestoSemanal.findUnique({
      where: {
        semana_sucursalId: { semana, sucursalId },
      },
      include: { sucursal: true },
    });

    const presupuestoMos = presupuesto ? Number(presupuesto.presupuestoMos) : 0;
    const presupuestoIns = presupuesto ? Number(presupuesto.presupuestoIns) : 0;

    // 2. Find all OC items for this week that are comprado=true, sum by area
    const ocItems = await this.prisma.ordenCompraItem.findMany({
      where: {
        ordenCompra: { semana },
        comprado: true,
        precioReal: { not: null },
        cantidadComprada: { not: null },
      },
      select: {
        area: true,
        precioReal: true,
        cantidadComprada: true,
      },
    });

    let gastoRealMos = 0;
    let gastoRealIns = 0;

    for (const item of ocItems) {
      const total = Number(item.precioReal) * Number(item.cantidadComprada);
      if (item.area === 'MOS') {
        gastoRealMos += total;
      } else {
        gastoRealIns += total;
      }
    }

    // Round to 2 decimals
    gastoRealMos = Math.round(gastoRealMos * 100) / 100;
    gastoRealIns = Math.round(gastoRealIns * 100) / 100;

    const diferenciaMos = Math.round((presupuestoMos - gastoRealMos) * 100) / 100;
    const diferenciaIns = Math.round((presupuestoIns - gastoRealIns) * 100) / 100;

    const porcentajeMos = presupuestoMos > 0
      ? Math.round((gastoRealMos / presupuestoMos) * 10000) / 100
      : 0;
    const porcentajeIns = presupuestoIns > 0
      ? Math.round((gastoRealIns / presupuestoIns) * 10000) / 100
      : 0;

    return {
      data: {
        presupuesto: presupuesto || {
          semana,
          sucursalId,
          presupuestoMos: 0,
          presupuestoIns: 0,
        },
        gastoReal: { mos: gastoRealMos, ins: gastoRealIns },
        diferencia: { mos: diferenciaMos, ins: diferenciaIns },
        porcentaje: { mos: porcentajeMos, ins: porcentajeIns },
      },
      message: 'Presupuesto vs gasto real',
    };
  }
}
