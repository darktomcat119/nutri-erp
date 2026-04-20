import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ProgressStep = {
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
};

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** 0–100; if omitted, infer from steps */
  percent?: number;
  steps?: ProgressStep[];
  /** Summary shown at bottom when all done */
  summary?: React.ReactNode;
  /** True while process is running (disables close) */
  running: boolean;
  onClose?: () => void;
}

export function ProgressDialog({
  open,
  onOpenChange,
  title,
  description,
  percent,
  steps,
  summary,
  running,
  onClose,
}: ProgressDialogProps): JSX.Element {
  const computedPercent =
    percent ??
    (steps && steps.length > 0
      ? Math.round((steps.filter((s) => s.status === 'done').length / steps.length) * 100)
      : 0);

  const hasError = steps?.some((s) => s.status === 'error');

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!running) onOpenChange(o);
      }}
    >
      <DialogContent
        className="max-w-lg"
        onPointerDownOutside={(e) => {
          if (running) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (running) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            ) : hasError ? (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Percentage bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium">
              {running ? 'En progreso...' : hasError ? 'Con errores' : 'Completado'}
            </span>
            <span className="tabular-nums font-semibold text-slate-700">{computedPercent}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300 ease-out',
                hasError
                  ? 'bg-amber-500'
                  : running
                    ? 'bg-gradient-to-r from-blue-500 to-violet-500'
                    : 'bg-emerald-500',
              )}
              style={{ width: `${computedPercent}%` }}
            />
          </div>
        </div>

        {/* Steps list */}
        {steps && steps.length > 0 && (
          <ul className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1 -mx-1 px-1">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px]">
                <div className="mt-0.5 shrink-0">
                  {s.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {s.status === 'running' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {s.status === 'pending' && (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                  )}
                  {s.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      'font-medium',
                      s.status === 'pending'
                        ? 'text-slate-400'
                        : s.status === 'error'
                          ? 'text-red-700'
                          : 'text-slate-800',
                    )}
                  >
                    {s.label}
                  </div>
                  {s.detail && <div className="text-[11px] text-slate-500 mt-0.5">{s.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Summary */}
        {summary && !running && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-[13px] text-slate-700">
            {summary}
          </div>
        )}

        {/* Close button */}
        {!running && (
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              onClick={() => {
                onClose?.();
                onOpenChange(false);
              }}
            >
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
