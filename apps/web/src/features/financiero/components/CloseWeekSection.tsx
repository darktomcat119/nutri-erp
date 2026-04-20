'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface CloseWeekSectionProps {
  semana: string;
  isAdmin: boolean;
  weekClosed: boolean;
  setWeekClosed: (v: boolean) => void;
  closeDialogOpen: boolean;
  setCloseDialogOpen: (v: boolean) => void;
}

export function CloseWeekSection({
  semana,
  isAdmin,
  weekClosed,
  setWeekClosed,
  closeDialogOpen,
  setCloseDialogOpen,
}: CloseWeekSectionProps): JSX.Element {
  const [closingWeek, setClosingWeek] = useState(false);
  const [closeNotas, setCloseNotas] = useState('');
  const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false);

  const handleCloseWeek = async () => {
    setClosingWeek(true);
    try {
      await api.post('/presupuestos/cerrar-semana', { semana, notas: closeNotas });
      toast.success('Semana cerrada');
      setWeekClosed(true);
      setCloseDialogOpen(false);
      setCloseNotas('');
    } catch {
      toast.error('Error al cerrar semana');
    } finally {
      setClosingWeek(false);
    }
  };

  const handleReopenWeek = async () => {
    try {
      await api.delete(`/presupuestos/reabrir-semana/${semana}`);
      toast.success('Semana reabierta');
      setWeekClosed(false);
    } catch {
      toast.error('Error al reabrir');
    } finally {
      setReopenConfirmOpen(false);
    }
  };

  return (
    <>
      {/* Week closed banner */}
      {weekClosed && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Semana Cerrada</p>
              <p className="text-xs text-amber-600">
                Esta semana ha sido cerrada. No se permiten modificaciones.
              </p>
            </div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReopenConfirmOpen(true)}
                className="text-amber-700 border-amber-300"
              >
                Reabrir
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Close Week Dialog ── */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar semana</AlertDialogTitle>
            <AlertDialogDescription>
              Se bloquearan cambios en requisiciones, OCs y recepciones para la semana {semana}.
              Puedes reabrirla despues si lo necesitas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Notas (opcional)"
              value={closeNotas}
              onChange={(e) => setCloseNotas(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingWeek}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseWeek}
              disabled={closingWeek}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {closingWeek && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cerrar Semana
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        open={reopenConfirmOpen}
        onOpenChange={setReopenConfirmOpen}
        onConfirm={handleReopenWeek}
        variant="default"
        title="Reabrir semana"
        description="La semana volvera a estar editable."
        confirmLabel="Reabrir"
      />
    </>
  );
}
