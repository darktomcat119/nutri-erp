'use client';

import { useState, useEffect, useCallback } from 'react';
import { Key, CheckCircle2, AlertCircle, Clock, Trash2, Plug, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

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

function ageBadge(daysOld: number | null): { variant: 'default' | 'secondary' | 'destructive'; label: string } {
  if (daysOld === null) return { variant: 'secondary', label: '—' };
  if (daysOld < 2) return { variant: 'default', label: 'Reciente' };
  if (daysOld < 3) return { variant: 'secondary', label: 'Revisar' };
  return { variant: 'destructive', label: 'Caducado' };
}

export function IntegracionesOrderEat(): JSX.Element {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TokenStatus>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Sucursal | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

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
      toast.error('Token invalido');
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

  const testConnection = async (s: Sucursal) => {
    if (!s.cafeteriaId) {
      toast.error('Configurar OrderEat ID primero');
      return;
    }
    if (!statuses[s.id]?.configured) {
      toast.error('Configurar token primero');
      return;
    }
    const id = toast.loading(`Probando ${s.codigo}...`);
    try {
      const res = await api.get(`/ordereat/api/inventory/${s.id}`);
      const total = (res.data.data?.data?.totalProductos ?? res.data.data?.totalProductos) || 0;
      toast.success(`OK — ${total} productos en ${s.codigo}`, { id });
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error de conexion';
      toast.error(`${s.codigo}: ${msg}`, { id });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-400">
          <RefreshCw className="h-5 w-5 mx-auto mb-2 animate-spin" />
          Cargando sucursales...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-amber-900">OrderEat API</p>
            <p className="text-amber-800">
              Cada sucursal necesita su propio token de OrderEat. Los tokens se cifran antes de guardarse y no pueden volver a verse despues. Para reemplazarlo, pega uno nuevo.
            </p>
          </div>
        </CardContent>
      </Card>

      {sucursales.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Plug className="h-8 w-8 mx-auto mb-3" />
            No hay sucursales activas. Crea una en Catalogos &gt; Sucursales.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sucursales.map((s) => {
          const st = statuses[s.id];
          const age = ageBadge(st?.daysOld ?? null);
          const hasCafe = !!s.cafeteriaId;
          return (
            <Card key={s.id} className="border border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold">{s.codigo}</CardTitle>
                    <p className="text-xs text-slate-500 truncate">{s.nombre}</p>
                  </div>
                  {st?.configured ? (
                    <Badge variant={age.variant} className="text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {age.label}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-500">
                      No configurado
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">OrderEat ID</span>
                  <span className="font-mono font-medium">
                    {s.cafeteriaId || <span className="text-red-500">sin configurar</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Token</span>
                  {st?.configured ? (
                    <span className="font-mono font-medium text-slate-700">
                      ····{st.last4}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>

                {st?.configured && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Actualizado
                    </span>
                    <span className="text-slate-700">
                      {formatAge(st.daysOld)}
                      {st.updatedBy && <span className="text-slate-400 ml-1">· {st.updatedBy}</span>}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-1 border-t">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    onClick={() => openReplace(s)}
                    disabled={!hasCafe}
                    title={!hasCafe ? 'Configurar OrderEat ID primero' : ''}
                  >
                    <Key className="h-3.5 w-3.5 mr-1" />
                    {st?.configured ? 'Reemplazar' : 'Configurar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testConnection(s)}
                    disabled={!st?.configured}
                  >
                    <Plug className="h-3.5 w-3.5" />
                  </Button>
                  {st?.configured && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setClearingId(s.id)}
                      title="Eliminar token"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setTokenInput(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.codigo} — Token OrderEat
            </DialogTitle>
            <DialogDescription>
              Pega el JWT de OrderEat para esta sucursal. Sera cifrado y no podras volver a verlo. Si lo pierdes, puedes reemplazarlo aqui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>JWT Token</Label>
              <textarea
                className="w-full min-h-[120px] rounded-md border border-slate-200 px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-slate-400">
                Cafeteria ID esperada: <span className="font-mono">{editing?.cafeteriaId}</span>
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setEditing(null); setTokenInput(''); }}>
                Cancelar
              </Button>
              <Button onClick={saveToken} disabled={saving || tokenInput.trim().length < 20}>
                {saving ? 'Guardando...' : 'Guardar'}
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
    </div>
  );
}
