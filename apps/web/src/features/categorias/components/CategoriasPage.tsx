'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState('');
  const [toggleId, setToggleId] = useState<string | null>(null);
  const [toggleCategoria, setToggleCategoria] = useState<Categoria | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get(`/categorias?tipo=${tab}`);
      setData(res.data.data || res.data || []);
    } catch {
      toast.error('Error al cargar categorias');
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

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
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? (
              filtered.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={cat.activo ? 'default' : 'secondary'}>
                      {cat.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setToggleId(cat.id); setToggleCategoria(cat); }}
                        title={cat.activo ? 'Desactivar' : 'Activar'}
                      >
                        {cat.activo
                          ? <ToggleRight className="h-4 w-4 text-green-600" />
                          : <ToggleLeft className="h-4 w-4 text-slate-400" />
                        }
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-slate-500">
                  No hay categorias
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
        onOpenChange={(open) => { if (!open) { setToggleId(null); setToggleCategoria(null); } }}
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
