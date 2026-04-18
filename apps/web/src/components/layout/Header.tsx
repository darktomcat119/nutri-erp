'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, User as UserIcon, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const TITLES: Record<string, string> = {
  '/': 'Inicio',
  '/catalogos': 'Catalogos',
  '/catalogos/productos': 'Productos',
  '/catalogos/insumos': 'Insumos',
  '/catalogos/platillos': 'Platillos',
  '/catalogos/proveedores': 'Proveedores',
  '/catalogos/sucursales': 'Sucursales',
  '/requisiciones': 'Requisiciones INS',
  '/requisicion-mos': 'Requisicion MOS',
  '/mi-requisicion': 'Mi Requisicion INS',
  '/presupuesto-ins': 'Presupuesto INS',
  '/ordenes-compra': 'Ordenes de Compra',
  '/entregas': 'Entregas',
  '/recepciones': 'Recepciones',
  '/ruta': 'Ruta del Dia',
  '/pos': 'Integracion POS',
  '/financiero': 'Control Financiero',
  '/reportes': 'Reportes',
  '/config': 'Configuracion',
  '/config/usuarios': 'Usuarios',
  '/config/categorias': 'Categorias',
  '/config/integraciones': 'Integraciones',
  '/perfil': 'Mi Perfil',
};

function buildBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  if (pathname === '/') return [{ label: 'Inicio', href: '/' }];
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: Array<{ label: string; href: string }> = [{ label: 'Inicio', href: '/' }];
  let acc = '';
  for (const p of parts) {
    acc += `/${p}`;
    const label = TITLES[acc] || p.charAt(0).toUpperCase() + p.slice(1);
    crumbs.push({ label, href: acc });
  }
  return crumbs;
}

function roleLabel(role?: string): string {
  switch (role) {
    case 'ADMIN': return 'Administrador';
    case 'SUPERVISOR': return 'Supervisor';
    case 'ENCARGADO': return 'Encargado';
    case 'CHOFER': return 'Chofer';
    default: return '';
  }
}

function roleColor(role?: string): string {
  switch (role) {
    case 'ADMIN': return 'bg-violet-500/10 text-violet-700 border-violet-200';
    case 'SUPERVISOR': return 'bg-blue-500/10 text-blue-700 border-blue-200';
    case 'ENCARGADO': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
    case 'CHOFER': return 'bg-amber-500/10 text-amber-700 border-amber-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function Header({ onMobileMenuClick }: { onMobileMenuClick: () => void }): JSX.Element {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const crumbs = buildBreadcrumbs(pathname);
  const current = crumbs[crumbs.length - 1];
  const initial = user?.nombre?.charAt(0).toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 sm:px-6 lg:px-8 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_0_0_rgba(0,0,0,0.02)]">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMobileMenuClick}
        className="h-9 w-9 md:hidden shrink-0"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Title + breadcrumbs */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-0.5 truncate">
          {crumbs.slice(0, -1).map((c, i) => (
            <span key={c.href} className="flex items-center gap-1.5">
              <Link href={c.href} className="hover:text-slate-700 transition-colors">
                {c.label}
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-300" />
              {i === crumbs.length - 2 && null}
            </span>
          ))}
        </div>
        <h1 className="text-[15px] font-semibold text-slate-900 truncate leading-tight">
          {current?.label || 'Nutri Cafeteria'}
        </h1>
      </div>

      {/* User menu */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors px-1.5 py-1 -mr-1.5 shrink-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[13px] font-bold shadow-sm shadow-blue-500/20">
                {initial}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <div className="text-[13px] font-semibold text-slate-900 truncate max-w-[120px]">{user.nombre}</div>
                <div className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">
                  {user.sucursal?.codigo ? `${user.sucursal.codigo} · ` : ''}{user.email}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 truncate">{user.nombre}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={cn('inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border', roleColor(user.role))}>
                  {roleLabel(user.role)}
                </span>
                {user.sucursal && (
                  <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {user.sucursal.codigo}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/perfil" className="cursor-pointer">
                <UserIcon className="h-4 w-4 mr-2" />
                Mi Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
