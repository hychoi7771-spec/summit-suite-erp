import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export type PromotionSubFormValue = {
  product_id: string;      // 이름 매칭 시 자동 채워짐. 저장 시점에 없으면 신규 생성.
  product_name: string;    // 사용자가 직접 입력
  channel_id: string;      // 이름 매칭 시 자동 채워짐. 저장 시점에 없으면 신규 생성.
  channel_name: string;    // 사용자가 직접 입력
  md_id: string;
  kind: string;
  regular_price: string;
  promo_price: string;
  placement: string;
};

export const emptyPromotionSubForm: PromotionSubFormValue = {
  product_id: '', product_name: '',
  channel_id: '', channel_name: '',
  md_id: '',
  kind: 'other', regular_price: '', promo_price: '', placement: '',
};

const KIND_OPTIONS = [
  { v: 'coupon', l: '쿠폰' },
  { v: 'deal', l: '딜' },
  { v: 'plan_exhibit', l: '기획전' },
  { v: 'live', l: '라방' },
  { v: 'timesale', l: '타임세일' },
  { v: 'bundle', l: '묶음' },
  { v: 'other', l: '기타' },
];

/**
 * 업무 등록 다이얼로그에서 카테고리가 "행사"일 때 확장되는 미니 폼.
 * 품목/채널은 자유 입력(기존 목록은 자동완성 제안). 매칭이 없으면 저장 시 자동 생성.
 */
export function PromotionSubForm({
  value, onChange, profiles, defaultMdId,
}: {
  value: PromotionSubFormValue;
  onChange: (v: PromotionSubFormValue) => void;
  profiles: any[];
  defaultMdId?: string;
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [p, c, pol] = await Promise.all([
        supabase.from('products').select('id, name').order('name'),
        supabase.from('sales_channels').select('id, name, is_active, default_md_id').order('name'),
        supabase.from('channel_price_policies').select('*'),
      ]);
      setProducts(p.data || []);
      setChannels(c.data || []);
      setPolicies(pol.data || []);
    })();
  }, []);

  useEffect(() => {
    if (!value.md_id && defaultMdId) onChange({ ...value, md_id: defaultMdId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMdId]);

  const set = (patch: Partial<PromotionSubFormValue>) => onChange({ ...value, ...patch });

  const discount = useMemo(() => {
    const r = Number(value.regular_price), p = Number(value.promo_price);
    if (!r || !p) return null;
    return Math.round((1 - p / r) * 100);
  }, [value.regular_price, value.promo_price]);

  const violation = useMemo(() => {
    if (!value.product_id || !value.promo_price) return null;
    const policy =
      policies.find(x => x.product_id === value.product_id && x.channel_id === value.channel_id) ||
      policies.find(x => x.product_id === value.product_id && !x.channel_id);
    if (!policy) return null;
    const p = Number(value.promo_price);
    if (policy.min_price && p < Number(policy.min_price)) return `최저가 정책 위반: ₩${Number(policy.min_price).toLocaleString()} 이상`;
    if (policy.max_price && p > Number(policy.max_price)) return `최고가 정책 위반: ₩${Number(policy.max_price).toLocaleString()} 이하`;
    return null;
  }, [policies, value.product_id, value.channel_id, value.promo_price]);

  const onProductNameChange = (name: string) => {
    const match = products.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    set({ product_name: name, product_id: match?.id || '' });
  };

  const onChannelNameChange = (name: string) => {
    const match = channels.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    const patch: Partial<PromotionSubFormValue> = { channel_name: name, channel_id: match?.id || '' };
    if (match?.default_md_id && !value.md_id) patch.md_id = match.default_md_id;
    set(patch);
  };

  return (
    <div className="space-y-3 p-3 rounded-lg border border-fuchsia-200 bg-fuchsia-50/40">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-fuchsia-700">
        <PartyPopper className="h-4 w-4" />
        행사 정보 (업무와 함께 행사 현황에도 등록됩니다)
      </div>

      <datalist id="promo-products-datalist">
        {products.map(p => <option key={p.id} value={p.name} />)}
      </datalist>
      <datalist id="promo-channels-datalist">
        {channels.map(c => <option key={c.id} value={c.name} />)}
      </datalist>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">품목 *</Label>
          <Input
            list="promo-products-datalist"
            className="h-9"
            value={value.product_name}
            onChange={e => onProductNameChange(e.target.value)}
            placeholder="예: 콜라겐 프리미엄 30정 (없으면 자동 등록)"
          />
          {value.product_name && !value.product_id && (
            <p className="text-[10px] text-fuchsia-700">신규 품목으로 자동 등록됩니다</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">채널 *</Label>
          <Input
            list="promo-channels-datalist"
            className="h-9"
            value={value.channel_name}
            onChange={e => onChannelNameChange(e.target.value)}
            placeholder="예: 쿠팡 / 네이버 (없으면 자동 등록)"
          />
          {value.channel_name && !value.channel_id && (
            <p className="text-[10px] text-fuchsia-700">신규 채널로 자동 등록됩니다</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">담당 MD *</Label>
          <Select value={value.md_id} onValueChange={v => set({ md_id: v })}>
            <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
            <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr || p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">프로모션 유형</Label>
          <Select value={value.kind} onValueChange={v => set({ kind: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{KIND_OPTIONS.map(k => <SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">정상가</Label>
          <Input type="number" className="h-9" value={value.regular_price} onChange={e => set({ regular_price: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">행사가 *</Label>
          <Input type="number" className="h-9" value={value.promo_price} onChange={e => set({ promo_price: e.target.value })} />
          {discount !== null && <p className="text-[10px] text-muted-foreground">할인율 {discount}%</p>}
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">노출 위치 (선택)</Label>
          <Input className="h-9" value={value.placement} onChange={e => set({ placement: e.target.value })} placeholder="예: 메인 배너" />
        </div>
      </div>

      {violation && (
        <div className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{violation} · 저장은 가능하지만 관리자에게 통지됩니다.</span>
        </div>
      )}

      <p className="text-[10.5px] text-muted-foreground">
        시작일·종료일은 업무의 시작일·마감일을 사용합니다.
      </p>
    </div>
  );
}

/**
 * 이름으로 품목을 찾고, 없으면 자동 생성.
 */
export async function resolveOrCreateProduct(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('품목명이 필요합니다');
  const { data: existing } = await supabase
    .from('products')
    .select('id, name')
    .ilike('name', trimmed)
    .limit(1);
  if (existing && existing[0]) return existing[0].id;
  const { data, error } = await supabase.from('products').insert({
    name: trimmed,
    category: '건강기능식품' as any,
    stage: 'Launch' as any,
    progress: 100,
  } as any).select('id').single();
  if (error || !data) throw error || new Error('품목 생성 실패');
  return data.id;
}

/**
 * 이름으로 채널을 찾고, 없으면 자동 생성.
 */
export async function resolveOrCreateChannel(name: string, defaultMdId?: string | null): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('채널명이 필요합니다');
  const { data: existing } = await supabase
    .from('sales_channels')
    .select('id, name')
    .ilike('name', trimmed)
    .limit(1);
  if (existing && existing[0]) return existing[0].id;
  const { data, error } = await supabase.from('sales_channels').insert({
    name: trimmed,
    type: 'online' as any,
    default_md_id: defaultMdId || null,
    is_active: true,
  } as any).select('id').single();
  if (error || !data) throw error || new Error('채널 생성 실패');
  return data.id;
}

/**
 * 행사 데이터 저장(생성/갱신). task와 양방향 링크.
 */
export async function upsertPromotionForTask(params: {
  taskId: string;
  existingPromotionId?: string | null;
  form: PromotionSubFormValue;
  startDate: string;
  endDate: string;
  createdBy?: string | null;
}) {
  const { taskId, existingPromotionId, form, startDate, endDate, createdBy } = params;
  const productId = form.product_id || await resolveOrCreateProduct(form.product_name);
  const channelId = form.channel_id || await resolveOrCreateChannel(form.channel_name, form.md_id);
  const payload: any = {
    product_id: productId,
    channel_id: channelId,
    md_id: form.md_id,
    kind: form.kind,
    placement: form.placement || null,
    regular_price: form.regular_price ? Number(form.regular_price) : null,
    promo_price: Number(form.promo_price),
    start_date: startDate,
    end_date: endDate,
    task_id: taskId,
  };
  if (existingPromotionId) {
    const { error } = await supabase.from('promotions').update(payload).eq('id', existingPromotionId);
    if (error) throw error;
    return existingPromotionId;
  } else {
    payload.created_by = createdBy;
    const { data, error } = await supabase.from('promotions').insert(payload).select('id').single();
    if (error) throw error;
    await supabase.from('tasks').update({ promotion_id: data.id }).eq('id', taskId);
    return data.id;
  }
}
