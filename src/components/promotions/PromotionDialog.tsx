import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { resolveOrCreateProduct, resolveOrCreateChannel } from './PromotionSubForm';

const KIND_OPTIONS = [
  { v: 'coupon', l: '쿠폰' },
  { v: 'deal', l: '딜' },
  { v: 'plan_exhibit', l: '기획전' },
  { v: 'live', l: '라방' },
  { v: 'timesale', l: '타임세일' },
  { v: 'bundle', l: '묶음' },
  { v: 'other', l: '기타' },
];

export function PromotionDialog({
  open, onOpenChange, promotion, channels, products, profiles, policies, defaultMdId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  promotion: any | null;
  channels: any[]; products: any[]; profiles: any[]; policies: any[];
  defaultMdId?: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const emptyForm = {
    product_id: '', channel_id: '', md_id: defaultMdId || '',
    title: '', kind: 'other', placement: '',
    start_date: '', end_date: '',
    regular_price: '', promo_price: '',
    planned_qty: '', stock_qty: '',
    expected_revenue: '', actual_revenue: '',
    competitor_price: '', market_lowest_price: '',
    monitoring_note: '', memo: '',
    status: 'planned', status_override: false,
  };
  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => {
    if (promotion) {
      setForm({
        ...emptyForm, ...promotion,
        regular_price: promotion.regular_price ?? '',
        promo_price: promotion.promo_price ?? '',
        planned_qty: promotion.planned_qty ?? '',
        stock_qty: promotion.stock_qty ?? '',
        expected_revenue: promotion.expected_revenue ?? '',
        actual_revenue: promotion.actual_revenue ?? '',
        competitor_price: promotion.competitor_price ?? '',
        market_lowest_price: promotion.market_lowest_price ?? '',
      });
    } else {
      setForm({ ...emptyForm, md_id: defaultMdId || '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotion, open, defaultMdId]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const policy = useMemo(() => {
    if (!form.product_id) return null;
    return (
      policies.find(p => p.product_id === form.product_id && p.channel_id === form.channel_id) ||
      policies.find(p => p.product_id === form.product_id && !p.channel_id) || null
    );
  }, [policies, form.product_id, form.channel_id]);

  const promoPriceNum = Number(form.promo_price);
  const violation = useMemo(() => {
    if (!policy || !promoPriceNum) return null;
    if (policy.min_price && promoPriceNum < Number(policy.min_price)) return `채널 최저가 정책 위반: ₩${Number(policy.min_price).toLocaleString()} 이상이어야 함`;
    if (policy.max_price && promoPriceNum > Number(policy.max_price)) return `채널 최고가 정책 위반: ₩${Number(policy.max_price).toLocaleString()} 이하이어야 함`;
    return null;
  }, [policy, promoPriceNum]);

  const discount = useMemo(() => {
    const r = Number(form.regular_price), p = Number(form.promo_price);
    if (!r || !p) return null;
    return Math.round((1 - p / r) * 100);
  }, [form.regular_price, form.promo_price]);

  const buildTaskTitle = () => {
    const prod = products.find(p => p.id === form.product_id);
    const ch = channels.find(c => c.id === form.channel_id);
    const base = form.title?.trim() || `${prod?.name || '품목'} · ${ch?.name || '채널'} 행사`;
    return `[행사] ${base}`;
  };

  const save = async () => {
    if (!form.product_id || !form.channel_id || !form.md_id || !form.start_date || !form.end_date || !form.promo_price) {
      toast({ title: '필수 항목을 입력해주세요', description: '품목·채널·MD·기간·행사가는 필수입니다', variant: 'destructive' });
      return;
    }
    const payload: any = {
      product_id: form.product_id,
      channel_id: form.channel_id,
      md_id: form.md_id,
      title: form.title || null,
      kind: form.kind,
      placement: form.placement || null,
      start_date: form.start_date,
      end_date: form.end_date,
      regular_price: form.regular_price ? Number(form.regular_price) : null,
      promo_price: Number(form.promo_price),
      planned_qty: form.planned_qty ? Number(form.planned_qty) : null,
      stock_qty: form.stock_qty ? Number(form.stock_qty) : null,
      expected_revenue: form.expected_revenue ? Number(form.expected_revenue) : null,
      actual_revenue: form.actual_revenue ? Number(form.actual_revenue) : null,
      competitor_price: form.competitor_price ? Number(form.competitor_price) : null,
      market_lowest_price: form.market_lowest_price ? Number(form.market_lowest_price) : null,
      monitoring_note: form.monitoring_note || null,
      memo: form.memo || null,
      status: form.status,
      status_override: form.status === 'cancelled' ? true : form.status_override,
    };

    if (promotion) {
      const { error } = await supabase.from('promotions').update(payload).eq('id', promotion.id);
      if (error) {
        toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
        return;
      }
      // 연결된 업무 동기화
      if (promotion.task_id) {
        await supabase.from('tasks').update({
          title: buildTaskTitle(),
          start_date: form.start_date,
          due_date: form.end_date,
          assignee_id: form.md_id,
        } as any).eq('id', promotion.task_id);
      }
    } else {
      payload.created_by = profile?.id;
      const { data: promoRow, error } = await supabase.from('promotions').insert(payload).select('id').single();
      if (error || !promoRow) {
        toast({ title: '저장 실패', description: error?.message, variant: 'destructive' });
        return;
      }
      // 업무 자동 생성 및 연결
      try {
        const { data: cat } = await supabase
          .from('task_categories')
          .select('id')
          .eq('system_slug', 'promotion')
          .maybeSingle();
        const { data: taskRow, error: taskErr } = await supabase.from('tasks').insert({
          title: buildTaskTitle(),
          description: form.memo || form.monitoring_note || null,
          priority: 'medium',
          assignee_id: form.md_id,
          start_date: form.start_date,
          due_date: form.end_date,
          category_id: cat?.id || null,
          status: 'todo',
          promotion_id: promoRow.id,
        } as any).select('id').single();
        if (taskErr) throw taskErr;
        if (taskRow?.id) {
          await supabase.from('promotions').update({ task_id: taskRow.id }).eq('id', promoRow.id);
        }
      } catch (e: any) {
        toast({ title: '업무 자동 생성 실패', description: e.message, variant: 'destructive' });
      }
    }
    toast({ title: promotion ? '수정되었습니다' : '등록 및 업무 연동 완료' });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{promotion ? '행사 수정' : '행사 등록'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="space-y-1.5">
            <Label>품목 *</Label>
            <Select value={form.product_id} onValueChange={v => set('product_id', v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>채널 *</Label>
            <Select value={form.channel_id} onValueChange={v => set('channel_id', v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>{channels.filter(c => c.is_active).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>담당 MD *</Label>
            <Select value={form.md_id} onValueChange={v => set('md_id', v)}>
              <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr || p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>프로모션 유형</Label>
            <Select value={form.kind} onValueChange={v => set('kind', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{KIND_OPTIONS.map(k => <SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>제목 / 프로모션명</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="예: 봄맞이 30% 할인전" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>노출 위치</Label>
            <Input value={form.placement} onChange={e => set('placement', e.target.value)} placeholder="예: 메인 배너 / 카테고리 상단" />
          </div>
          <div className="space-y-1.5">
            <Label>시작일 *</Label>
            <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>종료일 *</Label>
            <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>정상가</Label>
            <Input type="number" value={form.regular_price} onChange={e => set('regular_price', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>행사가 *</Label>
            <Input type="number" value={form.promo_price} onChange={e => set('promo_price', e.target.value)} />
            {discount !== null && <p className="text-xs text-muted-foreground">할인율 {discount}%</p>}
          </div>
          <div className="space-y-1.5">
            <Label>계획 물량</Label>
            <Input type="number" value={form.planned_qty} onChange={e => set('planned_qty', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>재고</Label>
            <Input type="number" value={form.stock_qty} onChange={e => set('stock_qty', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>예상 매출</Label>
            <Input type="number" value={form.expected_revenue} onChange={e => set('expected_revenue', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>실제 매출</Label>
            <Input type="number" value={form.actual_revenue} onChange={e => set('actual_revenue', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>경쟁사가</Label>
            <Input type="number" value={form.competitor_price} onChange={e => set('competitor_price', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>시장 최저가</Label>
            <Input type="number" value={form.market_lowest_price} onChange={e => set('market_lowest_price', e.target.value)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>모니터링 메모</Label>
            <Textarea value={form.monitoring_note} onChange={e => set('monitoring_note', e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>비고</Label>
            <Textarea value={form.memo} onChange={e => set('memo', e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>상태</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">예정</SelectItem>
                <SelectItem value="ongoing">진행중</SelectItem>
                <SelectItem value="ended">종료</SelectItem>
                <SelectItem value="cancelled">취소</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">기본은 날짜 기반 자동 계산됩니다.</p>
          </div>
        </div>

        {violation && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">가격 정책 경고</div>
              <div className="text-xs mt-0.5">{violation} · 등록은 가능하지만 관리자에게 통지됩니다.</div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={save}>{promotion ? '수정' : '등록'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
