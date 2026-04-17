'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Confirmar accion',
  description = 'Esta accion no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
}: ConfirmDialogProps): JSX.Element {
  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/25'
      : variant === 'warning'
        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-500/25'
        : 'bg-slate-900 hover:bg-slate-800 text-white';

  const iconBg =
    variant === 'danger' ? 'bg-red-50' :
    variant === 'warning' ? 'bg-amber-50' : 'bg-blue-50';

  const Icon =
    variant === 'danger' ? ShieldAlert :
    variant === 'warning' ? AlertTriangle : Info;

  const iconColor =
    variant === 'danger' ? 'text-red-600' :
    variant === 'warning' ? 'text-amber-600' : 'text-blue-600';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-[13px] leading-relaxed">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel className="text-[13px]">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction className={`text-[13px] ${confirmClass}`} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
