import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "blue" | "slate" | "amber" | "emerald" | "rose" | "violet";

const toneMap: Record<Tone, { bg: string; ring: string; icon: string; glow: string }> = {
  blue:    { bg: "bg-blue-50",    ring: "ring-blue-100",    icon: "text-blue-500",    glow: "from-blue-100/60" },
  slate:   { bg: "bg-slate-50",   ring: "ring-slate-100",   icon: "text-slate-500",   glow: "from-slate-100/60" },
  amber:   { bg: "bg-amber-50",   ring: "ring-amber-100",   icon: "text-amber-500",   glow: "from-amber-100/60" },
  emerald: { bg: "bg-emerald-50", ring: "ring-emerald-100", icon: "text-emerald-500", glow: "from-emerald-100/60" },
  rose:    { bg: "bg-rose-50",    ring: "ring-rose-100",    icon: "text-rose-500",    glow: "from-rose-100/60" },
  violet:  { bg: "bg-violet-50",  ring: "ring-violet-100",  icon: "text-violet-500",  glow: "from-violet-100/60" },
};

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: Tone;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = "slate",
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const t = toneMap[tone];
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center text-center px-6 py-16 rounded-2xl border border-dashed border-border bg-card/40 overflow-hidden",
        className
      )}
    >
      {/* soft radial glow */}
      <div
        className={cn(
          "pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-gradient-to-b to-transparent blur-2xl opacity-70",
          t.glow,
        )}
        aria-hidden
      />
      {/* dotted backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground)/0.18) 1px, transparent 0)',
          backgroundSize: '14px 14px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center ring-[10px] shadow-sm", t.bg, t.ring)}>
          <Icon className={cn("w-8 h-8", t.icon)} aria-hidden="true" />
        </div>
      </div>
      <h3 className="relative mt-5 text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="relative mt-1.5 text-sm text-muted-foreground max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="relative mt-6 flex items-center gap-2">
          {action && (
            <Button onClick={action.onClick} size="sm">{action.label}</Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} size="sm" variant="outline">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
