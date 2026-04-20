'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Pencil, Plus, PowerOff, Power, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTableShell } from '@/components/ui/data-table-shell';

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
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sucursal | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.get('/sucursales');
      setData(res.data.data);
    } catch {
      toast.error('Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    setSaving(true);
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
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {loading
            ? 'Cargando...'
            : `${data.length} ${data.length === 1 ? 'sucursal' : 'sucursales'}`}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="shadow-sm">
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
                <Input {...register('codigo')} placeholder="IPADE" autoFocus />
                {errors.codigo && <p className="text-xs text-red-600">{errors.codigo.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input {...register('nombre')} placeholder="Nutri Cafeteria - Ciudad UP - IPADE" />
                {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>
                  OrderEat Cafeteria ID <span className="text-xs text-slate-400">(opcional)</span>
                </Label>
                <Input {...register('cafeteriaId')} placeholder="359" inputMode="numeric" />
                <p className="text-xs text-slate-400">
                  ID numerico en OrderEat. Requerido para sincronizar inventario/ventas.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTableShell<Sucursal>
        data={data}
        loading={loading}
        rowKey={(s) => s.id}
        rowClassName={(s) => (!s.activa ? 'opacity-60 bg-slate-50/60' : undefined)}
        emptyIcon={Building2}
        emptyTitle="Sin sucursales"
        emptyDescription="Crea tu primera sucursal para empezar a gestionar requisiciones y ordenes."
        emptyAction={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Crear sucursal
          </Button>
        }
        columns={[
          {
            key: 'codigo',
            header: 'Codigo',
            cell: (s) => <span className="font-semibold text-slate-900">{s.codigo}</span>,
          },
          { key: 'nombre', header: 'Nombre', cell: (s) => s.nombre },
          {
            key: 'cafeteriaId',
            header: 'OrderEat ID',
            cell: (s) =>
              s.cafeteriaId ? (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {s.cafeteriaId}
                </span>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              ),
          },
          {
            key: 'activa',
            header: 'Estado',
            cell: (s) => (
              <Badge
                variant={s.activa ? 'default' : 'destructive'}
                className={
                  s.activa
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0'
                    : 'bg-slate-200 text-slate-600 border-0'
                }
              >
                {s.activa ? 'Activa' : 'Inactiva'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: <span className="text-right block">Acciones</span>,
            cellClassName: 'text-right',
            cell: (s) => (
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(s)}
                  className="h-8 w-8"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {s.activa ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeactivateId(s.id)}
                    className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                    title="Desactivar"
                  >
                    <PowerOff className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActivo(s.id)}
                    className="h-8 w-8 hover:bg-emerald-50 hover:text-emerald-600"
                    title="Activar"
                  >
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={!!deactivateId}
        onOpenChange={(openState) => {
          if (!openState) setDeactivateId(null);
        }}
        onConfirm={handleDeactivateConfirm}
        title="Desactivar sucursal"
        description="Esta sucursal sera desactivada. Puedes reactivarla despues."
        confirmLabel="Desactivar"
      />
    </div>
  );
}
