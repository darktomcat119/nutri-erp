'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Pencil, Plus, PowerOff, Power, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

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
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const res = await api.get('/platillos/export-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'platillos.xlsx'; a.click();
      window.URL.revokeObjectURL(url); toast.success('Excel exportado');
    } catch { toast.error('Error al exportar'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const formData = new FormData(); formData.append('file', file);
    try {
      const res = await api.post('/platillos/import-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const result = res.data.data || res.data;
      toast.success(`Importado: ${result.created} nuevos, ${result.updated} actualizados`);
      if (result.errors?.length) toast.error(`${result.errors.length} errores`);
      load();
    } catch { toast.error('Error al importar'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  const handleToggleActivo = async (id: string): Promise<void> => {
    try {
      await api.patch(`/platillos/${id}/toggle-activo`);
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

  const columns: ColumnDef<Platillo>[] = [
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'costo', header: 'Costo', cell: ({ row }) => `$${Number(row.original.costo).toFixed(2)}` },
    {
      accessorKey: 'activo',
      header: 'Estado',
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
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
            {p.activo ? (
              <Button variant="ghost" size="icon" onClick={() => setDeactivateId(p.id)} title="Desactivar">
                <PowerOff className="h-4 w-4 text-red-500" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => handleToggleActivo(p.id)} title="Activar">
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-slate-500">{data.length} {data.length === 1 ? 'platillo' : 'platillos'}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleExport} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
            <Download className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Importar Excel
          </Button>
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="shadow-sm"><Plus className="h-4 w-4 mr-2" /> Nuevo Platillo</Button>
            </DialogTrigger>
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
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>{table.getHeaderGroups().map((hg) => <TableRow key={hg.id}>{hg.headers.map((h) => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id} className={!row.original.activo ? 'opacity-50 bg-gray-50' : ''}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500">No hay platillos</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={(open) => { if (!open) setDeactivateId(null); }}
        onConfirm={handleDeactivateConfirm}
        title="Desactivar platillo"
        description="Este platillo sera desactivado. Puedes reactivarlo despues."
        confirmLabel="Desactivar"
      />
    </div>
  );
}
