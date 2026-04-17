import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database (minimal initial data)...');
  const hash = async (pw: string): Promise<string> => bcrypt.hash(pw, 10);

  // ══════════════════════════════════════════
  // 1. BRANCHES — real client cafeterias, cafeteriaId populated.
  //    Admin can add/edit/remove via UI afterwards.
  // ══════════════════════════════════════════
  const branches = [
    { codigo: 'IPADE', nombre: 'Nutri Cafeteria - Ciudad UP - IPADE', cafeteriaId: '359' },
    { codigo: 'AVALON', nombre: 'Nutri Cafeteria - Avalon International School', cafeteriaId: '360' },
    { codigo: 'NORTHRIDGE', nombre: 'Northridge School - Nutri Cafeterias', cafeteriaId: '798' },
  ];
  for (const b of branches) {
    await prisma.sucursal.upsert({ where: { codigo: b.codigo }, update: { nombre: b.nombre, cafeteriaId: b.cafeteriaId }, create: b });
  }
  console.log(`✓ Branches: ${branches.length} (${branches.map(b => b.codigo).join(', ')})`);

  // ══════════════════════════════════════════
  // 2. CORE USERS — admin, supervisor, chofer. Branch-bound users created via UI.
  // ══════════════════════════════════════════
  await prisma.usuario.upsert({
    where: { email: 'admin@nutri.com' },
    update: {},
    create: {
      email: 'admin@nutri.com',
      passwordHash: await hash('Admin123!'),
      nombre: 'Administrador General',
      role: Role.ADMIN,
    },
  });
  await prisma.usuario.upsert({
    where: { email: 'supervisor@nutri.com' },
    update: {},
    create: {
      email: 'supervisor@nutri.com',
      passwordHash: await hash('Super123!'),
      nombre: 'Supervisor Compras',
      role: Role.SUPERVISOR,
    },
  });
  await prisma.usuario.upsert({
    where: { email: 'chofer@nutri.com' },
    update: {},
    create: {
      email: 'chofer@nutri.com',
      passwordHash: await hash('Chofer123!'),
      nombre: 'Chofer Compras',
      role: Role.CHOFER,
    },
  });
  console.log('✓ Core users: admin, supervisor, chofer');

  console.log('\n═══════════════════════════════════');
  console.log('Seed complete.');
  console.log('Login as admin@nutri.com / Admin123! then configure tokens, sucursales, usuarios, proveedores, productos, etc. via the UI.');
  console.log('═══════════════════════════════════');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
