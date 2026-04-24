import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface BoardToggles {
  hideDone: boolean;
  compact: boolean;
  myOnly: boolean;
  overdueOnly: boolean;
}

interface TaskFilterToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  toggles: BoardToggles;
  onToggleChange: (key: keyof BoardToggles, value: boolean) => void;
}

export default function TaskFilterToolbar({ search, onSearchChange, toggles, onToggleChange }: TaskFilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border bg-card">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="제목·설명·태그·프로젝트 통합 검색"
          className="h-9 pl-8 pr-8 text-sm"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
            aria-label="검색 지우기"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ToggleItem
          id="t-hide-done"
          label="완료 숨기기"
          checked={toggles.hideDone}
          onChange={v => onToggleChange('hideDone', v)}
        />
        <ToggleItem
          id="t-compact"
          label="컴팩트"
          checked={toggles.compact}
          onChange={v => onToggleChange('compact', v)}
        />
        <ToggleItem
          id="t-my"
          label="내 업무만"
          checked={toggles.myOnly}
          onChange={v => onToggleChange('myOnly', v)}
        />
        <ToggleItem
          id="t-overdue"
          label="지연만"
          checked={toggles.overdueOnly}
          onChange={v => onToggleChange('overdueOnly', v)}
        />
      </div>
    </div>
  );
}

function ToggleItem({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-xs cursor-pointer select-none">
        {label}
      </Label>
    </div>
  );
}
