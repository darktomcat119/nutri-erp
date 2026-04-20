'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  FileText,
  ShoppingCart,
  ClipboardCheck,
  Truck,
  AlertCircle,
  CheckCheck,
  KeyRound,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Notif = {
  id: string;
  icon: React.ElementType;
  iconTone: string;
  label: string;
  detail: string;
  time?: string;
  href: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function unwrap<T>(res: { data: { data?: T } | T }): T {
  const raw = res.data as { data?: T } | T;
  if (raw && typeof raw === 'object' && 'data' in (raw as object)) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

export function HeaderNotifications(): JSX.Element | null {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const items: Notif[] = [];
    try {
      const role = user.role;

      // Pending requisitions (ADMIN / SUPERVISOR)
      if (role === 'ADMIN' || role === 'SUPERVISOR') {
        try {
          const r = await api.get('/requisiciones');
          const list = unwrap<
            Array<{
              id: string;
              estado: string;
              createdAt: string;
              sucursal?: { codigo: string };
              creadoPor?: { nombre: string };
            }>
          >(r);
          const pending = (list || []).filter((x) => x.estado === 'ENVIADA').slice(0, 5);
          for (const rq of pending) {
            items.push({
              id: `req-${rq.id}`,
              icon: FileText,
              iconTone: 'bg-blue-50 text-blue-600',
              label: `Requisicion de ${rq.sucursal?.codigo || '—'}`,
              detail: `Enviada por ${rq.creadoPor?.nombre || '—'}. Requiere aprobacion.`,
              time: timeAgo(rq.createdAt),
              href: '/requisiciones',
            });
          }
        } catch {
          /* silent */
        }
      }

      // OCs pending approval / execution (ADMIN / SUPERVISOR)
      if (role === 'ADMIN' || role === 'SUPERVISOR') {
        try {
          const r = await api.get('/ordenes-compra');
          const list = unwrap<
            Array<{
              id: string;
              folio: string;
              estado: string;
              createdAt: string;
            }>
          >(r);
          const pending = (list || [])
            .filter((x) => x.estado === 'PENDIENTE' || x.estado === 'APROBADA')
            .slice(0, 5);
          for (const oc of pending) {
            items.push({
              id: `oc-${oc.id}`,
              icon: ShoppingCart,
              iconTone: 'bg-violet-50 text-violet-600',
              label: `OC ${oc.folio}`,
              detail:
                oc.estado === 'PENDIENTE' ? 'Pendiente de aprobacion' : 'Lista para ejecucion',
              time: timeAgo(oc.createdAt),
              href: '/ordenes-compra',
            });
          }
        } catch {
          /* silent */
        }
      }

      // Expired / soon-to-expire OrderEat tokens (ADMIN only)
      if (role === 'ADMIN') {
        try {
          const r = await api.get('/ordereat/status');
          const d = unwrap<{
            sucursales: Array<{
              codigo: string;
              tokenConfigured: boolean;
              tokenUpdatedAt: string | null;
            }>;
          }>(r);
          const now = Date.now();
          for (const s of d.sucursales || []) {
            if (!s.tokenConfigured || !s.tokenUpdatedAt) continue;
            const days = (now - new Date(s.tokenUpdatedAt).getTime()) / 86400000;
            if (days >= 2) {
              items.push({
                id: `tok-${s.codigo}`,
                icon: KeyRound,
                iconTone: days >= 3 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600',
                label: `Token ${s.codigo}`,
                detail:
                  days >= 3
                    ? `Caducado hace ${Math.floor(days - 3)}d. Actualizalo.`
                    : `Expira pronto (${Math.floor(3 - days)}d restantes)`,
                href: '/config/integraciones',
              });
            }
          }
        } catch {
          /* silent */
        }
      }

      // Pending receptions (ENCARGADO)
      if (role === 'ENCARGADO') {
        try {
          const r = await api.get('/recepciones/pendientes');
          const list = unwrap<
            Array<{
              id: string;
              ordenCompra?: { folio: string };
              createdAt: string;
            }>
          >(r);
          for (const rec of (list || []).slice(0, 5)) {
            items.push({
              id: `rec-${rec.id}`,
              icon: ClipboardCheck,
              iconTone: 'bg-teal-50 text-teal-600',
              label: `Entrega pendiente`,
              detail: `OC ${rec.ordenCompra?.folio || '—'}. Confirmar recepcion.`,
              time: timeAgo(rec.createdAt),
              href: '/recepciones',
            });
          }
        } catch {
          /* silent */
        }
      }

      // Today's route (CHOFER)
      if (role === 'CHOFER') {
        try {
          const r = await api.get('/ordenes-compra');
          const list = unwrap<Array<{ id: string; folio: string; estado: string }>>(r);
          const active = (list || []).filter(
            (x) => x.estado === 'APROBADA' || x.estado === 'EN_EJECUCION',
          );
          if (active.length > 0) {
            items.push({
              id: 'route',
              icon: Truck,
              iconTone: 'bg-amber-50 text-amber-600',
              label: `${active.length} OC${active.length === 1 ? '' : 's'} activa${active.length === 1 ? '' : 's'}`,
              detail: 'Revisa la ruta del dia',
              href: '/ruta',
            });
          }
        } catch {
          /* silent */
        }
      }

      setNotifs(items);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh on mount, on route change, and every 60s
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load, pathname]);

  if (!user) return null;
  const count = notifs.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label={`Notificaciones${count ? ` (${count} pendientes)` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Notificaciones</div>
            <div className="text-[11px] text-slate-500">
              {loading
                ? 'Cargando...'
                : count === 0
                  ? 'Sin pendientes'
                  : `${count} pendiente${count === 1 ? '' : 's'}`}
            </div>
          </div>
          {count === 0 && !loading && <CheckCheck className="h-4 w-4 text-emerald-500" />}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              Cargando pendientes...
            </div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-2.5">
                <CheckCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Todo al dia</p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-[220px]">
                No hay pendientes que requieran tu atencion.
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {notifs.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    className="flex items-start gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                        n.iconTone,
                      )}
                    >
                      <n.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-semibold text-slate-900 truncate">
                          {n.label}
                        </span>
                        {n.time && (
                          <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                            {n.time}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{n.detail}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {count > 0 && (
          <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Actualizado cada 60s
            </span>
            <button
              onClick={load}
              className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
            >
              Refrescar
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
