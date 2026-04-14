import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const variants: Record<string, string> = {
  // Task status
  'todo': 'bg-muted text-muted-foreground',
  'in-progress': 'bg-info/10 text-info border-info/20',
  'review': 'bg-warning/10 text-warning border-warning/20',
  'done': 'bg-success/10 text-success border-success/20',
  // Expense status
  'Pending': 'bg-warning/10 text-warning border-warning/20',
  'Approved': 'bg-success/10 text-success border-success/20',
  'Reimbursed': 'bg-info/10 text-info border-info/20',
  'Rejected': 'bg-destructive/10 text-destructive border-destructive/20',
  // Priority
  'low': 'bg-muted text-muted-foreground',
  'medium': 'bg-info/10 text-info border-info/20',
  'high': 'bg-warning/10 text-warning border-warning/20',
  'urgent': 'bg-destructive/10 text-destructive border-destructive/20',
  // Product stages
  'Planning': 'bg-muted text-muted-foreground',
  'R&D/Sampling': 'bg-accent/10 text-accent border-accent/20',
  'Design': 'bg-info/10 text-info border-info/20',
  'Certification': 'bg-warning/10 text-warning border-warning/20',
  'Production': 'bg-primary/10 text-primary border-primary/20',
  'Launch': 'bg-success/10 text-success border-success/20',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium border', variants[status] || 'bg-muted text-muted-foreground', className)}
    >
      {status}
    </Badge>
  );
}
