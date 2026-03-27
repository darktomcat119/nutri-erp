import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInsumoDto } from './dto/create-insumo.dto';
import { UpdateInsumoDto } from './dto/update-insumo.dto';

@Injectable()
export class InsumosService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { categoria?: string; proveedorId?: string }): Promise<unknown[]> {
    const where: Record<string, unknown> = { activo: true };
    if (query?.categoria) where.categoria = query.categoria;
    if (query?.proveedorId) where.proveedorId = query.proveedorId;
    return this.prisma.insumo.findMany({ where, include: { proveedor: true }, orderBy: { codigo: 'asc' } });
  }

  async findOne(id: string): Promise<unknown> {
    const insumo = await this.prisma.insumo.findUnique({ where: { id }, include: { proveedor: true } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    return insumo;
  }

  async create(dto: CreateInsumoDto): Promise<unknown> {
    const existing = await this.prisma.insumo.findUnique({ where: { codigo: dto.codigo } });
    if (existing) throw new ConflictException('El codigo de insumo ya existe');
    return this.prisma.insumo.create({ data: dto, include: { proveedor: true } });
  }

  async update(id: string, dto: UpdateInsumoDto): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.insumo.update({ where: { id }, data: dto, include: { proveedor: true } });
  }

  async remove(id: string): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.insumo.update({ where: { id }, data: { activo: false } });
  }
}
