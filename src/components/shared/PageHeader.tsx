import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageHeaderTone =
  | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet'
  | 'cyan' | 'orange' | 'indigo' | 'sky' | 'pink'
  | 'teal' | 'fuchsia' | 'slate' | 'red' | 'lime';

const TONE_MAP: Record<PageHeaderTone, string> = {
  blue: 'from-blue-400 to-blue-600',
  emerald: 'from-emerald-400 to-emerald-600',
  amber: 'from-amber-400 to-amber-600',
  rose: 'from-rose-400 to-rose-600',
  violet: 'from-violet-400 to-violet-600',
  cyan: 'from-cyan-400 to-cyan-600',
  orange: 'from-orange-400 to-orange-600',
  indigo: 'from-indigo-400 to-indigo-600',
  sky: 'from-sky-400 to-sky-600',
  pink: 'from-pink-400 to-pink-600',
  teal: 'from-teal-400 to-teal-600',
  fuchsia: 'from-fuchsia-400 to-fuchsia-600',
  slate: 'from-slate-400 to-slate-600',
  red: 'from-red-400 to-red-600',
  lime: 'from-lime-400 to-lime-600',
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
  return (
    <div className={cn('flex items-center justify-between flex-wrap gap-4', className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white shadow-sm shrink-0', TONE_MAP[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

const STAT_TONE: Record<PageHeaderTone, { bg: string; border: string; icon: string }> = {
  blue: { bg: 'from-blue-50 via-white to-white dark:from-blue-950/30 dark:via-background dark:to-background', border: 'border-blue-200/60', icon: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300' },
  emerald: { bg: 'from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-background dark:to-background', border: 'border-emerald-200/60', icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300' },
  amber: { bg: 'from-amber-50 via-white to-white dark:from-amber-950/30 dark:via-background dark:to-background', border: 'border-amber-200/60', icon: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300' },
  rose: { bg: 'from-rose-50 via-white to-white dark:from-rose-950/30 dark:via-background dark:to-background', border: 'border-rose-200/60', icon: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300' },
  violet: { bg: 'from-violet-50 via-white to-white dark:from-violet-950/30 dark:via-background dark:to-background', border: 'border-violet-200/60', icon: 'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300' },
  cyan: { bg: 'from-cyan-50 via-white to-white dark:from-cyan-950/30 dark:via-background dark:to-background', border: 'border-cyan-200/60', icon: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-300' },
  orange: { bg: 'from-orange-50 via-white to-white dark:from-orange-950/30 dark:via-background dark:to-background', border: 'border-orange-200/60', icon: 'bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300' },
  indigo: { bg: 'from-indigo-50 via-white to-white dark:from-indigo-950/30 dark:via-background dark:to-background', border: 'border-indigo-200/60', icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300' },
  sky: { bg: 'from-sky-50 via-white to-white dark:from-sky-950/30 dark:via-background dark:to-background', border: 'border-sky-200/60', icon: 'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300' },
  pink: { bg: 'from-pink-50 via-white to-white dark:from-pink-950/30 dark:via-background dark:to-background', border: 'border-pink-200/60', icon: 'bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300' },
  teal: { bg: 'from-teal-50 via-white to-white dark:from-teal-950/30 dark:via-background dark:to-background', border: 'border-teal-200/60', icon: 'bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300' },
  fuchsia: { bg: 'from-fuchsia-50 via-white to-white dark:from-fuchsia-950/30 dark:via-background dark:to-background', border: 'border-fuchsia-200/60', icon: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-950/50 dark:text-fuchsia-300' },
  slate: { bg: 'from-slate-50 via-white to-white dark:from-slate-950/30 dark:via-background dark:to-background', border: 'border-slate-200/60', icon: 'bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300' },
  red: { bg: 'from-red-50 via-white to-white dark:from-red-950/30 dark:via-background dark:to-background', border: 'border-red-200/60', icon: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-300' },
  lime: { bg: 'from-lime-50 via-white to-white dark:from-lime-950/30 dark:via-background dark:to-background', border: 'border-lime-200/60', icon: 'bg-lime-100 text-lime-600 dark:bg-lime-950/50 dark:text-lime-300' },
};

interface PastelStatCardProps {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: PageHeaderTone;
  onClick?: () => void;
  className?: string;
}

export function PastelStatCard({ icon: Icon, label, value, hint, tone = 'blue', onClick, className }: PastelStatCardProps) {
  const t = STAT_TONE[tone];
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-shadow',
        t.bg,
        t.border,
        onClick && 'cursor-pointer hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={cn('p-2 rounded-lg shrink-0', t.icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
