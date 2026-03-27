import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';

@Injectable()
export class SucursalesService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<unknown[]> {
    return this.prisma.sucursal.findMany({
      where: { activa: true },
      orderBy: { codigo: 'asc' },
    });
  }

  async findOne(id: string): Promise<unknown> {
    const sucursal = await this.prisma.sucursal.findUnique({ where: { id } });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
    return sucursal;
  }

  async create(dto: CreateSucursalDto): Promise<unknown> {
    const existing = await this.prisma.sucursal.findUnique({
      where: { codigo: dto.codigo },
    });
    if (existing) throw new ConflictException('El codigo de sucursal ya existe');

    return this.prisma.sucursal.create({ data: dto });
  }

  async update(id: string, dto: UpdateSucursalDto): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.sucursal.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<unknown> {
    await this.findOne(id);
    return this.prisma.sucursal.update({
      where: { id },
      data: { activa: false },
    });
  }
}
