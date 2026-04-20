import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Column } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

/**
 * Clickable header that toggles sort state on a tanstack column.
 * Usage:
 *   { accessorKey: 'nombre', header: ({ column }) => <SortableHeader column={column}>Nombre</SortableHeader> }
 */
export function SortableHeader<TData, TValue>({
  column,
  children,
  align = 'left',
}: {
  column: Column<TData, TValue>;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}): JSX.Element {
  const sorted = column.getIsSorted();
  const canSort = column.getCanSort();

  if (!canSort) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1',
          align === 'right' && 'justify-end w-full',
          align === 'center' && 'justify-center w-full',
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting()}
      className={cn(
        'inline-flex items-center gap-1.5 -mx-2 px-2 py-1 rounded-md transition-colors',
        'hover:bg-slate-200/60 active:bg-slate-200 select-none',
        align === 'right' && 'justify-end w-full',
        align === 'center' && 'justify-center w-full',
        sorted && 'text-slate-800',
      )}
      title="Click para ordenar"
    >
      <span>{children}</span>
      {sorted === 'asc' ? (
        <ArrowUp className="h-3 w-3 text-blue-600" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3 w-3 text-blue-600" />
      ) : (
        <ArrowUpDown className="h-3 w-3 text-slate-300 group-hover:text-slate-400" />
      )}
    </button>
  );
}
