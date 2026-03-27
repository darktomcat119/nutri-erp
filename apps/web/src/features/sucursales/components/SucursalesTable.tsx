'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
  activa: boolean;
}

const schema = z.object({
  codigo: z.string().min(2, 'Minimo 2 caracteres'),
  nombre: z.string().min(3, 'Minimo 3 caracteres'),
});

type FormData = z.infer<typeof schema>;

export function SucursalesTable(): JSX.Element {
  const [data, setData] = useState<Sucursal[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sucursal | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get('/sucursales');
      setData(res.data.data);
    } catch {
      toast.error('Error al cargar sucursales');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = (): void => {
    setEditing(null);
    reset({ codigo: '', nombre: '' });
    setOpen(true);
  };

  const openEdit = (s: Sucursal): void => {
    setEditing(s);
    reset({ codigo: s.codigo, nombre: s.nombre });
    setOpen(true);
  };

  const onSubmit = async (formData: FormData): Promise<void> => {
    try {
      if (editing) {
        await api.patch(`/sucursales/${editing.id}`, formData);
        toast.success('Sucursal actualizada');
      } else {
        await api.post('/sucursales', formData);
        toast.success('Sucursal creada');
      }
      setOpen(false);
      load();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Desactivar esta sucursal?')) return;
    try {
      await api.delete(`/sucursales/${id}`);
      toast.success('Sucursal desactivada');
      load();
    } catch {
      toast.error('Error al desactivar');
    }
  };

  const columns: ColumnDef<Sucursal>[] = [
    { accessorKey: 'codigo', header: 'Codigo' },
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      accessorKey: 'activa',
      header: 'Activa',
      cell: ({ row }) => (
        <Badge variant={row.original.activa ? 'default' : 'secondary'}>
          {row.original.activa ? 'Si' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{data.length} sucursales</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nueva Sucursal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Sucursal' : 'Nueva Sucursal'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Codigo</Label>
                <Input {...register('codigo')} placeholder="CDUP" />
                {errors.codigo && <p className="text-xs text-red-600">{errors.codigo.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input {...register('nombre')} placeholder="Campus Deportivo" />
                {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
              </div>
              <Button type="submit" className="w-full">
                {editing ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                  No hay sucursales
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
