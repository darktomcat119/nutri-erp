'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  ClipboardCheck,
  DollarSign,
  BarChart3,
  Users,
  Building2,
  Store,
  UtensilsCrossed,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  FileText,
  Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: NavItem[];
}

function getNavItems(role: string): NavItem[] {
  const admin: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    {
      label: 'Catalogos', href: '/catalogos', icon: Package,
      children: [
        { label: 'Productos', href: '/catalogos/productos', icon: Package },
        { label: 'Insumos', href: '/catalogos/insumos', icon: UtensilsCrossed },
        { label: 'Platillos', href: '/catalogos/platillos', icon: UtensilsCrossed },
        { label: 'Proveedores', href: '/catalogos/proveedores', icon: Store },
        { label: 'Sucursales', href: '/catalogos/sucursales', icon: Building2 },
      ],
    },
    { label: 'Requisiciones', href: '/requisiciones', icon: FileText },
    { label: 'Ordenes de Compra', href: '/ordenes-compra', icon: ShoppingCart },
    { label: 'Entregas', href: '/entregas', icon: Truck },
    { label: 'Recepciones', href: '/recepciones', icon: ClipboardCheck },
    { label: 'Control Financiero', href: '/financiero', icon: DollarSign },
    { label: 'Reportes', href: '/reportes', icon: BarChart3 },
    {
      label: 'Configuracion', href: '/config', icon: Settings,
      children: [
        { label: 'Usuarios', href: '/config/usuarios', icon: Users },
      ],
    },
  ];

  const supervisor: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Requisiciones', href: '/requisiciones', icon: FileText },
    { label: 'Ordenes de Compra', href: '/ordenes-compra', icon: ShoppingCart },
    { label: 'Entregas', href: '/entregas', icon: Truck },
    { label: 'Recepciones', href: '/recepciones', icon: ClipboardCheck },
    { label: 'Reportes', href: '/reportes', icon: BarChart3 },
  ];

  const encargado: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Mi Requisicion', href: '/mi-requisicion', icon: FileText },
    { label: 'Entregas Pendientes', href: '/entregas', icon: Truck },
    { label: 'Recepcion', href: '/recepciones', icon: ClipboardCheck },
  ];

  const chofer: NavItem[] = [
    { label: 'Ruta del Dia', href: '/ruta', icon: Route },
    { label: 'Orden de Compra', href: '/ordenes-compra', icon: ShoppingCart },
  ];

  switch (role) {
    case 'ADMIN': return admin;
    case 'SUPERVISOR': return supervisor;
    case 'ENCARGADO': return encargado;
    case 'CHOFER': return chofer;
    default: return [];
  }
}

export function Sidebar(): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const navItems = getNavItems(user?.role || '');

  const toggleMenu = (label: string): void => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    );
  };

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
        {!collapsed && (
          <span className="text-lg font-bold text-slate-900">Nutri ERP</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <nav className="space-y-1 p-2">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100',
                      collapsed && 'justify-center px-2'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                  {!collapsed && openMenus.includes(item.label) && (
                    <div className="ml-4 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100',
                            isActive(child.href) && 'bg-blue-50 text-blue-600 font-medium'
                          )}
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : collapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center justify-center rounded-md px-2 py-2 text-slate-700 hover:bg-slate-100',
                        isActive(item.href) && 'bg-blue-50 text-blue-600'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100',
                    isActive(item.href) && 'bg-blue-50 text-blue-600'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="absolute bottom-0 w-full border-t border-slate-200 p-2">
        {!collapsed && user && (
          <div className="mb-2 px-3 py-1">
            <p className="text-sm font-medium text-slate-900 truncate">{user.nombre}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={logout}
          className={cn('w-full text-slate-600 hover:text-red-600', collapsed && 'px-2')}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="ml-2">Cerrar Sesion</span>}
        </Button>
      </div>
    </aside>
  );
}
