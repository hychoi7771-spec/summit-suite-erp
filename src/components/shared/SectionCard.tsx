import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Remove default padding on the content area (useful for tables) */
  flush?: boolean;
}

/**
 * Consistent section wrapper used inside pages.
 * Pairs with PageHeader for page-level headers — this is for sections inside the page.
 */
export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
  flush = false,
}: SectionCardProps) {
  const hasHeader = title || description || action || Icon;
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm overflow-hidden",
        className
      )}
    >
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-sm font-semibold text-foreground truncate">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {description}
                </p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(flush ? "" : "p-5", contentClassName)}>{children}</div>
    </section>
  );
}
