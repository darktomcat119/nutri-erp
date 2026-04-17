'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, ClipboardCheck,
  DollarSign, BarChart3, Users, Building2, Store, UtensilsCrossed,
  Settings, ChevronLeft, ChevronRight, LogOut, FileText, Route,
  Menu, X, FileSpreadsheet, Tag, Key,
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
    { label: 'Inicio', href: '/', icon: LayoutDashboard },
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
    { label: 'Presupuesto INS', href: '/presupuesto-ins', icon: DollarSign },
    { label: 'Requisiciones INS', href: '/requisiciones', icon: FileText },
    { label: 'Requisicion MOS', href: '/requisicion-mos', icon: Package },
    { label: 'Ordenes de Compra', href: '/ordenes-compra', icon: ShoppingCart },
    { label: 'Entregas', href: '/entregas', icon: Truck },
    { label: 'Recepciones', href: '/recepciones', icon: ClipboardCheck },
    { label: 'Integracion POS', href: '/pos', icon: FileSpreadsheet },
    { label: 'Control Financiero', href: '/financiero', icon: DollarSign },
    { label: 'Reportes', href: '/reportes', icon: BarChart3 },
    {
      label: 'Configuracion', href: '/config', icon: Settings,
      children: [
        { label: 'Usuarios', href: '/config/usuarios', icon: Users },
        { label: 'Categorias', href: '/config/categorias', icon: Tag },
        { label: 'Integraciones', href: '/config/integraciones', icon: Key },
      ],
    },
  ];

  const supervisor: NavItem[] = [
    { label: 'Inicio', href: '/', icon: LayoutDashboard },
    { label: 'Presupuesto INS', href: '/presupuesto-ins', icon: DollarSign },
    { label: 'Requisiciones INS', href: '/requisiciones', icon: FileText },
    { label: 'Requisicion MOS', href: '/requisicion-mos', icon: Package },
    { label: 'Ordenes de Compra', href: '/ordenes-compra', icon: ShoppingCart },
    { label: 'Entregas', href: '/entregas', icon: Truck },
    { label: 'Recepciones', href: '/recepciones', icon: ClipboardCheck },
    { label: 'Integracion POS', href: '/pos', icon: FileSpreadsheet },
    { label: 'Reportes', href: '/reportes', icon: BarChart3 },
  ];

  const encargado: NavItem[] = [
    { label: 'Inicio', href: '/', icon: LayoutDashboard },
    { label: 'Mi Requisicion INS', href: '/mi-requisicion', icon: FileText },
    { label: 'Mi Pedido MOS', href: '/requisicion-mos', icon: Package },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const navItems = getNavItems(user?.role || '');

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggleMenu = (label: string): void => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label]
    );
  };

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <nav className="px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 min-h-[42px]',
                      collapsed ? 'justify-center px-2' : '',
                      openMenus.includes(item.label) ? 'text-white bg-white/[0.08]' : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                    {!collapsed && (
                      <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-200', openMenus.includes(item.label) && 'rotate-90')} />
                    )}
                  </button>
                  {!collapsed && openMenus.includes(item.label) && (
                    <div className="ml-3 pl-3 border-l border-white/[0.08] space-y-0.5 mt-0.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-200 min-h-[38px]',
                            isActive(child.href)
                              ? 'text-white bg-blue-600/20 font-medium'
                              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
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
                        'flex items-center justify-center rounded-lg px-2 py-2.5 transition-all duration-200 min-h-[42px]',
                        isActive(item.href)
                          ? 'text-white bg-blue-600/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 min-h-[42px]',
                    isActive(item.href)
                      ? 'text-white bg-blue-600/20 shadow-sm shadow-blue-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                  {isActive(item.href) && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400" />
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="absolute bottom-0 w-full border-t border-white/[0.06] p-3">
        {!collapsed && user ? (
          <div className="space-y-2">
            <Link
              href="/perfil"
              className="flex items-center gap-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] transition-all duration-200 p-2.5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20">
                {user.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white truncate">{user.nombre}</p>
                <p className="text-[11px] text-slate-500">{user.role}{user.sucursal ? ` · ${user.sucursal.codigo}` : ''}</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              onClick={logout}
              className="w-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 min-h-[38px] text-[13px] justify-start"
            >
              <LogOut className="h-4 w-4 shrink-0 mr-2" />
              Cerrar Sesion
            </Button>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={logout}
                className="w-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 min-h-[42px] px-2"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">Cerrar Sesion</TooltipContent>
          </Tooltip>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-4 md:hidden shadow-sm">
        <Image src="/assets/images/logo.png" alt="Nutri Cafeteria" width={110} height={50} className="h-8 w-auto" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="h-10 w-10"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-[260px] bg-slate-900 transition-transform duration-300 ease-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between px-4 border-b border-white/[0.06]">
          <Image src="/assets/images/logo.png" alt="Nutri Cafeteria" width={110} height={50} className="h-7 w-auto brightness-0 invert" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-slate-900 transition-all duration-300 ease-out hidden md:block',
          collapsed ? 'w-[68px]' : 'w-[260px]'
        )}
      >
        <div className="flex h-14 items-center justify-between px-4 border-b border-white/[0.06]">
          {!collapsed && (
            <Image src="/assets/images/logo.png" alt="Nutri Cafeteria" width={110} height={50} className="h-7 w-auto brightness-0 invert" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
