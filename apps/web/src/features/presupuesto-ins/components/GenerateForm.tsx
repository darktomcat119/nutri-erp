'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectEmpty } from '@/components/ui/select-empty';
import { DollarSign, Upload, Loader2, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import type { Sucursal, Presupuesto, GenerarResultado } from './types';
import { formatMoney } from './types';

interface GenerateFormProps {
  sucursales: Sucursal[];
  presupuestos: Presupuesto[];
  onGenerated: () => void;
}

export function GenerateForm({
  sucursales,
  presupuestos,
  onGenerated,
}: GenerateFormProps): JSX.Element {
  const [sucursalId, setSucursalId] = useState<string>('');
  const [semana, setSemana] = useState<string>('');
  const [fechaEjecucion, setFechaEjecucion] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [file, setFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [resultado, setResultado] = useState<GenerarResultado | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Regenerate confirm (when a presupuesto already exists for same semana/sucursal)
  const [regenPending, setRegenPending] = useState<null | { mode: 'excel' | 'live' }>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const resetForm = (): void => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const existingForSelection = (): Presupuesto | undefined => {
    if (!sucursalId || !semana) return undefined;
    return presupuestos.find((p) => p.semana === semana && p.sucursalId === sucursalId);
  };

  const regenDescription = (): string => {
    const suc = sucursales.find((s) => s.id === sucursalId);
    const sucCodigo = suc?.codigo || '—';
    return `Ya existe un presupuesto para ${sucCodigo}/${semana}. Los items actuales seran reemplazados. ¿Continuar?`;
  };

  const doGenerarExcel = async (): Promise<void> => {
    setGenerating(true);
    setResultado(null);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      formData.append('sucursalId', sucursalId);
      formData.append('semana', semana);
      formData.append('fechaEjecucion', fechaEjecucion);
      const res = await api.post('/presupuesto-ins/generar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data: GenerarResultado = res.data?.data ?? res.data;
      setResultado(data);
      toast.success('Presupuesto calculado desde Excel');
      resetForm();
      onGenerated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al generar presupuesto';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const doGenerarLive = async (): Promise<void> => {
    setGenerating(true);
    setResultado(null);
    const toastId = toast.loading('Consultando ventas de OrderEat...');
    try {
      const res = await api.post('/presupuesto-ins/generar-live', {
        sucursalId,
        semana,
        fechaEjecucion,
      });
      const data: GenerarResultado = res.data?.data ?? res.data;
      setResultado(data);
      toast.success('Presupuesto calculado desde OrderEat', { id: toastId });
      resetForm();
      onGenerated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al consultar OrderEat';
      toast.error(msg, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerar = async (): Promise<void> => {
    if (!sucursalId) {
      toast.error('Selecciona una sucursal');
      return;
    }
    if (!semana) {
      toast.error('Selecciona una semana');
      return;
    }
    if (!fechaEjecucion) {
      toast.error('Selecciona la fecha de ejecucion');
      return;
    }
    if (!file) {
      toast.error('Selecciona el archivo Excel de ventas');
      return;
    }
    if (existingForSelection()) {
      setRegenPending({ mode: 'excel' });
      return;
    }
    await doGenerarExcel();
  };

  const handleGenerarLive = async (): Promise<void> => {
    if (!sucursalId) {
      toast.error('Selecciona una sucursal');
      return;
    }
    if (!semana) {
      toast.error('Selecciona una semana');
      return;
    }
    if (!fechaEjecucion) {
      toast.error('Selecciona la fecha de ejecucion');
      return;
    }
    if (existingForSelection()) {
      setRegenPending({ mode: 'live' });
      return;
    }
    await doGenerarLive();
  };

  const confirmRegen = async (): Promise<void> => {
    const mode = regenPending?.mode;
    setRegenPending(null);
    if (mode === 'excel') await doGenerarExcel();
    else if (mode === 'live') await doGenerarLive();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Generar Presupuesto desde Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="sucursal">Sucursal</Label>
              <Select value={sucursalId} onValueChange={setSucursalId}>
                <SelectTrigger id="sucursal" className="min-h-[44px] w-full">
                  <SelectValue placeholder="Selecciona sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.length === 0 ? (
                    <SelectEmpty
                      icon={DollarSign}
                      label="No hay sucursales activas"
                      hint="Crea una sucursal antes de generar presupuestos INS."
                    />
                  ) : (
                    sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.codigo} - {s.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="semana">Semana</Label>
              <Input
                id="semana"
                type="week"
                value={semana}
                onChange={(e) => setSemana(e.target.value)}
                className="min-h-[44px] w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaEjecucion">Fecha de Ejecucion</Label>
              <Input
                id="fechaEjecucion"
                type="date"
                value={fechaEjecucion}
                onChange={(e) => setFechaEjecucion(e.target.value)}
                className="min-h-[44px] w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Reporte Ventas (.xlsx)</Label>
              <Input
                id="file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="min-h-[44px] w-full"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={() => void handleGenerar()}
              disabled={generating}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Calcular desde Excel
                </>
              )}
            </Button>
            <Button
              onClick={() => void handleGenerarLive()}
              disabled={generating}
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Consulta las ventas de los ultimos 7 dias en OrderEat"
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Calcular desde OrderEat (live)
            </Button>
            {file ? <span className="text-sm text-muted-foreground">{file.name}</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Live: usa los ultimos 7 dias hasta la fecha de ejecucion. Requiere token de OrderEat
            configurado.
          </p>

          {resultado ? (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="space-y-3 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                      Monto Calculado
                    </div>
                    <div className="text-3xl font-bold text-slate-900 tabular-nums">
                      {formatMoney(resultado.montoCalculado)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:items-end">
                    <Badge className="bg-emerald-100 text-emerald-800">
                      {resultado.productosVinculados} productos vinculados
                    </Badge>
                    {resultado.productosNoEncontrados > 0 ? (
                      <Badge className="bg-amber-100 text-amber-800">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        {resultado.productosNoEncontrados} no encontrados
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {resultado.productosNoEncontrados > 0 ? (
                  <p className="text-sm text-amber-700">
                    Algunos productos del reporte no se pudieron vincular a platillos. Revisa el
                    mapeo en el modulo de platillos.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!regenPending}
        onOpenChange={(open) => {
          if (!open) setRegenPending(null);
        }}
        onConfirm={confirmRegen}
        variant="warning"
        title="Regenerar presupuesto"
        description={regenDescription()}
        confirmLabel="Regenerar"
      />
    </>
  );
}
