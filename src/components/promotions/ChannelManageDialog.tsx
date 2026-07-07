import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function ChannelManageDialog({
  open, onOpenChange, channels, profiles, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  channels: any[]; profiles: any[]; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState('online');
  const [mdId, setMdId] = useState<string>('');

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from('sales_channels').insert({
      name: name.trim(), type: type as any, default_md_id: mdId || null,
    });
    if (error) toast({ title: '등록 실패', description: error.message, variant: 'destructive' });
    else { setName(''); setMdId(''); onSaved(); }
  };

  const toggle = async (c: any) => {
    await supabase.from('sales_channels').update({ is_active: !c.is_active }).eq('id', c.id);
    onSaved();
  };

  const remove = async (c: any) => {
    if (!confirm(`"${c.name}" 채널을 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from('sales_channels').delete().eq('id', c.id);
    if (error) toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
    else onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>채널 관리</DialogTitle></DialogHeader>

        <div className="grid grid-cols-[1fr_130px_1fr_auto] gap-2 items-end">
          <div>
            <Label className="text-xs">채널명</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="예: 쿠팡" />
          </div>
          <div>
            <Label className="text-xs">유형</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="online">온라인</SelectItem>
                <SelectItem value="offline">오프라인</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">기본 담당 MD</Label>
            <Select value={mdId} onValueChange={setMdId}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr || p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={add} className="gap-1"><Plus className="h-4 w-4" />추가</Button>
        </div>

        <div className="mt-3 max-h-[400px] overflow-y-auto divide-y">
          {channels.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">채널이 없습니다</p>}
          {channels.map(c => {
            const md = profiles.find(p => p.id === c.default_md_id);
            return (
              <div key={c.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant="outline" className="text-[10px]">{c.type === 'online' ? '온라인' : '오프라인'}</Badge>
                  {md && <span className="text-xs text-muted-foreground">담당: {md.name_kr || md.name}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
                    <span className="text-xs text-muted-foreground">{c.is_active ? '활성' : '비활성'}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
