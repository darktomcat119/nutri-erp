import { Inbox, type LucideIcon } from 'lucide-react';

export function SelectEmpty({
  icon: Icon = Inbox,
  label = 'Sin opciones disponibles',
  hint,
}: {
  icon?: LucideIcon;
  label?: string;
  hint?: string;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
      <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center mb-2">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="text-xs font-medium text-slate-700">{label}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5 max-w-[220px]">{hint}</p>}
    </div>
  );
}
