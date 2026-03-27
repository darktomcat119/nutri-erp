'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Platillo { id: string; nombre: string; costo: string; activo: boolean; }

const schema = z.object({
  nombre: z.string().min(2, 'Requerido'),
  costo: z.number().min(0, 'Minimo 0'),
});
type FormData = z.infer<typeof schema>;

export function PlatillosTable(): JSX.Element {
  const [data, setData] = useState<Platillo[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Platillo | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = useCallback(async (): Promise<void> => {
    try { const r = await api.get('/platillos'); setData(r.data.data); } catch { toast.error('Error al cargar'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = (): void => { setEditing(null); reset({ nombre: '', costo: 0 }); setOpen(true); };
  const openEdit = (p: Platillo): void => { setEditing(p); reset({ nombre: p.nombre, costo: Number(p.costo) }); setOpen(true); };
  const onSubmit = async (fd: FormData): Promise<void> => {
    try {
      if (editing) { await api.patch(`/platillos/${editing.id}`, fd); toast.success('Platillo actualizado'); }
      else { await api.post('/platillos', fd); toast.success('Platillo creado'); }
      setOpen(false); load();
    } catch { toast.error('Error al guardar'); }
  };
  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Desactivar?')) return;
    try { await api.delete(`/platillos/${id}`); toast.success('Desactivado'); load(); } catch { toast.error('Error'); }
  };

  const columns: ColumnDef<Platillo>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'costo', header: 'Costo', cell: ({ row }) => `$${Number(row.original.costo).toFixed(2)}` },
    { accessorKey: 'activo', header: 'Activo', cell: ({ row }) => <Badge variant={row.original.activo ? 'default' : 'secondary'}>{row.original.activo ? 'Si' : 'No'}</Badge> },
    { id: 'actions', header: 'Acciones', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    )},
  ];

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{data.length} platillos</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nuevo Platillo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar Platillo' : 'Nuevo Platillo'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2"><Label>Nombre</Label><Input {...register('nombre')} />{errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}</div>
              <div className="space-y-2"><Label>Costo por platillo</Label><Input type="number" step="0.01" {...register('costo', { valueAsNumber: true })} /></div>
              <Button type="submit" className="w-full">{editing ? 'Actualizar' : 'Crear'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>{table.getHeaderGroups().map((hg) => <TableRow key={hg.id}>{hg.headers.map((h) => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500">No hay platillos</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
    </div>
  );
}
