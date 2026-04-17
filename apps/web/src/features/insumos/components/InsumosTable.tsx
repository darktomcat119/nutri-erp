'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Search, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

const UNIDADES = ['kg', 'pza', 'Lt', 'ml', 'gr'] as const;
const PRESENTACIONES = ['Display', 'Granel'] as const;
const ORIGENES = ['Compras', 'Sucursal'] as const;

interface Insumo {
  id: string; codigo: string; nombre: string; categoria: string | null;
  unidad: string; presentacion: string | null; cantidadPorDisplay: number | null;
  costoUnitario: string; activo: boolean; origen: string | null;
  proveedor: { id: string; nombre: string };
}
interface Proveedor { id: string; nombre: string; }

const schema = z.object({
  codigo: z.string().optional(),
  nombre: z.string().min(1, 'Requerido'),
  categoria: z.string().optional(),
  unidad: z.string().min(1, 'Requerido'),
  presentacion: z.string().optional(),
  cantidadPorDisplay: z.number().int().min(0).optional().or(z.literal('')),
  costoUnitario: z.number().min(0),
  proveedorId: z.string().min(1, 'Selecciona proveedor'),
  origen: z.string().min(1, 'Requerido'),
});
type FormData = z.infer<typeof schema>;

export function InsumosTable(): JSX.Element {
  const [data, setData] = useState<Insumo[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | null>(null);
  const [filter, setFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    api.get('/categorias?tipo=INS').then(r => {
      const cats = (r.data.data || r.data || []).filter((c: { activo: boolean }) => c.activo).map((c: { nombre: string }) => c.nombre);
      setCategorias(cats);
    }).catch(() => {});
  }, []);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [r1, r2] = await Promise.all([api.get('/insumos'), api.get('/proveedores')]);
      setData(r1.data.data); setProveedores(r2.data.data);
    } catch { toast.error('Error al cargar datos'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = async (): Promise<void> => {
    setEditing(null);
    reset({
      codigo: '', nombre: '', categoria: '', unidad: 'kg', presentacion: '',
      cantidadPorDisplay: '' as unknown as number, costoUnitario: 0, proveedorId: '', origen: '',
    });
    setOpen(true);
    setLoadingCode(true);
    try {
      const res = await api.get('/insumos/next-code');
      setValue('codigo', res.data.code ?? res.data.data ?? '');
    } catch {
      toast.error('Error al obtener codigo');
    } finally {
      setLoadingCode(false);
    }
  };
  const openEdit = (i: Insumo): void => {
    setEditing(i);
    reset({
      codigo: i.codigo, nombre: i.nombre, categoria: i.categoria || '',
      unidad: i.unidad, presentacion: i.presentacion || '',
      cantidadPorDisplay: i.cantidadPorDisplay ?? ('' as unknown as number),
      costoUnitario: Number(i.costoUnitario), proveedorId: i.proveedor.id,
      origen: i.origen || '',
    });
    setOpen(true);
  };
  const onSubmit = async (fd: FormData): Promise<void> => {
    try {
      const payload = {
        ...fd,
        categoria: fd.categoria || null,
        presentacion: fd.presentacion || null,
        cantidadPorDisplay: fd.cantidadPorDisplay === '' || fd.cantidadPorDisplay === undefined ? null : fd.cantidadPorDisplay,
      };
      if (editing) { await api.patch(`/insumos/${editing.id}`, payload); toast.success('Insumo actualizado'); }
      else { await api.post('/insumos', payload); toast.success('Insumo creado'); }
      setOpen(false); load();
    } catch { toast.error('Error al guardar'); }
  };
  const handleDelete = async (): Promise<void> => {
    if (!deleteId) return;
    try { await api.delete(`/insumos/${deleteId}`); toast.success('Insumo desactivado'); load(); }
    catch { toast.error('Error'); }
    finally { setDeleteId(null); }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/insumos/export-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'insumos.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel exportado');
    } catch { toast.error('Error al exportar'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/insumos/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = res.data.data || res.data;
      toast.success(`Importado: ${result.created} nuevos, ${result.updated} actualizados`);
      if (result.errors?.length) {
        toast.error(`${result.errors.length} errores encontrados`);
      }
      load();
    } catch { toast.error('Error al importar'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const columns: ColumnDef<Insumo>[] = [
    { accessorKey: 'codigo', header: 'Codigo' },
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'categoria', header: 'Categoria', cell: ({ row }) => row.original.categoria || '—' },
    { accessorKey: 'unidad', header: 'Unidad' },
    { accessorKey: 'presentacion', header: 'Presentacion', cell: ({ row }) => row.original.presentacion || '—' },
    { accessorKey: 'cantidadPorDisplay', header: 'Cant/Display', cell: ({ row }) => row.original.cantidadPorDisplay ?? '—' },
    { id: 'proveedor', header: 'Proveedor', cell: ({ row }) => row.original.proveedor?.nombre || '—' },
    { accessorKey: 'costoUnitario', header: 'Costo', cell: ({ row }) => `$${Number(row.original.costoUnitario).toFixed(2)}` },
    {
      accessorKey: 'origen', header: 'Origen',
      cell: ({ row }) => {
        const origen = row.original.origen;
        if (!origen) return '—';
        return (
          <Badge variant={origen === 'Compras' ? 'default' : 'secondary'}>
            {origen}
          </Badge>
        );
      },
    },
    {
      id: 'actions', header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.original.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), state: { globalFilter: filter }, onGlobalFilterChange: setFilter });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar insumos..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto bg-green-50 text-green-700 border-green-300 hover:bg-green-100">
            <Download className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full sm:w-auto bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100">
            <Upload className="h-4 w-4 mr-2" /> Importar Excel
          </Button>
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Nuevo Insumo</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar Insumo' : 'Nuevo Insumo'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Row 1: Codigo + Nombre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Codigo</Label>
                  <Input
                    {...register('codigo')}
                    readOnly={!editing}
                    disabled={loadingCode}
                    className={!editing ? 'bg-slate-100 cursor-not-allowed' : ''}
                  />
                  {errors.codigo && <p className="text-xs text-red-600">{errors.codigo.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input {...register('nombre')} />
                  {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
                </div>
              </div>

              {/* Row 2: Categoria + Unidad + Presentacion */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={watch('categoria') || ''} onValueChange={(v) => setValue('categoria', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidad</Label>
                  <Select value={watch('unidad') || ''} onValueChange={(v) => setValue('unidad', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.unidad && <p className="text-xs text-red-600">{errors.unidad.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Presentacion</Label>
                  <Select value={watch('presentacion') || ''} onValueChange={(v) => setValue('presentacion', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {PRESENTACIONES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: CantidadPorDisplay + Origen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad por Display</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    {...register('cantidadPorDisplay', { setValueAs: (v: string) => (v === '' ? '' : parseInt(v, 10)) })}
                    placeholder="0"
                  />
                  {errors.cantidadPorDisplay && <p className="text-xs text-red-600">{errors.cantidadPorDisplay.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Origen <span className="text-red-500">*</span></Label>
                  <Select value={watch('origen') || ''} onValueChange={(v) => setValue('origen', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
                    <SelectContent>
                      {ORIGENES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.origen && <p className="text-xs text-red-600">{errors.origen.message}</p>}
                </div>
              </div>

              {/* Row 4: Proveedor + Costo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select value={watch('proveedorId')} onValueChange={(v) => setValue('proveedorId', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
      </div>
      <div className="rounded-md border overflow-x-auto">
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
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Desactivar insumo"
        description="Este insumo sera desactivado y no aparecera en futuras requisiciones. Puedes reactivarlo despues."
        confirmLabel="Desactivar"
      />
    </div>
  );
}
