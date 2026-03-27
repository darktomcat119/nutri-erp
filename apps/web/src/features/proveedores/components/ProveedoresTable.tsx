'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
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
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Proveedor {
  id: string;
  nombre: string;
  categoria: string | null;
  contacto: string | null;
  telefono: string | null;
  ordenRuta: number;
  activo: boolean;
}

const schema = z.object({
  nombre: z.string().min(2, 'Requerido'),
  categoria: z.string().optional().or(z.literal('')),
  contacto: z.string().optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  ordenRuta: z.number().int().min(0),
});

type FormData = z.infer<typeof schema>;

export function ProveedoresTable(): JSX.Element {
  const [data, setData] = useState<Proveedor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [filter, setFilter] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get('/proveedores');
      setData(res.data.data);
    } catch {
      toast.error('Error al cargar proveedores');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = (): void => {
    setEditing(null);
    reset({ nombre: '', categoria: '', contacto: '', telefono: '', ordenRuta: 0 });
    setOpen(true);
  };

  const openEdit = (p: Proveedor): void => {
    setEditing(p);
    reset({
      nombre: p.nombre,
      categoria: p.categoria || '',
      contacto: p.contacto || '',
      telefono: p.telefono || '',
      ordenRuta: p.ordenRuta,
    });
    setOpen(true);
  };

  const onSubmit = async (formData: FormData): Promise<void> => {
    try {
      const payload = {
        nombre: formData.nombre,
        categoria: formData.categoria || null,
        contacto: formData.contacto || null,
        telefono: formData.telefono || null,
        ordenRuta: formData.ordenRuta ?? 0,
      };
      if (editing) {
        await api.patch(`/proveedores/${editing.id}`, payload);
        toast.success('Proveedor actualizado');
      } else {
        await api.post('/proveedores', payload);
        toast.success('Proveedor creado');
      }
      setOpen(false);
      load();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Desactivar este proveedor?')) return;
    try {
      await api.delete(`/proveedores/${id}`);
      toast.success('Proveedor desactivado');
      load();
    } catch {
      toast.error('Error al desactivar');
    }
  };

  const columns: ColumnDef<Proveedor>[] = [
    {
      accessorKey: 'ordenRuta',
      header: '#Ruta',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.ordenRuta}</span>
      ),
    },
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'categoria', header: 'Categoria', cell: ({ row }) => row.original.categoria || '—' },
    { accessorKey: 'contacto', header: 'Contacto', cell: ({ row }) => row.original.contacto || '—' },
    { accessorKey: 'telefono', header: 'Telefono', cell: ({ row }) => row.original.telefono || '—' },
    {
      accessorKey: 'activo',
      header: 'Activo',
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? 'default' : 'secondary'}>
          {row.original.activo ? 'Si' : 'No'}
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

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar proveedores..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input {...register('nombre')} />
                {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input {...register('categoria')} placeholder="Autoservicio" />
                </div>
                <div className="space-y-2">
                  <Label>Orden Ruta</Label>
                  <Input type="number" {...register('ordenRuta')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contacto</Label>
                  <Input {...register('contacto')} />
                </div>
                <div className="space-y-2">
                  <Label>Telefono</Label>
                  <Input {...register('telefono')} />
                </div>
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
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  No hay proveedores
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-slate-500">{data.length} proveedores</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
