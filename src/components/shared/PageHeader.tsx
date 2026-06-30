import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageHeaderTone =
  | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet'
  | 'cyan' | 'orange' | 'indigo' | 'sky' | 'pink'
  | 'teal' | 'fuchsia' | 'slate' | 'red' | 'lime';

const ACCENT: Record<PageHeaderTone, { bar: string; icon: string; ring: string; dot: string }> = {
  blue:     { bar: 'bg-blue-500',     icon: 'text-blue-600',     ring: 'ring-blue-100',     dot: 'bg-blue-500' },
  emerald:  { bar: 'bg-emerald-500',  icon: 'text-emerald-600',  ring: 'ring-emerald-100',  dot: 'bg-emerald-500' },
  amber:    { bar: 'bg-amber-500',    icon: 'text-amber-600',    ring: 'ring-amber-100',    dot: 'bg-amber-500' },
  rose:     { bar: 'bg-rose-500',     icon: 'text-rose-600',     ring: 'ring-rose-100',     dot: 'bg-rose-500' },
  violet:   { bar: 'bg-violet-500',   icon: 'text-violet-600',   ring: 'ring-violet-100',   dot: 'bg-violet-500' },
  cyan:     { bar: 'bg-cyan-500',     icon: 'text-cyan-600',     ring: 'ring-cyan-100',     dot: 'bg-cyan-500' },
  orange:   { bar: 'bg-orange-500',   icon: 'text-orange-600',   ring: 'ring-orange-100',   dot: 'bg-orange-500' },
  indigo:   { bar: 'bg-indigo-500',   icon: 'text-indigo-600',   ring: 'ring-indigo-100',   dot: 'bg-indigo-500' },
  sky:      { bar: 'bg-sky-500',      icon: 'text-sky-600',      ring: 'ring-sky-100',      dot: 'bg-sky-500' },
  pink:     { bar: 'bg-pink-500',     icon: 'text-pink-600',     ring: 'ring-pink-100',     dot: 'bg-pink-500' },
  teal:     { bar: 'bg-teal-500',     icon: 'text-teal-600',     ring: 'ring-teal-100',     dot: 'bg-teal-500' },
  fuchsia:  { bar: 'bg-fuchsia-500',  icon: 'text-fuchsia-600',  ring: 'ring-fuchsia-100',  dot: 'bg-fuchsia-500' },
  slate:    { bar: 'bg-slate-500',    icon: 'text-slate-600',    ring: 'ring-slate-100',    dot: 'bg-slate-500' },
  red:      { bar: 'bg-red-500',      icon: 'text-red-600',      ring: 'ring-red-100',      dot: 'bg-red-500' },
  lime:     { bar: 'bg-lime-500',     icon: 'text-lime-600',     ring: 'ring-lime-100',     dot: 'bg-lime-500' },
};

interface PageHeaderProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  tone?: PageHeaderTone;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ icon: Icon, title, description, tone = 'blue', actions, className }: PageHeaderProps) {
  const a = ACCENT[tone];
  return (
    <div className={cn('relative pb-5 mb-1 border-b border-border/60', className)}>
      {/* thin accent bar */}
      <span className={cn('absolute left-0 top-1.5 h-8 w-1 rounded-full', a.bar)} aria-hidden />
      <div className="flex items-center justify-between flex-wrap gap-4 pl-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-11 h-11 rounded-xl bg-card border border-border/60 flex items-center justify-center shrink-0 ring-4', a.ring)}>
            <Icon className={cn('h-5 w-5', a.icon)} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[1.55rem] font-bold tracking-tight leading-tight truncate text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

interface PastelStatCardProps {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: PageHeaderTone;
  onClick?: () => void;
  className?: string;
  trend?: 'up' | 'down' | 'flat';
}

export function PastelStatCard({ icon: Icon, label, value, hint, tone = 'blue', onClick, className, trend }: PastelStatCardProps) {
  const a = ACCENT[tone];
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/70 bg-card p-4 transition-all',
        'hover:border-border hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {/* top accent line */}
      <span className={cn('absolute inset-x-0 top-0 h-[3px]', a.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full', a.dot)} aria-hidden />
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">{label}</p>
          </div>
          <p className="text-[1.75rem] font-bold tracking-tight mt-2 text-foreground leading-none tabular-nums">
            {value}
          </p>
          {hint && (
            <p className={cn(
              'text-xs mt-2 truncate',
              trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-muted-foreground',
            )}>
              {hint}
            </p>
          )}
        </div>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted/60 ring-4', a.ring)}>
          <Icon className={cn('h-4 w-4', a.icon)} />
        </div>
      </div>
    </div>
  );
}
