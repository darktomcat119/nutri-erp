import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({
  className,
  size = 'default',
}: {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}): JSX.Element {
  const sizes = { sm: 'h-3.5 w-3.5', default: 'h-5 w-5', lg: 'h-7 w-7' };
  return <Loader2 className={cn('animate-spin text-slate-400', sizes[size], className)} />;
}

export function LoadingInline({
  label = 'Cargando...',
  className,
}: {
  label?: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('flex items-center justify-center gap-2.5 py-8 text-sm text-slate-500', className)}>
      <Spinner size="default" />
      <span>{label}</span>
    </div>
  );
}

export function LoadingOverlay({ label = 'Cargando...' }: { label?: string }): JSX.Element {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-lg">
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" className="text-blue-500" />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}
