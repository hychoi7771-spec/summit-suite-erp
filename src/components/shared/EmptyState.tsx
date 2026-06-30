import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "blue" | "slate" | "amber" | "emerald" | "rose" | "violet";

const toneMap: Record<Tone, { bg: string; ring: string; icon: string }> = {
  blue: { bg: "bg-blue-50", ring: "ring-blue-100", icon: "text-blue-500" },
  slate: { bg: "bg-slate-50", ring: "ring-slate-100", icon: "text-slate-500" },
  amber: { bg: "bg-amber-50", ring: "ring-amber-100", icon: "text-amber-500" },
  emerald: { bg: "bg-emerald-50", ring: "ring-emerald-100", icon: "text-emerald-500" },
  rose: { bg: "bg-rose-50", ring: "ring-rose-100", icon: "text-rose-500" },
  violet: { bg: "bg-violet-50", ring: "ring-violet-100", icon: "text-violet-500" },
};

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: Tone;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
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
        "flex flex-col items-center justify-center text-center px-6 py-14 rounded-xl border border-dashed border-border bg-card/40",
        className
      )}
    >
      <div className={cn("w-14 h-14 rounded-full flex items-center justify-center ring-8", t.bg, t.ring)}>
        <Icon className={cn("w-7 h-7", t.icon)} aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center gap-2">
          {action && (
            <Button onClick={action.onClick} size="sm">
              {action.label}
            </Button>
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
