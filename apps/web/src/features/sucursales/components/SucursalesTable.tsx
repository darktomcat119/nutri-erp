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
import { Pencil, Plus, PowerOff, Power } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
  cafeteriaId: string | null;
  activa: boolean;
}

const schema = z.object({
  codigo: z.string().min(2, 'Minimo 2 caracteres'),
  nombre: z.string().min(3, 'Minimo 3 caracteres'),
  cafeteriaId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function SucursalesTable(): JSX.Element {
  const [data, setData] = useState<Sucursal[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sucursal | null>(null);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

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
    reset({ codigo: '', nombre: '', cafeteriaId: '' });
    setOpen(true);
  };

  const openEdit = (s: Sucursal): void => {
    setEditing(s);
    reset({ codigo: s.codigo, nombre: s.nombre, cafeteriaId: s.cafeteriaId || '' });
    setOpen(true);
  };

  const onSubmit = async (formData: FormData): Promise<void> => {
    const payload = {
      codigo: formData.codigo,
      nombre: formData.nombre,
      cafeteriaId: formData.cafeteriaId?.trim() || null,
    };
    try {
      if (editing) {
        await api.patch(`/sucursales/${editing.id}`, payload);
        toast.success('Sucursal actualizada');
      } else {
        await api.post('/sucursales', payload);
        toast.success('Sucursal creada');
      }
      setOpen(false);
      load();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleToggleActivo = async (id: string): Promise<void> => {
    try {
      await api.patch(`/sucursales/${id}/toggle-activo`);
      toast.success('Estado actualizado');
      load();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDeactivateConfirm = async (): Promise<void> => {
    if (!deactivateId) return;
    await handleToggleActivo(deactivateId);
    setDeactivateId(null);
  };

  const columns: ColumnDef<Sucursal>[] = [
    { accessorKey: 'codigo', header: 'Codigo' },
    { accessorKey: 'nombre', header: 'Nombre' },
    {
      accessorKey: 'cafeteriaId',
      header: 'OrderEat ID',
      cell: ({ row }) => row.original.cafeteriaId
        ? <span className="text-sm font-mono">{row.original.cafeteriaId}</span>
        : <span className="text-xs text-slate-400">—</span>,
    },
    {
      accessorKey: 'activa',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge
          variant={row.original.activa ? 'default' : 'destructive'}
          className={row.original.activa ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {row.original.activa ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
              <Pencil className="h-4 w-4" />
            </Button>
            {s.activa ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeactivateId(s.id)}
                title="Desactivar"
              >
                <PowerOff className="h-4 w-4 text-red-500" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleActivo(s.id)}
                title="Activar"
              >
                <Power className="h-4 w-4 text-green-500" />
              </Button>
            )}
          </div>
        );
      },
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
                <Input {...register('codigo')} placeholder="IPADE" />
                {errors.codigo && <p className="text-xs text-red-600">{errors.codigo.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input {...register('nombre')} placeholder="Nutri Cafeteria - Ciudad UP - IPADE" />
                {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>OrderEat Cafeteria ID <span className="text-xs text-slate-400">(opcional)</span></Label>
                <Input {...register('cafeteriaId')} placeholder="359" inputMode="numeric" />
                <p className="text-xs text-slate-400">ID numerico de la cafeteria en OrderEat. Requerido para sincronizar inventario/ventas.</p>
              </div>
              <Button type="submit" className="w-full">
                {editing ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border overflow-x-auto">
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
                <TableRow
                  key={row.id}
                  className={!row.original.activa ? 'opacity-50 bg-gray-50' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  No hay sucursales
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={(open) => { if (!open) setDeactivateId(null); }}
        onConfirm={handleDeactivateConfirm}
        title="Desactivar sucursal"
        description="Esta sucursal sera desactivada. Puedes reactivarla despues."
        confirmLabel="Desactivar"
      />
    </div>
  );
}
