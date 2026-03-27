'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, flexRender, type ColumnDef,
} from '@tanstack/react-table';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Requisicion {
  id: string; semana: string; estado: string; notas: string | null; createdAt: string;
  sucursal: { codigo: string; nombre: string };
  creadoPor: { nombre: string };
  _count: { items: number };
}

interface ReqDetail {
  id: string; semana: string; estado: string; notas: string | null;
  sucursal: { codigo: string; nombre: string };
  items: Array<{
    id: string; area: string; cantidadSolicitada: string; notas: string | null;
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
  const [semana, setSemana] = useState('');
  const [estado, setEstado] = useState('');
  const [detail, setDetail] = useState<ReqDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (semana) params.set('semana', semana);
      if (estado) params.set('estado', estado);
      const r = await api.get(`/requisiciones?${params.toString()}`);
      setData(r.data.data);
    } catch { toast.error('Error al cargar'); }
  }, [semana, estado]);
  useEffect(() => { load(); }, [load]);

  const viewDetail = async (id: string): Promise<void> => {
    try {
      const r = await api.get(`/requisiciones/${id}`);
      setDetail(r.data.data);
      setDetailOpen(true);
    } catch { toast.error('Error al cargar detalle'); }
  };

  const approve = async (id: string): Promise<void> => {
    try { await api.post(`/requisiciones/${id}/aprobar`); toast.success('Requisicion aprobada'); load(); setDetailOpen(false); }
    catch { toast.error('Error al aprobar'); }
  };

  const reject = async (id: string): Promise<void> => {
    const notas = prompt('Motivo del rechazo:');
    if (notas === null) return;
    try { await api.post(`/requisiciones/${id}/rechazar`, { notas }); toast.success('Requisicion rechazada'); load(); setDetailOpen(false); }
    catch { toast.error('Error al rechazar'); }
  };

  const columns: ColumnDef<Requisicion>[] = [
    { accessorKey: 'semana', header: 'Semana' },
    { id: 'sucursal', header: 'Sucursal', cell: ({ row }) => row.original.sucursal.codigo },
    { id: 'items', header: 'Items', cell: ({ row }) => row.original._count.items },
    { id: 'creadoPor', header: 'Creado por', cell: ({ row }) => row.original.creadoPor.nombre },
    {
      accessorKey: 'estado', header: 'Estado',
      cell: ({ row }) => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[row.original.estado] || ''}`}>{row.original.estado}</span>,
    },
    {
      accessorKey: 'createdAt', header: 'Fecha',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('es-MX'),
    },
    {
      id: 'actions', header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => viewDetail(row.original.id)}><Eye className="h-4 w-4" /></Button>
          {row.original.estado === 'ENVIADA' && (
            <>
              <Button variant="ghost" size="icon" onClick={() => approve(row.original.id)}><Check className="h-4 w-4 text-emerald-600" /></Button>
              <Button variant="ghost" size="icon" onClick={() => reject(row.original.id)}><X className="h-4 w-4 text-red-600" /></Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Input placeholder="Semana (ej: 2026-W12)" value={semana} onChange={(e) => setSemana(e.target.value)} className="w-48" />
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="BORRADOR">Borrador</SelectItem>
            <SelectItem value="ENVIADA">Enviada</SelectItem>
            <SelectItem value="APROBADA">Aprobada</SelectItem>
            <SelectItem value="RECHAZADA">Rechazada</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-slate-500 ml-auto">{data.length} requisiciones</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>{table.getHeaderGroups().map((hg) => <TableRow key={hg.id}>{hg.headers.map((h) => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">No hay requisiciones</TableCell></TableRow>}</TableBody>
        </Table>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Requisicion — {detail?.sucursal.codigo} — {detail?.semana}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge[detail.estado] || ''}`}>{detail.estado}</span>
                {detail.notas && <p className="text-sm text-slate-500">Notas: {detail.notas}</p>}
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Area</TableHead><TableHead>Producto/Insumo</TableHead><TableHead>Cantidad</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {detail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell><Badge variant={item.area === 'MOS' ? 'default' : 'secondary'}>{item.area}</Badge></TableCell>
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
                  <Button variant="outline" onClick={() => reject(detail.id)} className="text-red-600">Rechazar</Button>
                  <Button onClick={() => approve(detail.id)} className="bg-emerald-600 hover:bg-emerald-700">Aprobar</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
