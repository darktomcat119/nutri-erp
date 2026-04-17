'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Plus, Search, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface Producto {
  id: string; codigo: string; nombre: string; nombreSistema: string | null;
  categoria: string | null; marca: string | null; pzXDisplay: number;
  costoDisplay: string; costoUnitario: string; ordereatId: string | null;
  origen: string; activo: boolean; proveedor: { id: string; nombre: string };
}

interface Proveedor { id: string; nombre: string; }

const ORIGENES = ['Compras', 'Sucursal'] as const;

const schema = z.object({
  codigo: z.string().min(1, 'Requerido'),
  nombre: z.string().min(1, 'Requerido'),
  nombreSistema: z.string().min(1, 'Requerido'),
  categoria: z.string().min(1, 'Requerido'),
  marca: z.string().min(1, 'Requerido'),
  pzXDisplay: z.number().int().min(1, 'Requerido'),
  costoDisplay: z.number().min(0.01, 'Requerido'),
  costoUnitario: z.number().min(0),
  proveedorId: z.string().min(1, 'Requerido'),
  ordereatId: z.string().optional().or(z.literal('')),
  origen: z.string().min(1, 'Requerido'),
});
type FormData = z.infer<typeof schema>;

export function ProductosTable(): JSX.Element {
  const [data, setData] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [filter, setFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const nombreSistema = watch('nombreSistema');
  const pzXDisplay = watch('pzXDisplay');
  const marca = watch('marca');
  const costoDisplay = watch('costoDisplay');

  // Auto-compute nombre
  useEffect(() => {
    const parts = [nombreSistema, pzXDisplay > 0 ? `${pzXDisplay}PZ` : '', marca].filter(Boolean);
    setValue('nombre', parts.join(' '));
  }, [nombreSistema, pzXDisplay, marca, setValue]);

  // Auto-compute costoUnitario
  useEffect(() => {
    if (pzXDisplay > 0 && costoDisplay > 0) {
      setValue('costoUnitario', Math.round((costoDisplay / pzXDisplay) * 100) / 100);
    }
  }, [costoDisplay, pzXDisplay, setValue]);

  useEffect(() => {
    api.get('/categorias?tipo=MOS').then(r => {
      const cats = (r.data.data || r.data || []).filter((c: { activo: boolean }) => c.activo).map((c: { nombre: string }) => c.nombre);
      setCategorias(cats);
    }).catch(() => {});
  }, []);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [prodRes, provRes] = await Promise.all([api.get('/productos'), api.get('/proveedores')]);
      setData(prodRes.data.data);
      setProveedores(provRes.data.data);
    } catch { toast.error('Error al cargar datos'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = async (): Promise<void> => {
    setEditing(null);
    let nextCode = '';
    try {
      const res = await api.get('/productos/next-code');
      const raw = res.data.data;
      nextCode = typeof raw === 'string' ? raw : (raw?.data || raw || '');
    } catch {
      toast.error('Error al obtener codigo');
    }
    reset({
      codigo: nextCode, nombre: '', nombreSistema: '', categoria: '', marca: '',
      pzXDisplay: 0, costoDisplay: 0, costoUnitario: 0, proveedorId: '', ordereatId: '', origen: '',
    });
    setOpen(true);
  };

  const openEdit = (p: Producto): void => {
    setEditing(p);
    reset({
      codigo: p.codigo, nombre: p.nombre, nombreSistema: p.nombreSistema || '',
      categoria: p.categoria || '', marca: p.marca || '', pzXDisplay: p.pzXDisplay,
      costoDisplay: Number(p.costoDisplay), costoUnitario: Number(p.costoUnitario),
      proveedorId: p.proveedor.id, ordereatId: p.ordereatId || '', origen: p.origen || '',
    });
    setOpen(true);
  };

  const onSubmit = async (fd: FormData): Promise<void> => {
    try {
      const payload = {
        ...fd,
        nombreSistema: fd.nombreSistema || null,
        categoria: fd.categoria || null,
        marca: fd.marca || null,
        ordereatId: fd.ordereatId || null,
      };
      if (editing) {
        await api.patch(`/productos/${editing.id}`, payload);
        toast.success('Producto actualizado');
      } else {
        await api.post('/productos', payload);
        toast.success('Producto creado');
      }
      setOpen(false); load();
    } catch { toast.error('Error al guardar'); }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deleteId) return;
    try { await api.delete(`/productos/${deleteId}`); toast.success('Producto desactivado'); load(); }
    catch { toast.error('Error al desactivar'); }
    finally { setDeleteId(null); }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/productos/export-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'productos_mos.xlsx';
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
      const res = await api.post('/productos/import-excel', formData, {
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

  const columns: ColumnDef<Producto>[] = [
    { accessorKey: 'codigo', header: 'Codigo' },
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'categoria', header: 'Categoria', cell: ({ row }) => row.original.categoria || '\u2014' },
    { accessorKey: 'marca', header: 'Marca', cell: ({ row }) => row.original.marca || '\u2014' },
    { accessorKey: 'pzXDisplay', header: 'Pz/Display' },
    { id: 'proveedor', header: 'Proveedor', cell: ({ row }) => row.original.proveedor?.nombre || '\u2014' },
    { accessorKey: 'costoDisplay', header: 'Costo Display', cell: ({ row }) => `$${Number(row.original.costoDisplay).toFixed(2)}` },
    { accessorKey: 'costoUnitario', header: 'Costo Unit.', cell: ({ row }) => `$${Number(row.original.costoUnitario).toFixed(2)}` },
    {
      accessorKey: 'origen', header: 'Origen',
      cell: ({ row }) => (
        <Badge variant={row.original.origen === 'Sucursal' ? 'secondary' : 'default'}>
          {row.original.origen || 'Compras'}
        </Badge>
      ),
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

  const table = useReactTable({
    data, columns, getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter: filter }, onGlobalFilterChange: setFilter,
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar productos..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10" />
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
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Nuevo Producto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Codigo</Label>
                  <Input {...register('codigo')} placeholder="MO-021" readOnly={!editing} className={!editing ? 'bg-slate-100' : ''} />
                  {errors.codigo && <p className="text-xs text-red-600">{errors.codigo.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input {...register('nombre')} readOnly className="bg-slate-100" />
                  {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre Sistema (OrderEat) <span className="text-red-500">*</span></Label>
                  <Input {...register('nombreSistema')} />
                  {errors.nombreSistema && <p className="text-xs text-red-600">{errors.nombreSistema.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>ID OrderEat</Label>
                  <Input {...register('ordereatId')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria <span className="text-red-500">*</span></Label>
                  <Select value={watch('categoria')} onValueChange={(v) => setValue('categoria', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Seleccionar categoria" /></SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.categoria && <p className="text-xs text-red-600">{errors.categoria.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Marca <span className="text-red-500">*</span></Label>
                  <Input {...register('marca')} />
                  {errors.marca && <p className="text-xs text-red-600">{errors.marca.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proveedor <span className="text-red-500">*</span></Label>
                  <Select value={watch('proveedorId')} onValueChange={(v) => setValue('proveedorId', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.proveedorId && <p className="text-xs text-red-600">{errors.proveedorId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Origen <span className="text-red-500">*</span></Label>
                  <Select value={watch('origen')} onValueChange={(v) => setValue('origen', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
                    <SelectContent>
                      {ORIGENES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.origen && <p className="text-xs text-red-600">{errors.origen.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Pz/Display <span className="text-red-500">*</span></Label>
                  <Input type="number" {...register('pzXDisplay', { valueAsNumber: true })} placeholder="0" className="placeholder:text-slate-400" />
                  {errors.pzXDisplay && <p className="text-xs text-red-600">{errors.pzXDisplay.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Costo Display <span className="text-red-500">*</span></Label>
                  <Input type="number" step="0.01" {...register('costoDisplay', { valueAsNumber: true })} />
                  {errors.costoDisplay && <p className="text-xs text-red-600">{errors.costoDisplay.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Costo Unitario</Label>
                  <Input type="number" step="0.01" {...register('costoUnitario', { valueAsNumber: true })} readOnly className="bg-slate-100" />
                </div>
              </div>
              <Button type="submit" className="w-full sm:w-auto">{editing ? 'Actualizar' : 'Crear'}</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">No hay productos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-slate-500">{data.length} productos</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
        </div>
      </div>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="Desactivar producto"
        description="Este producto sera desactivado y no aparecera en futuras requisiciones. Puedes reactivarlo despues."
        confirmLabel="Desactivar"
      />
    </div>
  );
}
