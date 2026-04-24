import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TaskCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  sort_order: number;
}

interface CategoryBarProps {
  categories: TaskCategory[];
  tasks: any[];
  selectedCategory: string; // 'all' | '__none__' | category.id
  onSelect: (val: string) => void;
  isAdmin: boolean;
  onManageClick: () => void;
  overdueCount: number;
  weekDueCount: number;
  onQuickFilter: (filter: 'overdue' | 'week' | null) => void;
  activeQuickFilter: 'overdue' | 'week' | null;
}

export default function CategoryBar({
  categories,
  tasks,
  selectedCategory,
  onSelect,
  isAdmin,
  onManageClick,
  overdueCount,
  weekDueCount,
  onQuickFilter,
  activeQuickFilter,
}: CategoryBarProps) {
  const countFor = (id: string | null) =>
    tasks.filter(t => (id === null ? !t.category_id : t.category_id === id)).length;
  const uncategorized = countFor(null);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onSelect('all')}
        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors whitespace-nowrap ${
          selectedCategory === 'all'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card text-muted-foreground border-border hover:border-primary/50'
        }`}
      >
        전체 ({tasks.length})
      </button>
      {categories.map(cat => {
        const count = countFor(cat.id);
        const active = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(active ? 'all' : cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
              active ? 'text-white border-transparent' : 'bg-card border-border hover:border-primary/50'
            }`}
            style={active ? { backgroundColor: cat.color } : { color: cat.color, borderColor: `${cat.color}55` }}
            title={cat.name}
          >
            {cat.icon && <span>{cat.icon}</span>}
            <span>{cat.name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25' : 'bg-muted'}`}>
              {count}
            </span>
          </button>
        );
      })}
      {uncategorized > 0 && (
        <button
          onClick={() => onSelect(selectedCategory === '__none__' ? 'all' : '__none__')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
            selectedCategory === '__none__'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-primary/50'
          }`}
        >
          미분류 ({uncategorized})
        </button>
      )}

      <div className="ml-2 flex items-center gap-1.5">
        {overdueCount > 0 && (
          <button
            onClick={() => onQuickFilter(activeQuickFilter === 'overdue' ? null : 'overdue')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-colors whitespace-nowrap ${
              activeQuickFilter === 'overdue'
                ? 'bg-destructive text-destructive-foreground border-destructive'
                : 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15'
            }`}
          >
            지연 {overdueCount}건
          </button>
        )}
        {weekDueCount > 0 && (
          <button
            onClick={() => onQuickFilter(activeQuickFilter === 'week' ? null : 'week')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-colors whitespace-nowrap ${
              activeQuickFilter === 'week'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15'
            }`}
          >
            이번 주 마감 {weekDueCount}건
          </button>
        )}
      </div>

      {isAdmin && (
        <Button variant="ghost" size="sm" className="h-7 px-2 ml-auto shrink-0 text-xs" onClick={onManageClick}>
          <Settings2 className="h-3.5 w-3.5 mr-1" />
          카테고리 관리
        </Button>
      )}
    </div>
  );
}
