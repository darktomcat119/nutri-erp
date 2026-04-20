import {
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  XCircle,
  Loader2,
  FileSpreadsheet,
  ListChecks,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UpdateRow } from './conflict-resolution-dialog';

export interface ImportPreviewData {
  total: number;
  willCreate: number;
  willUpdate: number;
  willSkip: number;
  invalid: number;
  sampleCreate?: Array<{ label: string; detail?: string }>;
  sampleUpdate?: Array<{ label: string; detail?: string }>;
  invalidReasons?: Array<{ row: number; reason: string }>;
  /** Full list of updates with field-level diffs (for conflict resolution UI) */
  updates?: UpdateRow[];
}

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Heading, e.g. "Importar platillos desde Excel" */
  title: string;
  /** Loaded preview data, null while the preview is being computed */
  preview: ImportPreviewData | null;
  /** True while fetching preview, or while applying */
  loading: boolean;
  /** What label to show for "Apply" button */
  applyLabel?: string;
  onApply: () => void;
  /** Called when user cancels (dialog already closes on its own) */
  onCancel?: () => void;
  /** Count of rows excluded by conflict resolution (to show in summary) */
  excludedCount?: number;
  /** Callback when user clicks "Revisar individualmente" — opens conflict dialog */
  onReviewUpdates?: () => void;
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: 'emerald' | 'blue' | 'slate' | 'amber' | 'red';
}): JSX.Element {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  } as const;
  return (
    <div className={cn('flex flex-col gap-1 rounded-lg border px-3 py-2.5', tones[tone])}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
    </div>
  );
}

export function ImportPreviewDialog({
  open,
  onOpenChange,
  title,
  preview,
  loading,
  applyLabel = 'Aplicar cambios',
  onApply,
  onCancel,
  excludedCount = 0,
  onReviewUpdates,
}: ImportPreviewDialogProps): JSX.Element {
  const hasInvalid = (preview?.invalid ?? 0) > 0;
  const effectiveUpdate = preview ? Math.max(0, preview.willUpdate - excludedCount) : 0;
  const nothingToDo = preview !== null && preview.willCreate === 0 && effectiveUpdate === 0;
  const computedApplyLabel =
    preview && applyLabel === 'Aplicar cambios'
      ? `Aplicar (${preview.willCreate} crear + ${effectiveUpdate} actualizar)`
      : applyLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Revisa los cambios que se aplicaran antes de confirmar. Esta es solo una vista previa
            &mdash; aun no se ha modificado nada en la base de datos.
          </DialogDescription>
        </DialogHeader>

        {!preview || loading ? (
          <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Analizando archivo...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <StatCard
                icon={FileSpreadsheet}
                label="Total filas"
                value={preview.total}
                tone="slate"
              />
              <StatCard
                icon={PlusCircle}
                label="Nuevos"
                value={preview.willCreate}
                tone="emerald"
              />
              <StatCard icon={RefreshCw} label="A actualizar" value={effectiveUpdate} tone="blue" />
              <StatCard
                icon={XCircle}
                label={hasInvalid ? 'Con errores' : 'Omitidos'}
                value={hasInvalid ? preview.invalid : preview.willSkip}
                tone={hasInvalid ? 'red' : 'slate'}
              />
            </div>

            {nothingToDo && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No hay filas nuevas ni a actualizar. Nada que hacer.
              </div>
            )}

            {/* Sample lists */}
            {preview.sampleCreate && preview.sampleCreate.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-1.5">
                  Se crearan ({preview.willCreate})
                </div>
                <ul className="space-y-0.5 text-[13px] text-slate-700 max-h-[140px] overflow-y-auto pr-1">
                  {preview.sampleCreate.slice(0, 8).map((s, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="font-medium">{s.label}</span>
                      {s.detail && <span className="text-slate-400 text-xs">{s.detail}</span>}
                    </li>
                  ))}
                  {preview.willCreate > 8 && (
                    <li className="text-xs text-slate-400 pl-5">+ {preview.willCreate - 8} mas</li>
                  )}
                </ul>
              </div>
            )}

            {preview.sampleUpdate && preview.sampleUpdate.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                    Se actualizaran ({effectiveUpdate}
                    {excludedCount > 0 ? ` de ${preview.willUpdate}` : ''})
                  </div>
                  {onReviewUpdates && preview.willUpdate > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onReviewUpdates}
                      className="h-7 px-2 text-xs"
                    >
                      <ListChecks className="h-3 w-3 mr-1" />
                      Revisar individualmente
                      {excludedCount > 0 && (
                        <span className="ml-1 text-amber-600">({excludedCount} omitidos)</span>
                      )}
                    </Button>
                  )}
                </div>
                <ul className="space-y-0.5 text-[13px] text-slate-700 max-h-[140px] overflow-y-auto pr-1">
                  {preview.sampleUpdate.slice(0, 8).map((s, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 text-blue-500 shrink-0" />
                      <span className="font-medium">{s.label}</span>
                      {s.detail && <span className="text-slate-400 text-xs">{s.detail}</span>}
                    </li>
                  ))}
                  {preview.willUpdate > 8 && (
                    <li className="text-xs text-slate-400 pl-5">+ {preview.willUpdate - 8} mas</li>
                  )}
                </ul>
              </div>
            )}

            {preview.invalidReasons && preview.invalidReasons.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-red-700 hover:text-red-900">
                  Filas con errores ({preview.invalid}) &mdash; ver detalle
                </summary>
                <ul className="mt-2 space-y-0.5 text-xs text-red-700 max-h-[120px] overflow-y-auto pl-4 pr-1">
                  {preview.invalidReasons.slice(0, 20).map((r, i) => (
                    <li key={i}>
                      <span className="font-mono text-slate-500">Fila {r.row}:</span> {r.reason}
                    </li>
                  ))}
                  {preview.invalidReasons.length > 20 && (
                    <li className="text-slate-400">+ {preview.invalidReasons.length - 20} mas</li>
                  )}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onApply}
            disabled={loading || !preview || nothingToDo}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              computedApplyLabel
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
