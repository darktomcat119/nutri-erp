'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, AlertTriangle, Loader2, Plus, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import type { Sucursal, BudgetVsActual, GastoProveedor, Diferencia } from './types';
import { getCurrentWeek } from './types';
import { BudgetOverview } from './BudgetOverview';
import { SupplierSpendChart } from './SupplierSpendChart';
import { CloseWeekSection } from './CloseWeekSection';

export function FinancieroPage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [semana, setSemana] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [presupuestos, setPresupuestos] = useState<{ sucursal: Sucursal; data: BudgetVsActual }[]>(
    [],
  );
  const [gastosProveedor, setGastosProveedor] = useState<GastoProveedor[]>([]);
  const [diferencias, setDiferencias] = useState<Diferencia[]>([]);

  // Week closing state
  const [weekClosed, setWeekClosed] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSucursalId, setDialogSucursalId] = useState('');
  const [dialogMos, setDialogMos] = useState('');
  const [dialogIns, setDialogIns] = useState('');
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  // Load sucursales once
  useEffect(() => {
    api
      .get('/sucursales')
      .then((r) => setSucursales(r.data.data))
      .catch(() => toast.error('Error al cargar sucursales'));
  }, []);

  // Load all financial data for the selected week
  const loadData = useCallback(async () => {
    if (!semana) return;
    setLoading(true);
    try {
      // Load presupuestos for each sucursal
      const presupuestoPromises = sucursales.map((s) =>
        api
          .get(`/presupuestos/${semana}/${s.id}`)
          .then((r) => r.data.data)
          .catch(() => null),
      );

      const [presResults, gastosRes, difRes, cerradaRes] = await Promise.all([
        Promise.all(presupuestoPromises),
        api.get(`/reportes/gastos-proveedor/${semana}`).catch(() => null),
        api.get(`/reportes/diferencias/${semana}`).catch(() => null),
        api.get(`/presupuestos/semana-cerrada/${semana}`).catch(() => null),
      ]);

      const cerradaData = cerradaRes?.data?.data;
      const isCerrada = cerradaData?.data?.cerrada || cerradaData?.cerrada || false;
      setWeekClosed(isCerrada);

      const mapped = presResults
        .map((r, i) => (r ? { sucursal: sucursales[i], data: r as BudgetVsActual } : null))
        .filter(Boolean) as { sucursal: Sucursal; data: BudgetVsActual }[];
      setPresupuestos(mapped);
      setGastosProveedor(gastosRes?.data?.data || []);
      setDiferencias(difRes?.data?.data || []);
    } catch {
      toast.error('Error al cargar datos financieros');
    } finally {
      setLoading(false);
    }
  }, [semana, sucursales]);

  const handleLoad = () => {
    if (!semana) {
      toast.error('Seleccione una semana');
      return;
    }
    loadData();
  };

  // Submit new budget
  const handleSubmitBudget = async () => {
    if (!dialogSucursalId) {
      toast.error('Seleccione una sucursal');
      return;
    }
    if (!dialogMos || !dialogIns) {
      toast.error('Ingrese ambos presupuestos');
      return;
    }
    setDialogSubmitting(true);
    try {
      await api.post('/presupuestos', {
        semana,
        sucursalId: dialogSucursalId,
        presupuestoMos: Number(dialogMos),
        presupuestoIns: Number(dialogIns),
      });
      toast.success('Presupuesto guardado exitosamente');
      setDialogOpen(false);
      setDialogSucursalId('');
      setDialogMos('');
      setDialogIns('');
      loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al guardar presupuesto';
      toast.error(msg);
    } finally {
      setDialogSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Section 1: Week Selector + Budget Management ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1 w-full sm:w-48">
              <Label htmlFor="semana" className="text-sm text-slate-600">
                Semana
              </Label>
              <Input
                id="semana"
                type="week"
                value={semana}
                onChange={(e) => setSemana(e.target.value)}
                className="w-full sm:w-48 min-h-[44px]"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end w-full sm:w-auto">
              <Button
                onClick={handleLoad}
                disabled={loading}
                className="w-full sm:w-auto min-h-[44px]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                Cargar
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Presupuesto
                </Button>
              )}
              {isAdmin && !weekClosed && (
                <Button
                  variant="outline"
                  onClick={() => setCloseDialogOpen(true)}
                  className="w-full sm:w-auto min-h-[44px] text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Cerrar Semana
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <CloseWeekSection
        semana={semana}
        isAdmin={!!isAdmin}
        weekClosed={weekClosed}
        setWeekClosed={setWeekClosed}
        closeDialogOpen={closeDialogOpen}
        setCloseDialogOpen={setCloseDialogOpen}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {!loading && (
        <>
          <BudgetOverview presupuestos={presupuestos} />
          <SupplierSpendChart gastosProveedor={gastosProveedor} />

          {/* ── Section 4: Differences Table ── */}
          {diferencias.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Diferencias en Recepciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>Producto / Insumo</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead className="text-right">Esperada</TableHead>
                        <TableHead className="text-right">Recibida</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diferencias.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.sucursal}</TableCell>
                          <TableCell>{d.producto}</TableCell>
                          <TableCell>
                            <Badge variant={d.area === 'MOS' ? 'default' : 'secondary'}>
                              {d.area}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{d.cantidadEsperada}</TableCell>
                          <TableCell className="text-right">{d.cantidadRecibida}</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-semibold ${
                                d.diferencia > 0
                                  ? 'text-emerald-600'
                                  : d.diferencia < 0
                                    ? 'text-red-600'
                                    : 'text-slate-600'
                              }`}
                            >
                              {d.diferencia > 0 ? '+' : ''}
                              {d.diferencia}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {presupuestos.length === 0 &&
            gastosProveedor.length === 0 &&
            diferencias.length === 0 &&
            !loading && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-500">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                    <DollarSign className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-base font-semibold text-slate-800 mb-1.5">
                    No hay datos financieros
                  </p>
                  <p className="text-sm max-w-md">
                    Selecciona una semana y presiona &quot;Cargar&quot; para ver el presupuesto,
                    gastos y diferencias.
                  </p>
                </CardContent>
              </Card>
            )}
        </>
      )}

      {/* ── New Budget Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nuevo Presupuesto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Semana</Label>
              <Input type="week" value={semana} disabled className="min-h-[44px] bg-slate-50" />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Sucursal</Label>
              <Select value={dialogSucursalId} onValueChange={setDialogSucursalId}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Presupuesto MOS</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={dialogMos}
                onChange={(e) => setDialogMos(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Presupuesto INS</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={dialogIns}
                onChange={(e) => setDialogIns(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            <Button
              onClick={handleSubmitBudget}
              disabled={dialogSubmitting}
              className="w-full sm:w-auto min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
            >
              {dialogSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Guardar Presupuesto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
