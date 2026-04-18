'use client';

import { useState, useEffect, useCallback } from 'react';
import { Key, CheckCircle2, AlertCircle, Clock, Trash2, Plug, Info, Building2, Loader2, Download } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CardGridSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressDialog, type ProgressStep } from '@/components/ui/progress-dialog';
import { cn } from '@/lib/utils';

interface Sucursal {
  id: string;
  codigo: string;
  nombre: string;
  cafeteriaId: string | null;
  activa: boolean;
}

interface TokenStatus {
  cafeteriaId: string | null;
  configured: boolean;
  last4: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  daysOld: number | null;
}

function formatAge(daysOld: number | null): string {
  if (daysOld === null) return '';
  if (daysOld === 0) return 'hoy';
  if (daysOld === 1) return 'hace 1 dia';
  return `hace ${daysOld} dias`;
}

type AgeLevel = 'none' | 'fresh' | 'warn' | 'expired';
function ageLevel(daysOld: number | null): AgeLevel {
  if (daysOld === null) return 'none';
  if (daysOld < 2) return 'fresh';
  if (daysOld < 3) return 'warn';
  return 'expired';
}

const AGE_STYLES: Record<AgeLevel, { badge: string; dot: string; accent: string; label: string }> = {
  none:    { badge: 'bg-slate-100 text-slate-600',       dot: 'bg-slate-400',   accent: 'from-slate-400/10',  label: '—' },
  fresh:   { badge: 'bg-emerald-100 text-emerald-700',   dot: 'bg-emerald-500', accent: 'from-emerald-500/10', label: 'Activo' },
  warn:    { badge: 'bg-amber-100 text-amber-700',       dot: 'bg-amber-500',   accent: 'from-amber-500/10',  label: 'Revisar' },
  expired: { badge: 'bg-red-100 text-red-700',           dot: 'bg-red-500',     accent: 'from-red-500/10',    label: 'Caducado' },
};

export function IntegracionesOrderEat(): JSX.Element {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TokenStatus>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Sucursal | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  // Sync-products progress
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncSteps, setSyncSteps] = useState<ProgressStep[]>([]);
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncSummary, setSyncSummary] = useState<React.ReactNode>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/sucursales');
      const rows = (res.data.data || []) as Sucursal[];
      const active = rows.filter(s => s.activa !== false);
      setSucursales(active);

      const statusMap: Record<string, TokenStatus> = {};
      await Promise.all(active.map(async (s) => {
        try {
          const st = await api.get(`/sucursales/${s.id}/ordereat-token-status`);
          statusMap[s.id] = st.data.data as TokenStatus;
        } catch {
          statusMap[s.id] = { cafeteriaId: s.cafeteriaId, configured: false, last4: null, updatedAt: null, updatedBy: null, daysOld: null };
        }
      }));
      setStatuses(statusMap);
    } catch {
      toast.error('Error al cargar sucursales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openReplace = (s: Sucursal) => {
    setEditing(s);
    setTokenInput('');
  };

  const saveToken = async () => {
    if (!editing) return;
    const trimmed = tokenInput.trim();
    if (trimmed.length < 20) {
      toast.error('Token invalido — debe tener al menos 20 caracteres');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/sucursales/${editing.id}/ordereat-token`, { token: trimmed });
      toast.success(`Token guardado para ${editing.codigo}`);
      setEditing(null);
      setTokenInput('');
      load();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar token';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const clearToken = async () => {
    if (!clearingId) return;
    try {
      await api.delete(`/sucursales/${clearingId}/ordereat-token`);
      toast.success('Token eliminado');
      setClearingId(null);
      load();
    } catch {
      toast.error('Error al eliminar token');
    }
  };

  const syncAllProducts = async () => {
    const eligible = sucursales.filter(s => statuses[s.id]?.configured && s.cafeteriaId);
    if (eligible.length === 0) {
      toast.error('No hay sucursales con token configurado para sincronizar');
      return;
    }
    const initial: ProgressStep[] = eligible.map(s => ({
      label: `${s.codigo} (cafe ${s.cafeteriaId})`,
      status: 'pending',
    }));
    setSyncSteps(initial);
    setSyncRunning(true);
    setSyncSummary(null);
    setSyncOpen(true);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < eligible.length; i++) {
      const s = eligible[i];
      setSyncSteps(prev => prev.map((step, idx) => idx === i ? { ...step, status: 'running', detail: 'consultando OrderEat...' } : step));
      try {
        const r = await api.post(`/ordereat/api/import-products/${s.id}`);
        const d = (r.data?.data?.data ?? r.data?.data) as {
          total: number; created: number; updated: number; skipped: number;
        };
        totalCreated += d.created;
        totalUpdated += d.updated;
        totalSkipped += d.skipped;
        setSyncSteps(prev => prev.map((step, idx) => idx === i ? {
          ...step,
          status: 'done',
          detail: `${d.total} productos · ${d.created} nuevos, ${d.updated} actualizados${d.skipped ? `, ${d.skipped} omitidos` : ''}`,
        } : step));
      } catch (e) {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error';
        setSyncSteps(prev => prev.map((step, idx) => idx === i ? { ...step, status: 'error', detail: msg } : step));
      }
    }

    setSyncSummary(
      <div className="space-y-1">
        <div>
          <strong className="text-slate-900">{totalCreated}</strong> productos nuevos ·{' '}
          <strong className="text-slate-900">{totalUpdated}</strong> actualizados
          {totalSkipped > 0 && <> · <strong className="text-amber-600">{totalSkipped}</strong> omitidos</>}
        </div>
        <div className="text-slate-500">
          Los productos se guardaron en Catalogos → Productos. Ahora &quot;Calcular desde OrderEat (live)&quot; podra emparejar correctamente.
        </div>
      </div>
    );
    setSyncRunning(false);
  };

  const testConnection = async (s: Sucursal) => {
    if (!s.cafeteriaId) { toast.error('Configurar OrderEat ID primero'); return; }
    if (!statuses[s.id]?.configured) { toast.error('Configurar token primero'); return; }
    setTestingId(s.id);
    const id = toast.loading(`Probando conexion con ${s.codigo}...`);
    try {
      const res = await api.get(`/ordereat/api/inventory/${s.id}`);
      const inner = res.data?.data?.data ?? res.data?.data;
      const total = inner?.totalProductos ?? 0;
      toast.success(`${s.codigo}: ${total} productos sincronizados`, { id });
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error de conexion';
      toast.error(`${s.codigo}: ${msg}`, { id });
    } finally {
      setTestingId(null);
    }
  };

  const configured = sucursales.filter(s => statuses[s.id]?.configured).length;
  const withCafeId = sucursales.filter(s => s.cafeteriaId).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 rounded-xl shimmer" />
        <CardGridSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-amber-50/30 p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Info className="h-4 w-4 text-amber-700" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-amber-950 text-sm">OrderEat API — Tokens por sucursal</p>
              {sucursales.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-amber-700 font-medium">
                    {configured}/{sucursales.length} configurados
                  </span>
                </div>
              )}
            </div>
            <p className="text-[13px] text-amber-800/90 leading-relaxed">
              Cada sucursal necesita su propio JWT de OrderEat. Los tokens se cifran con AES-256-GCM antes de guardarse y no pueden volver a verse despues. Si lo pierdes, pega uno nuevo.
            </p>
          </div>
        </div>
      </div>

      {/* Sync products bar */}
      {sucursales.length > 0 && configured > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-slate-600" />
              <p className="font-semibold text-slate-900 text-sm">Sincronizar catalogo desde OrderEat</p>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Importa todos los productos con inventario de las sucursales configuradas. Los productos existentes se actualizan, los nuevos se crean con <code className="text-[11px] px-1 py-0.5 rounded bg-slate-100">pzXDisplay=24</code> por defecto.
            </p>
          </div>
          <Button onClick={syncAllProducts} disabled={syncRunning} className="shadow-sm sm:shrink-0">
            {syncRunning
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sincronizando...</>
              : <><Download className="h-4 w-4 mr-2" /> Sincronizar ({configured} {configured === 1 ? 'sucursal' : 'sucursales'})</>}
          </Button>
        </div>
      )}

      {/* Empty state */}
      {sucursales.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState
            icon={Building2}
            title="No hay sucursales activas"
            description="Crea al menos una sucursal en Catalogos > Sucursales para poder configurar tokens de OrderEat."
          />
        </div>
      )}

      {/* Cards grid */}
      {sucursales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sucursales.map((s) => {
            const st = statuses[s.id];
            const level = ageLevel(st?.daysOld ?? null);
            const styles = AGE_STYLES[st?.configured ? level : 'none'];
            const hasCafe = !!s.cafeteriaId;
            const isConfigured = !!st?.configured;
            const isTesting = testingId === s.id;

            return (
              <div
                key={s.id}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white hover:shadow-lg hover:border-slate-300 transition-all duration-200"
              >
                {/* Decorative accent */}
                <div className={cn('absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br to-transparent -translate-y-12 translate-x-12', styles.accent)} />

                <div className="relative p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('inline-block h-2 w-2 rounded-full', styles.dot)} />
                        <h3 className="font-bold text-slate-900 text-[15px] truncate">{s.codigo}</h3>
                      </div>
                      <p className="text-[12px] text-slate-500 truncate">{s.nombre}</p>
                    </div>
                    <span className={cn(
                      'shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full',
                      styles.badge,
                    )}>
                      {isConfigured ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {isConfigured ? styles.label : 'No configurado'}
                    </span>
                  </div>

                  {/* Data grid */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">OrderEat ID</div>
                      {s.cafeteriaId
                        ? <div className="font-mono text-sm font-semibold text-slate-900">{s.cafeteriaId}</div>
                        : <div className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Sin configurar</div>}
                    </div>
                    <div>
                      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Token</div>
                      {isConfigured
                        ? <div className="font-mono text-sm font-semibold text-slate-900">····{st.last4}</div>
                        : <div className="text-xs text-slate-400">—</div>}
                    </div>
                  </div>

                  {isConfigured && (
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Actualizado {formatAge(st.daysOld)}
                      </span>
                      {st.updatedBy && (
                        <span className="truncate text-slate-400 text-[10px]">{st.updatedBy}</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 shadow-sm"
                      onClick={() => openReplace(s)}
                      disabled={!hasCafe}
                      title={!hasCafe ? 'Configurar OrderEat ID primero' : ''}
                    >
                      <Key className="h-3.5 w-3.5 mr-1.5" />
                      {isConfigured ? 'Reemplazar' : 'Configurar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testConnection(s)}
                      disabled={!isConfigured || isTesting}
                      title="Probar conexion con OrderEat"
                    >
                      {isTesting
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Plug className="h-3.5 w-3.5" />}
                    </Button>
                    {isConfigured && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setClearingId(s.id)}
                        title="Eliminar token"
                        className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {sucursales.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 px-1">
          <span>{withCafeId} / {sucursales.length} sucursales con OrderEat ID</span>
          <span>{configured} / {sucursales.length} con token configurado</span>
        </div>
      )}

      {/* Replace token dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setTokenInput(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-600" />
              {editing?.codigo} — Token OrderEat
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Pega el JWT de OrderEat para esta sucursal. Se cifra con AES-256-GCM antes de guardarse y no podras volver a verlo. Si lo pierdes, puedes reemplazarlo aqui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 flex items-center gap-2 text-xs">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-500">Cafeteria ID esperada:</span>
              <span className="font-mono font-semibold text-slate-900 ml-auto">{editing?.cafeteriaId}</span>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">JWT Token</Label>
              <textarea
                className="w-full min-h-[140px] rounded-lg border border-slate-200 px-3 py-2.5 text-[12px] font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors placeholder:text-slate-300"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                autoFocus
              />
              <p className="text-[11px] text-slate-400">
                {tokenInput.length > 0 && `${tokenInput.length} caracteres`}
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => { setEditing(null); setTokenInput(''); }} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={saveToken} disabled={saving || tokenInput.trim().length < 20}>
                {saving
                  ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Guardando...</>
                  : 'Guardar token'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!clearingId}
        onOpenChange={(o) => { if (!o) setClearingId(null); }}
        onConfirm={clearToken}
        title="Eliminar token"
        description="Esta sucursal no podra sincronizar con OrderEat hasta que configures un nuevo token."
        confirmLabel="Eliminar"
      />

      <ProgressDialog
        open={syncOpen}
        onOpenChange={setSyncOpen}
        title="Sincronizando productos desde OrderEat"
        description="Consultando inventario live y actualizando el catalogo local. No cierres esta ventana."
        steps={syncSteps}
        running={syncRunning}
        summary={syncSummary}
        onClose={() => {
          setSyncOpen(false);
          setSyncSteps([]);
          setSyncSummary(null);
        }}
      />
    </div>
  );
}
