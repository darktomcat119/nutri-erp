'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, type ColumnDef,
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

interface Insumo {
  id: string; codigo: string; nombre: string; categoria: string | null;
  unidad: string; presentacion: string | null; costoUnitario: string;
  activo: boolean; proveedor: { id: string; nombre: string };
}
interface Proveedor { id: string; nombre: string; }

const schema = z.object({
  codigo: z.string().min(1, 'Requerido'),
  nombre: z.string().min(1, 'Requerido'),
  categoria: z.string().optional().or(z.literal('')),
  unidad: z.string().min(1, 'Requerido'),
  presentacion: z.string().optional().or(z.literal('')),
  costoUnitario: z.number().min(0),
  proveedorId: z.string().min(1, 'Selecciona proveedor'),
});
type FormData = z.infer<typeof schema>;

export function InsumosTable(): JSX.Element {
  const [data, setData] = useState<Insumo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | null>(null);
  const [filter, setFilter] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = useCallback(async (): Promise<void> => {
    try {
      const [r1, r2] = await Promise.all([api.get('/insumos'), api.get('/proveedores')]);
      setData(r1.data.data); setProveedores(r2.data.data);
    } catch { toast.error('Error al cargar datos'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = (): void => {
    setEditing(null);
    reset({ codigo: '', nombre: '', categoria: '', unidad: 'kg', presentacion: '', costoUnitario: 0, proveedorId: '' });
    setOpen(true);
  };
  const openEdit = (i: Insumo): void => {
    setEditing(i);
    reset({ codigo: i.codigo, nombre: i.nombre, categoria: i.categoria || '', unidad: i.unidad, presentacion: i.presentacion || '', costoUnitario: Number(i.costoUnitario), proveedorId: i.proveedor.id });
    setOpen(true);
  };
  const onSubmit = async (fd: FormData): Promise<void> => {
    try {
      const payload = { ...fd, categoria: fd.categoria || null, presentacion: fd.presentacion || null };
      if (editing) { await api.patch(`/insumos/${editing.id}`, payload); toast.success('Insumo actualizado'); }
      else { await api.post('/insumos', payload); toast.success('Insumo creado'); }
      setOpen(false); load();
    } catch { toast.error('Error al guardar'); }
  };
  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Desactivar este insumo?')) return;
    try { await api.delete(`/insumos/${id}`); toast.success('Insumo desactivado'); load(); } catch { toast.error('Error'); }
  };

  const columns: ColumnDef<Insumo>[] = [
    { accessorKey: 'codigo', header: 'Codigo' },
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'categoria', header: 'Categoria', cell: ({ row }) => row.original.categoria || '—' },
    { accessorKey: 'unidad', header: 'Unidad' },
    { accessorKey: 'presentacion', header: 'Presentacion', cell: ({ row }) => row.original.presentacion || '—' },
    { id: 'proveedor', header: 'Proveedor', cell: ({ row }) => row.original.proveedor?.nombre || '—' },
    { accessorKey: 'costoUnitario', header: 'Costo', cell: ({ row }) => `$${Number(row.original.costoUnitario).toFixed(2)}` },
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

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), state: { globalFilter: filter }, onGlobalFilterChange: setFilter });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar insumos..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nuevo Insumo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar Insumo' : 'Nuevo Insumo'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Codigo</Label><Input {...register('codigo')} />{errors.codigo && <p className="text-xs text-red-600">{errors.codigo.message}</p>}</div>
                <div className="space-y-2"><Label>Nombre</Label><Input {...register('nombre')} />{errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Categoria</Label><Input {...register('categoria')} /></div>
                <div className="space-y-2"><Label>Unidad</Label><Input {...register('unidad')} placeholder="kg, pza, lt" />{errors.unidad && <p className="text-xs text-red-600">{errors.unidad.message}</p>}</div>
                <div className="space-y-2"><Label>Presentacion</Label><Input {...register('presentacion')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select value={watch('proveedorId')} onValueChange={(v) => setValue('proveedorId', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>{proveedores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.proveedorId && <p className="text-xs text-red-600">{errors.proveedorId.message}</p>}
                </div>
                <div className="space-y-2"><Label>Costo Unitario</Label><Input type="number" step="0.01" {...register('costoUnitario', { valueAsNumber: true })} /></div>
              </div>
              <Button type="submit" className="w-full">{editing ? 'Actualizar' : 'Crear'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>{table.getHeaderGroups().map((hg) => <TableRow key={hg.id}>{hg.headers.map((h) => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">No hay insumos</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-slate-500">{data.length} insumos</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
        </div>
      </div>
    </div>
  );
}
