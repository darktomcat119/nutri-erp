import { useMemo, useState, useEffect } from 'react';
import { ArrowRight, CheckSquare, Square, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableContainer,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface UpdateChange {
  field: string;
  old: string | number | null;
  new: string | number | null;
}

export interface UpdateRow {
  /** Stable key used by the backend to identify this row (nombre or codigo) */
  key: string;
  label: string;
  changes: UpdateChange[];
}

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "Revisar actualizaciones de platillos" */
  title: string;
  /** All rows that would be updated */
  updates: UpdateRow[];
  /** Keys initially excluded (to preserve state across re-opens) */
  initialExcluded?: string[];
  /** Called with the final list of keys to exclude when user confirms */
  onConfirm: (excludedKeys: string[]) => void;
}

function formatValue(v: string | number | null): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') {
    return v.toLocaleString('es-MX', { maximumFractionDigits: 2 });
  }
  return String(v);
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  title,
  updates,
  initialExcluded = [],
  onConfirm,
}: ConflictResolutionDialogProps): JSX.Element {
  const [excluded, setExcluded] = useState<Set<string>>(new Set(initialExcluded));
  const [filter, setFilter] = useState('');

  // Sync initial state whenever dialog opens or updates change
  useEffect(() => {
    if (open) {
      setExcluded(new Set(initialExcluded));
      setFilter('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return updates;
    return updates.filter(
      (u) =>
        u.label.toLowerCase().includes(q) ||
        u.changes.some(
          (c) =>
            c.field.toLowerCase().includes(q) ||
            String(c.old ?? '').toLowerCase().includes(q) ||
            String(c.new ?? '').toLowerCase().includes(q),
        ),
    );
  }, [updates, filter]);

  const toggleRow = (key: string): void => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = (): void => setExcluded(new Set());
  const skipAll = (): void => setExcluded(new Set(updates.map((u) => u.key)));
  const selectVisible = (): void => {
    setExcluded((prev) => {
      const next = new Set(prev);
      filtered.forEach((u) => next.delete(u.key));
      return next;
    });
  };
  const skipVisible = (): void => {
    setExcluded((prev) => {
      const next = new Set(prev);
      filtered.forEach((u) => next.add(u.key));
      return next;
    });
  };

  const applyCount = updates.length - excluded.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Cada fila muestra el valor actual y el nuevo valor del Excel. Desmarca las filas que NO
            quieras actualizar. Las filas desmarcadas mantendran su valor actual en la base de
            datos.
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pb-1">
          <Input
            placeholder="Buscar por nombre o valor..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="sm:max-w-[280px]"
          />
          <div className="flex gap-1 flex-wrap text-xs">
            <Button size="sm" variant="outline" onClick={selectAll} type="button">
              Aplicar todo
            </Button>
            <Button size="sm" variant="outline" onClick={skipAll} type="button">
              Omitir todo
            </Button>
            {filter && (
              <>
                <Button size="sm" variant="outline" onClick={selectVisible} type="button">
                  Aplicar visible
                </Button>
                <Button size="sm" variant="outline" onClick={skipVisible} type="button">
                  Omitir visible
                </Button>
              </>
            )}
          </div>
          <span className="sm:ml-auto text-xs text-slate-500 tabular-nums">
            {applyCount} / {updates.length} seleccionados
          </span>
        </div>

        {/* Table */}
        <TableContainer maxHeight="calc(70vh - 200px)">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <button
                    type="button"
                    onClick={excluded.size > 0 ? selectAll : skipAll}
                    className="inline-flex items-center text-slate-500 hover:text-slate-900"
                    title={excluded.size > 0 ? 'Marcar todos' : 'Desmarcar todos'}
                  >
                    {excluded.size === 0 ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Producto / Codigo</TableHead>
                <TableHead>Cambios</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-slate-400">
                    Sin coincidencias
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => {
                  const isExcluded = excluded.has(u.key);
                  return (
                    <TableRow
                      key={u.key}
                      onClick={() => toggleRow(u.key)}
                      className={cn(
                        'cursor-pointer',
                        isExcluded && 'opacity-50 bg-slate-50/80 hover:bg-slate-50',
                      )}
                    >
                      <TableCell>
                        {isExcluded ? (
                          <Square className="h-4 w-4 text-slate-400" />
                        ) : (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">{u.label}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {u.changes.map((c, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-[12px] tabular-nums"
                            >
                              <span className="text-[10px] uppercase text-slate-400 w-20 shrink-0">
                                {c.field}
                              </span>
                              <span className="text-slate-500 line-through">
                                {formatValue(c.old)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="text-blue-700 font-medium">
                                {formatValue(c.new)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(Array.from(excluded));
              onOpenChange(false);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Guardar seleccion ({applyCount} aplicar, {excluded.size} omitir)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
