import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableSkeletonRows } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableShellProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  rowKey: (row: T) => string;
  /** Renders when data is empty AND not loading */
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  /** Row click handler (optional) */
  onRowClick?: (row: T) => void;
  /** Highlight rows matching a predicate (e.g. inactive = faded) */
  rowClassName?: (row: T) => string | undefined;
  /** Rendered above the table header (e.g. toolbar) */
  toolbar?: React.ReactNode;
  /** Sticky header when scrolling inside container */
  stickyHeader?: boolean;
  /** Max height (enables internal scroll with sticky header) */
  maxHeight?: string;
}

export function DataTableShell<T>({
  data,
  columns,
  loading = false,
  rowKey,
  emptyIcon,
  emptyTitle = 'Sin datos',
  emptyDescription,
  emptyAction,
  onRowClick,
  rowClassName,
  toolbar,
  stickyHeader = true,
  maxHeight,
}: DataTableShellProps<T>): JSX.Element {
  const showEmpty = !loading && data.length === 0;
  const colCount = columns.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {toolbar && (
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/40">{toolbar}</div>
      )}
      <div className={cn('overflow-auto', maxHeight)}>
        <Table>
          <TableHeader
            className={cn(stickyHeader && 'sticky top-0 z-10 backdrop-blur-sm bg-slate-50/95')}
          >
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead key={c.key} className={c.headerClassName}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows rows={5} cols={colCount} />
            ) : showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="p-0">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && 'cursor-pointer', rowClassName?.(row))}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.cellClassName}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
