'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigRow {
  sucursalId: string;
  sucursalCodigo: string;
  sucursalNombre: string;
  maxSemanal: number | null;
  precioVenta: string | number | null;
  margen: string | number | null;
  quienSurte: string | null;
  activo: boolean;
}

export function MaximosPerSucursalDialog({
  open,
  onOpenChange,
  productoId,
  productoNombre,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productoId: string | null;
  productoNombre: string;
}): JSX.Element {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<ConfigRow>>>({});

  const load = useCallback(async (): Promise<void> => {
    if (!productoId) return;
    setLoading(true);
    setEdits({});
    try {
      const r = await api.get(`/productos/${productoId}/config-sucursales`);
      setRows((r.data.data || r.data) as ConfigRow[]);
    } catch {
      toast.error('Error al cargar configuracion');
    } finally {
      setLoading(false);
    }
  }, [productoId]);

  useEffect(() => {
    if (open && productoId) load();
  }, [open, productoId, load]);

  const getValue = (row: ConfigRow, field: keyof ConfigRow): string | number => {
    const edited = edits[row.sucursalId]?.[field];
    if (edited !== undefined) return edited as string | number;
    const v = row[field];
    if (v == null) return '';
    return v as string | number;
  };

  const setEdit = (
    sucursalId: string,
    field: keyof ConfigRow,
    value: string | number | null,
  ): void => {
    setEdits((prev) => ({
      ...prev,
      [sucursalId]: { ...prev[sucursalId], [field]: value },
    }));
  };

  const saveRow = async (row: ConfigRow): Promise<void> => {
    if (!productoId) return;
    const edit = edits[row.sucursalId] || {};
    setSavingId(row.sucursalId);
    try {
      const pickNumber = (edited: unknown, current: unknown): number | null =>
        edited !== undefined ? toNumberOrNull(edited) : toNumberOrNull(current);
      const body = {
        maxSemanal:
          edit.maxSemanal !== undefined ? toNumberOrNull(edit.maxSemanal) : row.maxSemanal,
        precioVenta: pickNumber(edit.precioVenta, row.precioVenta),
        margen: pickNumber(edit.margen, row.margen),
        quienSurte:
          edit.quienSurte !== undefined ? (edit.quienSurte as string | null) : row.quienSurte,
      };
      await api.patch(`/productos/${productoId}/config-sucursales/${row.sucursalId}`, body);
      toast.success(`${row.sucursalCodigo}: configuracion actualizada`);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message;
      const text = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(text || 'Error al guardar');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>
            Maximos por Sucursal — <span className="text-slate-600">{productoNombre}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-slate-500">
            <Loader2 className="h-6 w-6 mx-auto animate-spin" />
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Sucursal</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-32">Max Semanal</TableHead>
                  <TableHead className="w-32">Precio Venta</TableHead>
                  <TableHead className="w-24">Margen %</TableHead>
                  <TableHead className="w-24">Accion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const dirty = edits[row.sucursalId] !== undefined;
                  return (
                    <TableRow key={row.sucursalId} className={dirty ? 'bg-amber-50/40' : ''}>
                      <TableCell className="font-mono text-xs">{row.sucursalCodigo}</TableCell>
                      <TableCell>{row.sucursalNombre}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={getValue(row, 'maxSemanal')}
                          onChange={(e) =>
                            setEdit(
                              row.sucursalId,
                              'maxSemanal',
                              e.target.value === '' ? null : Number(e.target.value),
                            )
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={getValue(row, 'precioVenta')}
                          onChange={(e) =>
                            setEdit(
                              row.sucursalId,
                              'precioVenta',
                              e.target.value === '' ? null : Number(e.target.value),
                            )
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={getValue(row, 'margen')}
                          onChange={(e) =>
                            setEdit(
                              row.sucursalId,
                              'margen',
                              e.target.value === '' ? null : Number(e.target.value),
                            )
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={dirty ? 'default' : 'outline'}
                          disabled={!dirty || savingId === row.sucursalId}
                          onClick={() => saveRow(row)}
                          className={dirty ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        >
                          {savingId === row.sucursalId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Save className="h-3 w-3 mr-1" /> Guardar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      No hay sucursales activas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function toNumberOrNull(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
