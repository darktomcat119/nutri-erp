'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableContainer,
} from '@/components/ui/table';
import { SortableHeader } from '@/components/ui/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Pencil, Plus, Search, PowerOff, Power, Store, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface Proveedor {
  id: string;
  nombre: string;
  categoria: string | null;
  contacto: string | null;
  telefono: string | null;
  centroCompras: string | null;
  ordenRuta: number;
  activo: boolean;
}

const createSchema = z.object({
  nombre: z.string().min(2, 'Requerido'),
  categoria: z.string().optional().or(z.literal('')),
  contacto: z.string().optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  centroCompras: z.string().optional().or(z.literal('')),
});

const editSchema = createSchema.extend({
  ordenRuta: z.number().int().min(0).optional(),
});

type FormData = z.infer<typeof editSchema>;

export function ProveedoresTable(): JSX.Element {
  const [data, setData] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [filter, setFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Proveedor | null>(null);
  const [hardDeleteCheck, setHardDeleteCheck] = useState<{
    canDelete: boolean;
    blockers: Record<string, number>;
  } | null>(null);
  const [hardDeleteLoading, setHardDeleteLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(editSchema),
  });

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.get('/proveedores');
      setData(res.data.data);
    } catch {
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = (): void => {
    setEditing(null);
    reset({ nombre: '', categoria: '', contacto: '', telefono: '', centroCompras: '' });
    setOpen(true);
  };

  const openEdit = (p: Proveedor): void => {
    setEditing(p);
    reset({
      nombre: p.nombre,
      categoria: p.categoria || '',
      contacto: p.contacto || '',
      telefono: p.telefono || '',
      centroCompras: p.centroCompras || '',
      ordenRuta: p.ordenRuta,
    });
    setOpen(true);
  };

  const onSubmit = async (formData: FormData): Promise<void> => {
    try {
      if (editing) {
        const payload = {
          nombre: formData.nombre,
          categoria: formData.categoria || null,
          contacto: formData.contacto || null,
          telefono: formData.telefono || null,
          centroCompras: formData.centroCompras || null,
          ordenRuta: formData.ordenRuta ?? editing.ordenRuta,
        };
        await api.patch(`/proveedores/${editing.id}`, payload);
        toast.success('Proveedor actualizado');
      } else {
        const payload: Record<string, unknown> = {
          nombre: formData.nombre,
          categoria: formData.categoria || null,
          contacto: formData.contacto || null,
          telefono: formData.telefono || null,
          centroCompras: formData.centroCompras || null,
        };
        await api.post('/proveedores', payload);
        toast.success('Proveedor creado');
      }
      setOpen(false);
      load();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleToggleActivo = async (id: string): Promise<void> => {
    try {
      await api.patch(`/proveedores/${id}/toggle-activo`);
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

  const openHardDelete = async (p: Proveedor): Promise<void> => {
    setHardDeleteTarget(p);
    setHardDeleteCheck(null);
    try {
      const r = await api.get(`/proveedores/${p.id}/check-hard-delete`);
      setHardDeleteCheck(r.data.data || r.data);
    } catch {
      toast.error('No se pudo verificar el historial');
      setHardDeleteTarget(null);
    }
  };

  const handleHardDeleteConfirm = async (): Promise<void> => {
    if (!hardDeleteTarget) return;
    setHardDeleteLoading(true);
    try {
      await api.delete(`/proveedores/${hardDeleteTarget.id}/hard`);
      toast.success('Proveedor eliminado permanentemente');
      setHardDeleteTarget(null);
      setHardDeleteCheck(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(text || 'Error al eliminar');
    } finally {
      setHardDeleteLoading(false);
    }
  };

  const columns: ColumnDef<Proveedor>[] = [
    {
      accessorKey: 'ordenRuta',
      header: ({ column }) => <SortableHeader column={column}>#Ruta</SortableHeader>,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.ordenRuta}</span>,
    },
    {
      accessorKey: 'nombre',
      header: ({ column }) => <SortableHeader column={column}>Nombre</SortableHeader>,
    },
    {
      accessorKey: 'categoria',
      header: ({ column }) => <SortableHeader column={column}>Categoria</SortableHeader>,
      cell: ({ row }) => row.original.categoria || '—',
    },
    {
      accessorKey: 'centroCompras',
      header: 'Centro de Compras',
      cell: ({ row }) => row.original.centroCompras || '—',
    },
    {
      accessorKey: 'contacto',
      header: 'Contacto',
      cell: ({ row }) => row.original.contacto || '—',
    },
    {
      accessorKey: 'telefono',
      header: 'Telefono',
      cell: ({ row }) => row.original.telefono || '—',
    },
    {
      accessorKey: 'activo',
      header: ({ column }) => <SortableHeader column={column}>Estado</SortableHeader>,
      cell: ({ row }) => (
        <Badge
          variant={row.original.activo ? 'default' : 'destructive'}
          className={row.original.activo ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {row.original.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => openEdit(p)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {p.activo ? (
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => setDeactivateId(p.id)}
                title="Desactivar"
              >
                <PowerOff className="h-4 w-4 text-red-500" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => handleToggleActivo(p.id)}
                title="Activar"
              >
                <Power className="h-4 w-4 text-green-500" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] hover:bg-red-100 hover:text-red-700"
              onClick={() => openHardDelete(p)}
              title="Eliminar permanentemente"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter: filter, sorting },
    onGlobalFilterChange: setFilter,
    onSortingChange: setSorting,
    initialState: {
      pagination: { pageSize: 20 },
      sorting: [{ id: 'ordenRuta', desc: false }],
    },
  });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative w-full sm:w-64">
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
            <Button onClick={openCreate} className="w-full sm:w-auto min-h-[44px]">
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
                  <Label>Centro de Compras</Label>
                  <Input {...register('centroCompras')} placeholder="Central de Abastos" />
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
              {editing && (
                <div className="space-y-2">
                  <Label>Orden Ruta</Label>
                  <Input type="number" {...register('ordenRuta', { valueAsNumber: true })} />
                  {errors.ordenRuta && (
                    <p className="text-xs text-red-600">{errors.ordenRuta.message}</p>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full min-h-[44px]">
                {editing ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <TableContainer maxHeight="calc(100vh - 320px)">
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
            {loading ? (
              <TableSkeletonRows rows={8} cols={columns.length} />
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={!row.original.activo ? 'opacity-50 bg-gray-50' : ''}
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
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState icon={Store} title="No hay proveedores" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-slate-500">{data.length} proveedores</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={(open) => {
          if (!open) setDeactivateId(null);
        }}
        onConfirm={handleDeactivateConfirm}
        title="Desactivar proveedor"
        description="Este proveedor sera desactivado y no aparecera en futuras ordenes de compra. Puedes reactivarlo despues."
        confirmLabel="Desactivar"
      />

      <Dialog
        open={!!hardDeleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setHardDeleteTarget(null);
            setHardDeleteCheck(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar permanentemente</DialogTitle>
          </DialogHeader>
          {!hardDeleteCheck ? (
            <div className="py-8 text-center text-slate-500">
              <Loader2 className="h-6 w-6 mx-auto animate-spin" />
            </div>
          ) : hardDeleteCheck.canDelete ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Se eliminara permanentemente al proveedor{' '}
                <span className="font-semibold">{hardDeleteTarget?.nombre}</span>.
              </p>
              <p className="text-xs text-slate-500">
                Este proveedor no tiene productos, insumos ni movimientos asociados. Esta accion no
                se puede deshacer.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setHardDeleteTarget(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleHardDeleteConfirm}
                  disabled={hardDeleteLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {hardDeleteLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Eliminar permanentemente
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                No se puede eliminar permanentemente a{' '}
                <span className="font-semibold">{hardDeleteTarget?.nombre}</span> porque tiene
                registros asociados:
              </p>
              <ul className="text-sm text-slate-600 space-y-1 rounded-md bg-slate-50 border p-3">
                {Object.entries(hardDeleteCheck.blockers)
                  .filter(([, n]) => n > 0)
                  .map(([key, n]) => (
                    <li key={key} className="flex justify-between">
                      <span className="capitalize">{key}</span>
                      <span className="font-semibold">{n}</span>
                    </li>
                  ))}
              </ul>
              <p className="text-xs text-slate-500">
                Para preservar la trazabilidad, usa el boton de <b>Desactivar</b> en su lugar.
              </p>
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setHardDeleteTarget(null)}>
                  Entendido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
