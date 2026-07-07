import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function PricePolicyDialog({
  open, onOpenChange, policies, channels, products, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  policies: any[]; channels: any[]; products: any[]; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [productId, setProductId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<'건강기능식품' | '뷰티' | '의약외품'>('건강기능식품');
  const [channelId, setChannelId] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const isNew = productId === '__new__';

  const add = async () => {
    if (!productId) return;
    setSaving(true);
    try {
      let pid = productId;
      if (isNew) {
        if (!newProductName.trim()) {
          toast({ title: '상품명을 입력해주세요', variant: 'destructive' });
          return;
        }
        const { data, error } = await supabase.from('products').insert({
          name: newProductName.trim(),
          category: newProductCategory as any,
          stage: 'Launch' as any,
          progress: 100,
        } as any).select('id').single();
        if (error || !data) {
          toast({ title: '상품 등록 실패', description: error?.message, variant: 'destructive' });
          return;
        }
        pid = data.id;
      }
      const payload: any = {
        product_id: pid,
        channel_id: channelId === 'all' ? null : channelId,
        min_price: minPrice ? Number(minPrice) : null,
        max_price: maxPrice ? Number(maxPrice) : null,
        note: note || null,
      };
      const { error } = await supabase.from('channel_price_policies')
        .upsert(payload, { onConflict: 'product_id,channel_id' });
      if (error) {
        toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
        return;
      }
      setMinPrice(''); setMaxPrice(''); setNote('');
      if (isNew) { setProductId(pid); setNewProductName(''); }
      onSaved();
      toast({ title: '정책이 저장되었습니다' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('정책을 삭제하시겠습니까?')) return;
    await supabase.from('channel_price_policies').delete().eq('id', id);
    onSaved();
  };

  const productMap = new Map(products.map(p => [p.id, p]));
  const channelMap = new Map(channels.map(c => [c.id, c]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>가격 정책 관리</DialogTitle></DialogHeader>

        <div className="grid grid-cols-6 gap-2 items-end">
          <div className="col-span-2">
            <Label className="text-xs">품목</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="품목 선택" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">+ 새 품목 등록</SelectItem>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">채널</Label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전 채널 공통</SelectItem>
                {channels.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">최저가</Label>
            <Input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">최고가</Label>
            <Input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
          <Button onClick={add} disabled={saving} className="gap-1"><Plus className="h-4 w-4" />저장</Button>
        </div>

        {isNew && (
          <div className="grid grid-cols-6 gap-2 items-end mt-2 p-2 rounded-md bg-muted/40 border">
            <div className="col-span-3">
              <Label className="text-xs">새 상품명 *</Label>
              <Input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="예: 콜라겐 프리미엄 30정" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">카테고리</Label>
              <Select value={newProductCategory} onValueChange={(v: any) => setNewProductCategory(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="건강기능식품">건강기능식품</SelectItem>
                  <SelectItem value="뷰티">뷰티</SelectItem>
                  <SelectItem value="의약외품">의약외품</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-[11px] text-muted-foreground pb-2">저장 시 상품이 함께 등록됩니다.</div>
          </div>
        )}

        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="메모 (선택)" className="mt-2" />

        <div className="mt-4 max-h-[380px] overflow-y-auto divide-y">
          {policies.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">정책이 없습니다</p>}
          {policies.map(p => (
            <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{productMap.get(p.product_id)?.name ?? '-'}</div>
                <div className="text-xs text-muted-foreground">
                  {p.channel_id ? channelMap.get(p.channel_id)?.name : '전 채널 공통'}
                  {' · '}
                  {p.min_price ? `최저 ₩${Number(p.min_price).toLocaleString()}` : '최저 -'}
                  {' / '}
                  {p.max_price ? `최고 ₩${Number(p.max_price).toLocaleString()}` : '최고 -'}
                  {p.note && ` · ${p.note}`}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
