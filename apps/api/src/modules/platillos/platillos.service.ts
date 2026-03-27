import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatilloDto } from './dto/create-platillo.dto';
import { UpdatePlatilloDto } from './dto/update-platillo.dto';

@Injectable()
export class PlatillosService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<unknown[]> {
    return this.prisma.platillo.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string): Promise<unknown> {
    const platillo = await this.prisma.platillo.findUnique({ where: { id } });
    if (!platillo) throw new NotFoundException('Platillo no encontrado');
    return platillo;
  }

  async create(dto: CreatePlatilloDto): Promise<unknown> {
    const existing = await this.prisma.platillo.findUnique({ where: { nombre: dto.nombre } });
    if (existing) throw new ConflictException('El platillo ya existe');
    return this.prisma.platillo.create({ data: dto });
  }

  async update(id: string, dto: UpdatePlatilloDto): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.platillo.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.platillo.update({ where: { id }, data: { activo: false } });
  }
}
