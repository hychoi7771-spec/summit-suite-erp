import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LockKeyhole, Users } from 'lucide-react';

export interface ExpenseVisibility {
  is_confidential: boolean;
  allowed_viewer_ids: string[];
}

export function expenseVisibilityPayload(value: ExpenseVisibility): ExpenseVisibility {
  return {
    is_confidential: value.is_confidential,
    allowed_viewer_ids: value.is_confidential ? [...new Set(value.allowed_viewer_ids)] : [],
  };
}

interface Props {
  value: ExpenseVisibility;
  onChange: (value: ExpenseVisibility) => void;
  profiles: { id: string; name_kr: string }[];
  submitterId?: string;
  disabled?: boolean;
}

export function ExpenseVisibilityControl({ value, onChange, profiles, submitterId, disabled }: Props) {
  return (
    <fieldset disabled={disabled} className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="expense-confidential" className="flex items-center gap-2">
          {value.is_confidential ? <LockKeyhole className="h-4 w-4 text-warning" /> : <Users className="h-4 w-4 text-primary" />}
          대외비 · 민감 내역
        </Label>
        <Switch id="expense-confidential" checked={value.is_confidential} disabled={disabled} onCheckedChange={checked => onChange({ ...value, is_confidential: checked })} />
      </div>
      <p className="text-xs text-muted-foreground">
        {value.is_confidential ? '작성자 · 대표 · 총괄이사 · 지정 직원만 열람' : '전체 직원 공개 · 내역 및 영수증'}
      </p>
      {value.is_confidential && (
        <div className="space-y-2">
          <div className="text-sm font-medium">열람 허용 직원</div>
          <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
            {profiles.filter(p => p.id !== submitterId).map(p => (
              <Label key={p.id} className="flex items-center gap-2 min-h-8 text-sm">
                <Checkbox checked={value.allowed_viewer_ids.includes(p.id)} disabled={disabled} onCheckedChange={checked => onChange({
                  ...value,
                  allowed_viewer_ids: checked === true ? [...value.allowed_viewer_ids, p.id] : value.allowed_viewer_ids.filter(id => id !== p.id),
                })} />
                <span className="break-words">{p.name_kr}</span>
              </Label>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  );
}