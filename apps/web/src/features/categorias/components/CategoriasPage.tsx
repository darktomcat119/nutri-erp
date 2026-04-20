'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Pencil, Plus, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface Categoria {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

const TABS = [
  { key: 'MOS', label: 'Mostrador (MOS)' },
  { key: 'INS', label: 'Insumos (INS)' },
] as const;

export function CategoriasPage(): JSX.Element {
  const [tab, setTab] = useState<string>('MOS');
  const [data, setData] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState('');
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [toggleCategoria, setToggleCategoria] = useState<Categoria | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.get(`/categorias?tipo=${tab}`);
      setData(res.data.data || res.data || []);
    } catch {
      toast.error('Error al cargar categorias');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = (): void => {
    setEditing(null);
    setNombre('');
    setOpen(true);
  };

  const openEdit = (cat: Categoria): void => {
    setEditing(cat);
    setNombre(cat.nombre);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!nombre.trim() || nombre.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres');
      return;
    }
    try {
      if (editing) {
        await api.patch(`/categorias/${editing.id}`, { nombre: nombre.trim() });
        toast.success('Categoria actualizada');
      } else {
        await api.post('/categorias', { nombre: nombre.trim(), tipo: tab });
        toast.success('Categoria creada');
      }
      setOpen(false);
      load();
    } catch {
      toast.error('Error al guardar categoria');
    }
  };

  const handleToggle = async (): Promise<void> => {
    if (!toggleId) return;
    try {
      await api.patch(`/categorias/${toggleId}/toggle-activo`);
      toast.success('Estado actualizado');
      load();
    } catch {
      toast.error('Error al cambiar estado');
    } finally {
      setToggleId(null);
      setToggleCategoria(null);
    }
  };

  const filtered = data;

  const columns: ColumnDef<Categoria>[] = [
    {
      accessorKey: 'nombre',
      header: ({ column }) => <SortableHeader column={column}>Nombre</SortableHeader>,
      cell: ({ row }) => <span className="font-medium">{row.original.nombre}</span>,
    },
    {
      accessorKey: 'tipo',
      header: ({ column }) => <SortableHeader column={column}>Tipo</SortableHeader>,
      cell: ({ row }) => row.original.tipo,
    },
    {
      accessorKey: 'activo',
      header: ({ column }) => <SortableHeader column={column}>Estado</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? 'default' : 'secondary'}>
          {row.original.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setToggleId(cat.id);
                setToggleCategoria(cat);
              }}
              title={cat.activo ? 'Desactivar' : 'Activar'}
            >
              {cat.activo ? (
                <ToggleRight className="h-4 w-4 text-green-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-slate-400" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
    initialState: {
      sorting: [{ id: 'nombre', desc: false }],
    },
  });

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'default' : 'outline'}
            onClick={() => setTab(t.key)}
            className="min-w-[140px]"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <p className="text-sm text-slate-500">{filtered.length} categorias</p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Categoria
        </Button>
      </div>

      {/* Table */}
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
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState icon={Tag} title="No hay categorias" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Categoria' : 'Nueva Categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre de la categoria"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">
              {editing ? 'Actualizar' : 'Crear'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toggle Confirm Dialog */}
      <ConfirmDialog
        open={!!toggleId}
        onOpenChange={(open) => {
          if (!open) {
            setToggleId(null);
            setToggleCategoria(null);
          }
        }}
        onConfirm={handleToggle}
        title={toggleCategoria?.activo ? 'Desactivar categoria' : 'Activar categoria'}
        description={
          toggleCategoria?.activo
            ? `La categoria "${toggleCategoria?.nombre}" sera desactivada y no aparecera en los selectores de productos/insumos.`
            : `La categoria "${toggleCategoria?.nombre}" sera activada y volvera a aparecer en los selectores.`
        }
        confirmLabel={toggleCategoria?.activo ? 'Desactivar' : 'Activar'}
      />
    </div>
  );
}
