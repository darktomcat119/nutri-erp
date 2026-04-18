import { cn } from '@/lib/utils';
import { TableCell, TableRow } from '@/components/ui/table';

export function TableSkeletonRows({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}): JSX.Element {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className={cn('border-b border-slate-100', className)}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <div
                className="h-3.5 shimmer rounded-full"
                style={{
                  width: `${35 + ((i * 7 + j * 11) % 45)}%`,
                  animationDelay: `${(i * cols + j) * 60}ms`,
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function CardSkeleton({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-5 space-y-3', className)}>
      <div className="h-4 w-1/3 shimmer rounded-full" />
      <div className="h-8 w-2/3 shimmer rounded" />
      <div className="space-y-2 pt-2">
        <div className="h-2.5 w-full shimmer rounded-full" />
        <div className="h-2.5 w-4/5 shimmer rounded-full" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3, className }: { count?: number; className?: string }): JSX.Element {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
