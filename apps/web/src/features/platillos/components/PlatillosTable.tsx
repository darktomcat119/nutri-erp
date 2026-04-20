'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
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
import { Pencil, Plus, PowerOff, Power, Download, Upload, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressDialog, type ProgressStep } from '@/components/ui/progress-dialog';
import { ImportPreviewDialog, type ImportPreviewData } from '@/components/ui/import-preview-dialog';
import { ConflictResolutionDialog } from '@/components/ui/conflict-resolution-dialog';
import { useProgressStream } from '@/lib/useProgressStream';

interface Platillo {
  id: string;
  nombre: string;
  costo: string;
  activo: boolean;
}

const schema = z.object({
  nombre: z.string().min(2, 'Requerido'),
  costo: z.number().min(0, 'Minimo 0'),
});
type FormData = z.infer<typeof schema>;

export function PlatillosTable(): JSX.Element {
  const [data, setData] = useState<Platillo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Platillo | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Import preview (dry-run before applying)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Conflict resolution (row-level opt-out of updates)
  const [conflictOpen, setConflictOpen] = useState(false);
  const [excludedKeys, setExcludedKeys] = useState<string[]>([]);
  // Import progress
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const progress = useProgressStream(importOpen ? importJobId : null);

  // Reset excluded rows whenever a new preview is loaded (new file = new selection)
  useEffect(() => {
    setExcludedKeys([]);
  }, [previewData]);

  const handleExport = async () => {
    try {
      const res = await api.get('/platillos/export-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'platillos.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel exportado');
    } catch {
      toast.error('Error al exportar');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);
    setExcludedKeys([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/platillos/import-excel-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const raw: unknown = res.data?.data ?? res.data;
      setPreviewData(raw as ImportPreviewData);
    } catch {
      toast.error('Error al analizar el archivo');
      setPreviewOpen(false);
      setPendingImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyPreview = async (): Promise<void> => {
    if (!pendingImportFile) return;
    setPreviewOpen(false);
    setPreviewLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', pendingImportFile);
      if (excludedKeys.length > 0) {
        formData.append('excludeKeys', JSON.stringify(excludedKeys));
      }
      const res = await api.post('/platillos/import-excel-stream', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const jobId = (res.data?.data?.jobId ?? res.data?.jobId) as string | undefined;
      if (!jobId) {
        toast.error('No se pudo iniciar la importacion');
        return;
      }
      setImportJobId(jobId);
      setImportOpen(true);
    } catch {
      toast.error('Error al iniciar la importacion');
    } finally {
      setPreviewLoading(false);
      setPendingImportFile(null);
      setPreviewData(null);
      setExcludedKeys([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelPreview = (): void => {
    setPendingImportFile(null);
    setPreviewData(null);
    setExcludedKeys([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const importSteps: ProgressStep[] = [
    {
      label: 'Analizar archivo',
      status: progress.events.some((e) => e.type === 'stage' && e.stage === 'validate')
        ? 'done'
        : progress.events.some((e) => e.type === 'stage' && e.stage === 'parse')
          ? 'running'
          : 'pending',
      detail: progress.stage === 'parse' ? progress.message || undefined : undefined,
    },
    {
      label: 'Validar filas',
      status: progress.events.some((e) => e.type === 'stage' && e.stage === 'save')
        ? 'done'
        : progress.events.some((e) => e.type === 'stage' && e.stage === 'validate')
          ? 'running'
          : 'pending',
      detail: progress.stage === 'validate' ? progress.message || undefined : undefined,
    },
    {
      label: 'Guardar en base de datos',
      status:
        progress.done && !progress.error
          ? 'done'
          : progress.error
            ? 'error'
            : progress.events.some((e) => e.type === 'stage' && e.stage === 'save')
              ? 'running'
              : 'pending',
      detail:
        progress.stage === 'save'
          ? progress.message || undefined
          : progress.done && progress.result
            ? (progress.result as { created: number; updated: number }).created +
              ' nuevos, ' +
              (progress.result as { created: number; updated: number }).updated +
              ' actualizados'
            : undefined,
    },
  ];

  const importSummary =
    progress.done && !progress.error && progress.result ? (
      <div className="space-y-1">
        <div>
          <strong className="text-slate-900">
            {(progress.result as { created: number }).created}
          </strong>{' '}
          platillos nuevos ·{' '}
          <strong className="text-slate-900">
            {(progress.result as { updated: number }).updated}
          </strong>{' '}
          actualizados
          {(progress.result as { errors?: unknown[] }).errors?.length ? (
            <>
              {' '}
              ·{' '}
              <span className="text-amber-600">
                {(progress.result as { errors: unknown[] }).errors.length} errores
              </span>
            </>
          ) : null}
        </div>
      </div>
    ) : null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const r = await api.get('/platillos');
      setData(r.data.data);
    } catch {
      toast.error('Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Refresh list when a streaming import completes successfully
  useEffect(() => {
    if (progress.done && !progress.error) {
      load();
    }
  }, [progress.done, progress.error, load]);

  const openCreate = (): void => {
    setEditing(null);
    reset({ nombre: '', costo: 0 });
    setOpen(true);
  };
  const openEdit = (p: Platillo): void => {
    setEditing(p);
    reset({ nombre: p.nombre, costo: Number(p.costo) });
    setOpen(true);
  };
  const onSubmit = async (fd: FormData): Promise<void> => {
    try {
      if (editing) {
        await api.patch(`/platillos/${editing.id}`, fd);
        toast.success('Platillo actualizado');
      } else {
        await api.post('/platillos', fd);
        toast.success('Platillo creado');
      }
      setOpen(false);
      load();
    } catch {
      toast.error('Error al guardar');
    }
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
    {
      accessorKey: 'nombre',
      header: ({ column }) => <SortableHeader column={column}>Nombre</SortableHeader>,
    },
    {
      accessorKey: 'costo',
      header: ({ column }) => <SortableHeader column={column}>Costo</SortableHeader>,
      cell: ({ row }) => `$${Number(row.original.costo).toFixed(2)}`,
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
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
              <Pencil className="h-4 w-4" />
            </Button>
            {p.activo ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeactivateId(p.id)}
                title="Desactivar"
              >
                <PowerOff className="h-4 w-4 text-red-500" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleActivo(p.id)}
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

  const table = useReactTable({
    data,
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-slate-500">
          {data.length} {data.length === 1 ? 'platillo' : 'platillos'}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleExport}
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          >
            <Download className="h-4 w-4 mr-2" /> Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Importar Excel
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Nuevo Platillo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Platillo' : 'Nuevo Platillo'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input {...register('nombre')} />
                  {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Costo por platillo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('costo', { valueAsNumber: true })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editing ? 'Actualizar' : 'Crear'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
                  <EmptyState icon={UtensilsCrossed} title="No hay platillos" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={(open) => {
          if (!open) setDeactivateId(null);
        }}
        onConfirm={handleDeactivateConfirm}
        title="Desactivar platillo"
        description="Este platillo sera desactivado. Puedes reactivarlo despues."
        confirmLabel="Desactivar"
      />
      <ImportPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open && !importOpen) handleCancelPreview();
        }}
        title="Importar platillos desde Excel"
        preview={previewData}
        loading={previewLoading}
        applyLabel="Aplicar cambios"
        onApply={handleApplyPreview}
        onCancel={handleCancelPreview}
        excludedCount={excludedKeys.length}
        onReviewUpdates={() => setConflictOpen(true)}
      />
      <ConflictResolutionDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        title="Revisar actualizaciones de platillos"
        updates={previewData?.updates ?? []}
        initialExcluded={excludedKeys}
        onConfirm={(keys) => setExcludedKeys(keys)}
      />
      <ProgressDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importando platillos desde Excel"
        description="El archivo se esta procesando en el servidor. El progreso es real y se actualiza en vivo."
        steps={importSteps}
        percent={progress.percent}
        running={!progress.done}
        summary={importSummary}
        onClose={() => {
          setImportOpen(false);
          setImportJobId(null);
        }}
      />
    </div>
  );
}
