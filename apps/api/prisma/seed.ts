import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // ── Branches ──
  const cdup = await prisma.sucursal.upsert({
    where: { codigo: 'CDUP' },
    update: {},
    create: { codigo: 'CDUP', nombre: 'Campus Deportivo Universitario Poniente' },
  });
  const nsm = await prisma.sucursal.upsert({
    where: { codigo: 'NSM' },
    update: {},
    create: { codigo: 'NSM', nombre: 'Nutri San Miguel' },
  });
  console.log('Branches created:', cdup.codigo, nsm.codigo);

  // ── Users ──
  const hash = async (pw: string): Promise<string> => bcrypt.hash(pw, 10);

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
    where: { email: 'encargado.cdup@nutri.com' },
    update: {},
    create: {
      email: 'encargado.cdup@nutri.com',
      passwordHash: await hash('Encargado123!'),
      nombre: 'Encargado CDUP',
      role: Role.ENCARGADO,
      sucursalId: cdup.id,
    },
  });
  await prisma.usuario.upsert({
    where: { email: 'encargado.nsm@nutri.com' },
    update: {},
    create: {
      email: 'encargado.nsm@nutri.com',
      passwordHash: await hash('Encargado123!'),
      nombre: 'Encargado NSM',
      role: Role.ENCARGADO,
      sucursalId: nsm.id,
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
  console.log('Users created');

  // ── Suppliers (15 from real data) ──
  const suppliers = [
    { nombre: 'Costco', categoria: 'Autoservicio', ordenRuta: 1 },
    { nombre: 'Sam\'s Club', categoria: 'Autoservicio', ordenRuta: 2 },
    { nombre: 'Drinks Depot', categoria: 'Bebidas', ordenRuta: 3 },
    { nombre: 'HS', categoria: 'Bebidas', ordenRuta: 4 },
    { nombre: 'Casa Eddy', categoria: 'Cremeria', ordenRuta: 5 },
    { nombre: 'Carne Merced', categoria: 'Carnes', ordenRuta: 6 },
    { nombre: 'Chef Club', categoria: 'Abarrotes', ordenRuta: 7 },
    { nombre: 'Ana Machorro', categoria: 'Verduras', ordenRuta: 8 },
    { nombre: 'Harus', categoria: 'Desechables', ordenRuta: 9 },
    { nombre: 'Central de Abastos', categoria: 'Verduras', ordenRuta: 10 },
    { nombre: 'Bodega Aurrera', categoria: 'Autoservicio', ordenRuta: 11 },
    { nombre: 'Panaderia La Esperanza', categoria: 'Panaderia', ordenRuta: 12 },
    { nombre: 'Tortilleria Don Jose', categoria: 'Tortilleria', ordenRuta: 13 },
    { nombre: 'Lala Distribuidora', categoria: 'Lacteos', ordenRuta: 14 },
    { nombre: 'Agua Bonafont', categoria: 'Bebidas', ordenRuta: 15 },
  ];

  for (const s of suppliers) {
    await prisma.proveedor.upsert({
      where: { nombre: s.nombre },
      update: {},
      create: s,
    });
  }
  console.log('Suppliers created:', suppliers.length);

  // ── Get supplier references for products ──
  const costco = await prisma.proveedor.findUnique({ where: { nombre: 'Costco' } });
  const drinks = await prisma.proveedor.findUnique({ where: { nombre: 'Drinks Depot' } });
  const hs = await prisma.proveedor.findUnique({ where: { nombre: 'HS' } });
  const sams = await prisma.proveedor.findUnique({ where: { nombre: 'Sam\'s Club' } });
  const eddy = await prisma.proveedor.findUnique({ where: { nombre: 'Casa Eddy' } });
  const merced = await prisma.proveedor.findUnique({ where: { nombre: 'Carne Merced' } });
  const chef = await prisma.proveedor.findUnique({ where: { nombre: 'Chef Club' } });
  const ana = await prisma.proveedor.findUnique({ where: { nombre: 'Ana Machorro' } });
  const harus = await prisma.proveedor.findUnique({ where: { nombre: 'Harus' } });

  // ── Products (MOS) — 20 from real data ──
  const products = [
    { codigo: 'MO-001', nombre: 'GALLETA CHOCOCHIP', nombreSistema: 'GALLETA CHOCOCHIP', categoria: 'GALLETAS', marca: 'Gamesa', pzXDisplay: 12, costoDisplay: 48.00, costoUnitario: 4.00, proveedorId: costco!.id, ordereatId: '126934' },
    { codigo: 'MO-002', nombre: 'GALLETA PRINCIPE', nombreSistema: 'GALLETA PRINCIPE', categoria: 'GALLETAS', marca: 'Marinela', pzXDisplay: 12, costoDisplay: 54.00, costoUnitario: 4.50, proveedorId: costco!.id, ordereatId: '126935' },
    { codigo: 'MO-003', nombre: 'GANSITO', nombreSistema: 'GANSITO', categoria: 'PASTELITOS', marca: 'Marinela', pzXDisplay: 8, costoDisplay: 56.00, costoUnitario: 7.00, proveedorId: costco!.id, ordereatId: '126936' },
    { codigo: 'MO-004', nombre: 'COCA COLA 355ML', nombreSistema: 'COCA COLA 355ML', categoria: 'BEBIDAS', marca: 'Coca-Cola', pzXDisplay: 24, costoDisplay: 192.00, costoUnitario: 8.00, proveedorId: drinks!.id, ordereatId: '126937' },
    { codigo: 'MO-005', nombre: 'JUGO JUMEX MANGO', nombreSistema: 'JUGO JUMEX MANGO', categoria: 'BEBIDAS', marca: 'Jumex', pzXDisplay: 24, costoDisplay: 144.00, costoUnitario: 6.00, proveedorId: drinks!.id, ordereatId: '126938' },
    { codigo: 'MO-006', nombre: 'AGUA NATURAL 500ML', nombreSistema: 'AGUA NATURAL 500ML', categoria: 'BEBIDAS', marca: 'Bonafont', pzXDisplay: 24, costoDisplay: 96.00, costoUnitario: 4.00, proveedorId: drinks!.id, ordereatId: '126939' },
    { codigo: 'MO-007', nombre: 'SABRITAS ORIGINAL', nombreSistema: 'SABRITAS ORIGINAL', categoria: 'FRITURAS', marca: 'Sabritas', pzXDisplay: 12, costoDisplay: 72.00, costoUnitario: 6.00, proveedorId: costco!.id, ordereatId: '126940' },
    { codigo: 'MO-008', nombre: 'DORITOS NACHO', nombreSistema: 'DORITOS NACHO', categoria: 'FRITURAS', marca: 'Sabritas', pzXDisplay: 12, costoDisplay: 72.00, costoUnitario: 6.00, proveedorId: costco!.id, ordereatId: '126941' },
    { codigo: 'MO-009', nombre: 'BOING GUAYABA', nombreSistema: 'BOING GUAYABA', categoria: 'BEBIDAS', marca: 'Boing', pzXDisplay: 24, costoDisplay: 120.00, costoUnitario: 5.00, proveedorId: hs!.id, ordereatId: '126942' },
    { codigo: 'MO-010', nombre: 'YOGURT DANONE FRESA', nombreSistema: 'YOGURT DANONE FRESA', categoria: 'LACTEOS', marca: 'Danone', pzXDisplay: 8, costoDisplay: 64.00, costoUnitario: 8.00, proveedorId: sams!.id, ordereatId: '126943' },
    { codigo: 'MO-011', nombre: 'PALETA HELADA FRESA', nombreSistema: 'PALETA HELADA FRESA', categoria: 'CONGELADOS', marca: 'Holanda', pzXDisplay: 20, costoDisplay: 100.00, costoUnitario: 5.00, proveedorId: costco!.id, ordereatId: '126944' },
    { codigo: 'MO-012', nombre: 'MAZAPAN DE LA ROSA', nombreSistema: 'MAZAPAN DE LA ROSA', categoria: 'DULCES', marca: 'De La Rosa', pzXDisplay: 30, costoDisplay: 60.00, costoUnitario: 2.00, proveedorId: costco!.id, ordereatId: '126945' },
    { codigo: 'MO-013', nombre: 'EMPERADOR CHOCOLATE', nombreSistema: 'EMPERADOR CHOCOLATE', categoria: 'GALLETAS', marca: 'Gamesa', pzXDisplay: 12, costoDisplay: 60.00, costoUnitario: 5.00, proveedorId: costco!.id, ordereatId: '126946' },
    { codigo: 'MO-014', nombre: 'CHOCORROL', nombreSistema: 'CHOCORROL', categoria: 'PASTELITOS', marca: 'Marinela', pzXDisplay: 8, costoDisplay: 48.00, costoUnitario: 6.00, proveedorId: costco!.id, ordereatId: '126947' },
    { codigo: 'MO-015', nombre: 'SPRITE 355ML', nombreSistema: 'SPRITE 355ML', categoria: 'BEBIDAS', marca: 'Coca-Cola', pzXDisplay: 24, costoDisplay: 192.00, costoUnitario: 8.00, proveedorId: drinks!.id, ordereatId: '126948' },
    { codigo: 'MO-016', nombre: 'POWERADE 500ML', nombreSistema: 'POWERADE 500ML', categoria: 'BEBIDAS', marca: 'Coca-Cola', pzXDisplay: 12, costoDisplay: 120.00, costoUnitario: 10.00, proveedorId: drinks!.id, ordereatId: '126949' },
    { codigo: 'MO-017', nombre: 'BARRITAS FRESA', nombreSistema: 'BARRITAS FRESA', categoria: 'GALLETAS', marca: 'Marinela', pzXDisplay: 12, costoDisplay: 48.00, costoUnitario: 4.00, proveedorId: sams!.id, ordereatId: '126950' },
    { codigo: 'MO-018', nombre: 'SANDWICH HELADO', nombreSistema: 'SANDWICH HELADO', categoria: 'CONGELADOS', marca: 'Holanda', pzXDisplay: 16, costoDisplay: 128.00, costoUnitario: 8.00, proveedorId: costco!.id, ordereatId: '126951' },
    { codigo: 'MO-019', nombre: 'TAKIS FUEGO', nombreSistema: 'TAKIS FUEGO', categoria: 'FRITURAS', marca: 'Barcel', pzXDisplay: 12, costoDisplay: 84.00, costoUnitario: 7.00, proveedorId: costco!.id, ordereatId: '126952' },
    { codigo: 'MO-020', nombre: 'JUGO DEL VALLE NARANJA', nombreSistema: 'JUGO DEL VALLE NARANJA', categoria: 'BEBIDAS', marca: 'Del Valle', pzXDisplay: 24, costoDisplay: 168.00, costoUnitario: 7.00, proveedorId: hs!.id, ordereatId: '126953' },
  ];

  for (const p of products) {
    await prisma.producto.upsert({
      where: { codigo: p.codigo },
      update: {},
      create: p,
    });
  }
  console.log('Products (MOS) created:', products.length);

  // ── Ingredients (INS) — 15 from real data ──
  const insumos = [
    { codigo: 'IN-001', nombre: 'JITOMATE BOLA', categoria: 'VERDURAS', unidad: 'kg', presentacion: 'Por kilo', costoUnitario: 28.00, proveedorId: ana!.id },
    { codigo: 'IN-002', nombre: 'CEBOLLA BLANCA', categoria: 'VERDURAS', unidad: 'kg', presentacion: 'Por kilo', costoUnitario: 18.00, proveedorId: ana!.id },
    { codigo: 'IN-003', nombre: 'LECHUGA ROMANA', categoria: 'VERDURAS', unidad: 'pza', presentacion: 'Pieza', costoUnitario: 15.00, proveedorId: ana!.id },
    { codigo: 'IN-004', nombre: 'PECHUGA DE POLLO', categoria: 'CARNES', unidad: 'kg', presentacion: 'Por kilo', costoUnitario: 89.00, proveedorId: merced!.id },
    { codigo: 'IN-005', nombre: 'CARNE MOLIDA RES', categoria: 'CARNES', unidad: 'kg', presentacion: 'Por kilo', costoUnitario: 125.00, proveedorId: merced!.id },
    { codigo: 'IN-006', nombre: 'JAMON DE PAVO', categoria: 'EMBUTIDOS', unidad: 'kg', presentacion: 'Por kilo', costoUnitario: 78.00, proveedorId: eddy!.id },
    { codigo: 'IN-007', nombre: 'QUESO OAXACA', categoria: 'LACTEOS', unidad: 'kg', presentacion: 'Por kilo', costoUnitario: 95.00, proveedorId: eddy!.id },
    { codigo: 'IN-008', nombre: 'PAN BLANCO BIMBO', categoria: 'PANADERIA', unidad: 'pza', presentacion: 'Paquete grande', costoUnitario: 52.00, proveedorId: chef!.id },
    { codigo: 'IN-009', nombre: 'TORTILLA MAIZ', categoria: 'TORTILLERIA', unidad: 'kg', presentacion: 'Por kilo', costoUnitario: 20.00, proveedorId: chef!.id },
    { codigo: 'IN-010', nombre: 'ACEITE VEGETAL 1L', categoria: 'ABARROTES', unidad: 'pza', presentacion: 'Botella 1L', costoUnitario: 32.00, proveedorId: chef!.id },
    { codigo: 'IN-011', nombre: 'ARROZ GRANO LARGO', categoria: 'ABARROTES', unidad: 'kg', presentacion: 'Por kilo', costoUnitario: 22.00, proveedorId: chef!.id },
    { codigo: 'IN-012', nombre: 'FRIJOL NEGRO', categoria: 'ABARROTES', unidad: 'kg', presentacion: 'Por kilo', costoUnitario: 28.00, proveedorId: chef!.id },
    { codigo: 'IN-013', nombre: 'VASO DESECHABLE 12OZ', categoria: 'DESECHABLES', unidad: 'pza', presentacion: 'Paquete 50 pzas', costoUnitario: 45.00, proveedorId: harus!.id },
    { codigo: 'IN-014', nombre: 'PLATO DESECHABLE', categoria: 'DESECHABLES', unidad: 'pza', presentacion: 'Paquete 25 pzas', costoUnitario: 35.00, proveedorId: harus!.id },
    { codigo: 'IN-015', nombre: 'SERVILLETAS', categoria: 'DESECHABLES', unidad: 'pza', presentacion: 'Paquete 500 hojas', costoUnitario: 28.00, proveedorId: harus!.id },
  ];

  for (const i of insumos) {
    await prisma.insumo.upsert({
      where: { codigo: i.codigo },
      update: {},
      create: i,
    });
  }
  console.log('Ingredients (INS) created:', insumos.length);

  // ── Dishes (for INS budget) ──
  const platillos = [
    { nombre: 'Sandwich Jamon', costo: 25.00 },
    { nombre: 'Quesadilla Pollo', costo: 30.00 },
    { nombre: 'Torta Milanesa', costo: 35.00 },
    { nombre: 'Ensalada Cesar', costo: 28.00 },
    { nombre: 'Arroz con Pollo', costo: 32.00 },
  ];

  for (const p of platillos) {
    await prisma.platillo.upsert({
      where: { nombre: p.nombre },
      update: {},
      create: p,
    });
  }
  console.log('Dishes created:', platillos.length);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
