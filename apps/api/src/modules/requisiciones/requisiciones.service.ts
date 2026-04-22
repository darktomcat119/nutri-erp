import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequisicionDto } from './dto/create-requisicion.dto';
import { UpdateRequisicionDto } from './dto/update-requisicion.dto';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

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

    return this.prisma.requisicion.create({
      data: {
        semana: dto.semana,
        sucursalId: user.sucursalId,
        creadoPorId: user.sub,
        area,
        notas: dto.notas,
        items: {
          create: dto.items.map((item) => ({
            area: item.area,
            productoId: item.productoId || null,
            insumoId: item.insumoId || null,
            cantidadSolicitada: item.cantidadSolicitada,
            notas: item.notas,
          })),
        },
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

    if (dto.items) {
      await this.prisma.requisicionItem.deleteMany({ where: { requisicionId: id } });
    }

    return this.prisma.requisicion.update({
      where: { id },
      data: {
        notas: dto.notas,
        ...(dto.items && {
          items: {
            create: dto.items.map((item) => ({
              area: item.area,
              productoId: item.productoId || null,
              insumoId: item.insumoId || null,
              cantidadSolicitada: item.cantidadSolicitada,
              notas: item.notas,
            })),
          },
        }),
      },
      include: {
        sucursal: true,
        items: { include: { producto: true, insumo: true } },
      },
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
