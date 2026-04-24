import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TaskCategory } from './CategoryBar';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: TaskCategory[];
  onChange: () => void;
}

const PRESET_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#64748b'];

export default function CategoryManageDialog({ open, onOpenChange, categories, onChange }: Props) {
  const { toast } = useToast();
  const [newCat, setNewCat] = useState({ name: '', icon: '', color: '#3b82f6' });
  const [saving, setSaving] = useState(false);

  const addCategory = async () => {
    if (!newCat.name.trim()) return;
    setSaving(true);
    const sort_order = (categories[categories.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from('task_categories').insert({
      name: newCat.name.trim(),
      icon: newCat.icon || null,
      color: newCat.color,
      sort_order,
    });
    setSaving(false);
    if (error) {
      toast({ title: '추가 실패', description: error.message, variant: 'destructive' });
      return;
    }
    setNewCat({ name: '', icon: '', color: '#3b82f6' });
    toast({ title: '카테고리 추가 완료' });
    onChange();
  };

  const updateCategory = async (id: string, patch: Partial<TaskCategory>) => {
    const { error } = await supabase.from('task_categories').update(patch).eq('id', id);
    if (error) {
      toast({ title: '수정 실패', description: error.message, variant: 'destructive' });
      return;
    }
    onChange();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까? 해당 업무는 미분류 상태로 변경됩니다.')) return;
    const { error } = await supabase.from('task_categories').delete().eq('id', id);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '카테고리 삭제 완료' });
    onChange();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>카테고리 관리</DialogTitle>
          <DialogDescription>업무 카테고리를 추가·수정·삭제합니다. (관리자 전용)</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={cat.icon || ''}
                onChange={e => updateCategory(cat.id, { icon: e.target.value })}
                placeholder="🔖"
                className="w-14 h-8 text-center text-sm"
                maxLength={4}
              />
              <Input
                value={cat.name}
                onChange={e => updateCategory(cat.id, { name: e.target.value })}
                className="flex-1 h-8 text-sm"
              />
              <input
                type="color"
                value={cat.color}
                onChange={e => updateCategory(cat.id, { color: e.target.value })}
                className="h-8 w-10 rounded border cursor-pointer"
                aria-label="색상"
              />
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => deleteCategory(cat.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t space-y-3">
          <Label className="text-xs font-semibold">새 카테고리 추가</Label>
          <div className="flex items-center gap-2">
            <Input
              value={newCat.icon}
              onChange={e => setNewCat(c => ({ ...c, icon: e.target.value }))}
              placeholder="🔖"
              className="w-14 h-9 text-center"
              maxLength={4}
            />
            <Input
              value={newCat.name}
              onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))}
              placeholder="카테고리 이름"
              className="flex-1 h-9"
            />
            <input
              type="color"
              value={newCat.color}
              onChange={e => setNewCat(c => ({ ...c, color: e.target.value }))}
              className="h-9 w-10 rounded border cursor-pointer"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewCat(n => ({ ...n, color: c }))}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: newCat.color === c ? 'hsl(var(--foreground))' : 'transparent' }}
                aria-label={c}
              />
            ))}
          </div>
          <Button onClick={addCategory} disabled={!newCat.name.trim() || saving} className="w-full gap-2">
            <Plus className="h-4 w-4" /> 추가
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
