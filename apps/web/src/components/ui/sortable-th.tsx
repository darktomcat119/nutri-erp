import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { SortDir } from '@/lib/useTableSort';
import { cn } from '@/lib/utils';

/**
 * Simple sortable header button for raw-JSX tables (no tanstack).
 * Pairs with `useTableSort()` — pass the hook's state in.
 *
 * Usage:
 *   const { sorted, sortKey, sortDir, toggleSort } = useTableSort(data);
 *   <TableHead>
 *     <SortableTh sortKey="nombre" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>
 *       Nombre
 *     </SortableTh>
 *   </TableHead>
 */
export function SortableTh({
  sortKey,
  activeKey,
  dir,
  onToggle,
  children,
  align = 'left',
}: {
  sortKey: string;
  activeKey: string | null;
  dir: SortDir;
  onToggle: (key: string) => void;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}): JSX.Element {
  const isActive = activeKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={cn(
        'inline-flex items-center gap-1.5 -mx-2 px-2 py-1 rounded-md transition-colors',
        'hover:bg-slate-200/60 active:bg-slate-200 select-none group',
        align === 'right' && 'justify-end w-full',
        align === 'center' && 'justify-center w-full',
        isActive && 'text-slate-800',
      )}
      title="Click para ordenar"
    >
      <span>{children}</span>
      {isActive ? (
        dir === 'asc' ? (
          <ArrowUp className="h-3 w-3 text-blue-600" />
        ) : (
          <ArrowDown className="h-3 w-3 text-blue-600" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-400" />
      )}
    </button>
  );
}
