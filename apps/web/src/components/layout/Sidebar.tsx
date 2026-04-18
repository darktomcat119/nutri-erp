'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, ClipboardCheck,
  DollarSign, BarChart3, Users, Building2, Store, UtensilsCrossed,
  Settings, ChevronLeft, ChevronRight, FileText, Route,
  X, FileSpreadsheet, Tag, Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

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

export function Sidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onCollapsedChange,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}): JSX.Element {
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const pathname = usePathname();
  const { user } = useAuthStore();

  const navItems = getNavItems(user?.role || '');

  useEffect(() => { onMobileClose(); }, [pathname, onMobileClose]);

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
    <ScrollArea className="h-[calc(100vh-3.5rem)]">
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
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={onMobileClose}
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
          <Image src="/assets/images/logo.png" alt="Nutri Cafeteria" width={110} height={50} className="h-8 w-auto" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
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
            <Image src="/assets/images/logo.png" alt="Nutri Cafeteria" width={110} height={50} className="h-8 w-auto" />
          )}
          <button
            onClick={() => onCollapsedChange(!collapsed)}
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
