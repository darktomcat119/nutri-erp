'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Producto {
  id: string; codigo: string; nombre: string; nombreSistema: string | null;
  categoria: string | null; marca: string | null; pzXDisplay: number;
  costoDisplay: string; costoUnitario: string; ordereatId: string | null;
  activo: boolean; proveedor: { id: string; nombre: string };
}

interface Proveedor { id: string; nombre: string; }

const schema = z.object({
  codigo: z.string().min(1, 'Requerido'),
  nombre: z.string().min(1, 'Requerido'),
  nombreSistema: z.string().optional().or(z.literal('')),
  categoria: z.string().optional().or(z.literal('')),
  marca: z.string().optional().or(z.literal('')),
  pzXDisplay: z.number().int().min(1, 'Minimo 1'),
  costoDisplay: z.number().min(0),
  costoUnitario: z.number().min(0),
  proveedorId: z.string().min(1, 'Selecciona proveedor'),
  ordereatId: z.string().optional().or(z.literal('')),
});
type FormData = z.infer<typeof schema>;

export function ProductosTable(): JSX.Element {
  const [data, setData] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [filter, setFilter] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = useCallback(async (): Promise<void> => {
    try {
      const [prodRes, provRes] = await Promise.all([api.get('/productos'), api.get('/proveedores')]);
      setData(prodRes.data.data);
      setProveedores(provRes.data.data);
    } catch { toast.error('Error al cargar datos'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = (): void => {
    setEditing(null);
    reset({ codigo: '', nombre: '', nombreSistema: '', categoria: '', marca: '', pzXDisplay: 1, costoDisplay: 0, costoUnitario: 0, proveedorId: '', ordereatId: '' });
    setOpen(true);
  };

  const openEdit = (p: Producto): void => {
    setEditing(p);
    reset({
      codigo: p.codigo, nombre: p.nombre, nombreSistema: p.nombreSistema || '',
      categoria: p.categoria || '', marca: p.marca || '', pzXDisplay: p.pzXDisplay,
      costoDisplay: Number(p.costoDisplay), costoUnitario: Number(p.costoUnitario),
      proveedorId: p.proveedor.id, ordereatId: p.ordereatId || '',
    });
    setOpen(true);
  };

  const onSubmit = async (fd: FormData): Promise<void> => {
    try {
      const payload = {
        ...fd,
        nombreSistema: fd.nombreSistema || null,
        categoria: fd.categoria || null,
        marca: fd.marca || null,
        ordereatId: fd.ordereatId || null,
      };
      if (editing) {
        await api.patch(`/productos/${editing.id}`, payload);
        toast.success('Producto actualizado');
      } else {
        await api.post('/productos', payload);
        toast.success('Producto creado');
      }
      setOpen(false); load();
    } catch { toast.error('Error al guardar'); }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Desactivar este producto?')) return;
    try { await api.delete(`/productos/${id}`); toast.success('Producto desactivado'); load(); }
    catch { toast.error('Error al desactivar'); }
  };

  const columns: ColumnDef<Producto>[] = [
    { accessorKey: 'codigo', header: 'Codigo' },
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'categoria', header: 'Categoria', cell: ({ row }) => row.original.categoria || '—' },
    { accessorKey: 'marca', header: 'Marca', cell: ({ row }) => row.original.marca || '—' },
    { accessorKey: 'pzXDisplay', header: 'Pz/Display' },
    { id: 'proveedor', header: 'Proveedor', cell: ({ row }) => row.original.proveedor?.nombre || '—' },
    { accessorKey: 'costoDisplay', header: 'Costo Display', cell: ({ row }) => `$${Number(row.original.costoDisplay).toFixed(2)}` },
    { accessorKey: 'costoUnitario', header: 'Costo Unit.', cell: ({ row }) => `$${Number(row.original.costoUnitario).toFixed(2)}` },
    {
      id: 'actions', header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data, columns, getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter: filter }, onGlobalFilterChange: setFilter,
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar productos..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nuevo Producto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Codigo</Label>
                  <Input {...register('codigo')} placeholder="MO-021" />
                  {errors.codigo && <p className="text-xs text-red-600">{errors.codigo.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input {...register('nombre')} />
                  {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre Sistema (OrderEat)</Label>
                  <Input {...register('nombreSistema')} />
                </div>
                <div className="space-y-2">
                  <Label>ID OrderEat</Label>
                  <Input {...register('ordereatId')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input {...register('categoria')} placeholder="GALLETAS" />
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input {...register('marca')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={watch('proveedorId')} onValueChange={(v) => setValue('proveedorId', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.proveedorId && <p className="text-xs text-red-600">{errors.proveedorId.message}</p>}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Pz/Display</Label>
                  <Input type="number" {...register('pzXDisplay', { valueAsNumber: true })} />
                  {errors.pzXDisplay && <p className="text-xs text-red-600">{errors.pzXDisplay.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Costo Display</Label>
                  <Input type="number" step="0.01" {...register('costoDisplay', { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Costo Unitario</Label>
                  <Input type="number" step="0.01" {...register('costoUnitario', { valueAsNumber: true })} />
                </div>
              </div>
              <Button type="submit" className="w-full">{editing ? 'Actualizar' : 'Crear'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">No hay productos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-slate-500">{data.length} productos</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
        </div>
      </div>
    </div>
  );
}
