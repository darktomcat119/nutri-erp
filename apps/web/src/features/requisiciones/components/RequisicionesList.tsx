'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { SortableHeader } from '@/components/ui/sortable-header';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface Requisicion {
  id: string;
  semana: string;
  estado: string;
  notas: string | null;
  createdAt: string;
  sucursal: { codigo: string; nombre: string };
  creadoPor: { nombre: string };
  _count: { items: number };
}

interface ReqDetail {
  id: string;
  semana: string;
  estado: string;
  notas: string | null;
  sucursal: { codigo: string; nombre: string };
  items: Array<{
    id: string;
    area: string;
    cantidadSolicitada: string;
    notas: string | null;
    producto: { nombre: string; codigo: string } | null;
    insumo: { nombre: string; codigo: string } | null;
  }>;
}

const estadoBadge: Record<string, string> = {
  BORRADOR: 'bg-slate-100 text-slate-700',
  ENVIADA: 'bg-amber-100 text-amber-700',
  APROBADA: 'bg-emerald-100 text-emerald-700',
  RECHAZADA: 'bg-red-100 text-red-700',
};

export function RequisicionesList(): JSX.Element {
  const [data, setData] = useState<Requisicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [semana, setSemana] = useState('');
  const [estado, setEstado] = useState('');
  const [detail, setDetail] = useState<ReqDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNotas, setRejectNotas] = useState('');
  const [approveId, setApproveId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (semana) params.set('semana', semana);
      if (estado) params.set('estado', estado);
      const r = await api.get(`/requisiciones?${params.toString()}`);
      setData(r.data.data);
    } catch {
      toast.error('Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [semana, estado]);
  useEffect(() => {
    load();
  }, [load]);

  const viewDetail = async (id: string): Promise<void> => {
    try {
      const r = await api.get(`/requisiciones/${id}`);
      setDetail(r.data.data);
      setDetailOpen(true);
    } catch {
      toast.error('Error al cargar detalle');
    }
  };

  const approve = async (): Promise<void> => {
    if (!approveId) return;
    try {
      await api.post(`/requisiciones/${approveId}/aprobar`);
      toast.success('Requisicion aprobada');
      load();
      setDetailOpen(false);
    } catch {
      toast.error('Error al aprobar');
    } finally {
      setApproveId(null);
    }
  };

  const reject = async (): Promise<void> => {
    if (!rejectId) return;
    try {
      await api.post(`/requisiciones/${rejectId}/rechazar`, { notas: rejectNotas });
      toast.success('Requisicion rechazada');
      load();
      setDetailOpen(false);
    } catch {
      toast.error('Error al rechazar');
    } finally {
      setRejectId(null);
      setRejectNotas('');
    }
  };

  const columns: ColumnDef<Requisicion>[] = [
    {
      accessorKey: 'semana',
      header: ({ column }) => <SortableHeader column={column}>Semana</SortableHeader>,
    },
    {
      id: 'sucursal.codigo',
      accessorFn: (row) => row.sucursal.codigo,
      header: ({ column }) => <SortableHeader column={column}>Sucursal</SortableHeader>,
      cell: ({ row }) => row.original.sucursal.codigo,
    },
    { id: 'items', header: 'Items', cell: ({ row }) => row.original._count.items },
    {
      id: 'creadoPor.nombre',
      accessorFn: (row) => row.creadoPor.nombre,
      header: ({ column }) => <SortableHeader column={column}>Creado por</SortableHeader>,
      cell: ({ row }) => row.original.creadoPor.nombre,
    },
    {
      accessorKey: 'estado',
      header: ({ column }) => <SortableHeader column={column}>Estado</SortableHeader>,
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[row.original.estado] || ''}`}
        >
          {row.original.estado}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column}>Fecha</SortableHeader>,
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('es-MX'),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => viewDetail(row.original.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.estado === 'ENVIADA' && (
            <>
              <Button variant="ghost" size="icon" onClick={() => setApproveId(row.original.id)}>
                <Check className="h-4 w-4 text-emerald-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setRejectId(row.original.id)}>
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    initialState: { sorting: [{ id: 'createdAt', desc: true }] },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-4">
        <Input
          placeholder="Semana (ej: 2026-W12)"
          value={semana}
          onChange={(e) => setSemana(e.target.value)}
          className="w-full sm:w-48"
        />
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="BORRADOR">Borrador</SelectItem>
            <SelectItem value="ENVIADA">Enviada</SelectItem>
            <SelectItem value="APROBADA">Aprobada</SelectItem>
            <SelectItem value="RECHAZADA">Rechazada</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-slate-500 sm:ml-auto">{data.length} requisiciones</p>
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
                  <EmptyState icon={FileText} title="No hay requisiciones" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              Requisicion — {detail?.sucursal.codigo} — {detail?.semana}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[detail.estado] || ''}`}
                >
                  {detail.estado}
                </span>
                {detail.notas && <p className="text-sm text-slate-500">Notas: {detail.notas}</p>}
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Area</TableHead>
                      <TableHead>Producto/Insumo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant={item.area === 'MOS' ? 'default' : 'secondary'}>
                            {item.area}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.producto?.nombre || item.insumo?.nombre || '—'}</TableCell>
                        <TableCell>{Number(item.cantidadSolicitada)}</TableCell>
                        <TableCell>{item.notas || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {detail.estado === 'ENVIADA' && (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setRejectId(detail.id)}
                    className="text-red-600"
                  >
                    Rechazar
                  </Button>
                  <Button
                    onClick={() => setApproveId(detail.id)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Aprobar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!rejectId}
        onOpenChange={(open) => {
          if (!open) {
            setRejectId(null);
            setRejectNotas('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Requisicion</AlertDialogTitle>
            <AlertDialogDescription>
              Ingresa el motivo del rechazo. El encargado vera esta nota.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo del rechazo..."
            value={rejectNotas}
            onChange={(e) => setRejectNotas(e.target.value)}
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={reject}>
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        open={!!approveId}
        onOpenChange={(open) => {
          if (!open) setApproveId(null);
        }}
        onConfirm={approve}
        variant="success"
        title="Aprobar requisicion"
        description="Una vez aprobada no se puede modificar el estado. ¿Continuar?"
        confirmLabel="Aprobar"
      />
    </div>
  );
}
