import { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { SectionCard } from '@/components/shared/SectionCard';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  planned: { label: '예정', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  ongoing: { label: '진행중', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ended: { label: '종료', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  cancelled: { label: '취소', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const KIND_LABEL: Record<string, string> = {
  coupon: '쿠폰', deal: '딜', plan_exhibit: '기획전', live: '라방', timesale: '타임세일', bundle: '묶음', other: '기타',
};

export function PromotionTable({
  promotions, channels, products, profiles, conflictMap, canEdit, onEdit, onDelete, initialFilter,
}: {
  promotions: any[]; channels: any[]; products: any[]; profiles: any[];
  conflictMap: Map<string, any>;
  canEdit: (p: any) => boolean;
  onEdit: (p: any) => void;
  onDelete: (p: any) => void;
  initialFilter?: { mdId?: string; channelId?: string };
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [channelId, setChannelId] = useState('all');
  const [mdId, setMdId] = useState('all');

  useEffect(() => {
    if (initialFilter?.mdId) setMdId(initialFilter.mdId);
    if (initialFilter?.channelId) setChannelId(initialFilter.channelId);
  }, [initialFilter?.mdId, initialFilter?.channelId]);

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const channelMap = useMemo(() => new Map(channels.map(c => [c.id, c])), [channels]);
  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles]);

  const filtered = useMemo(() => {
    return promotions.filter(p => {
      if (status !== 'all' && p.status !== status) return false;
      if (channelId !== 'all' && p.channel_id !== channelId) return false;
      if (mdId !== 'all' && p.md_id !== mdId) return false;
      if (q) {
        const prod = productMap.get(p.product_id);
        const hay = `${prod?.name ?? ''} ${p.title ?? ''} ${p.placement ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [promotions, status, channelId, mdId, q, productMap]);

  return (
    <SectionCard flush>
      <div className="p-4 border-b flex flex-wrap gap-2 items-center">
        <Input placeholder="품목·제목 검색" value={q} onChange={e => setQ(e.target.value)} className="w-56" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={channelId} onValueChange={setChannelId}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 채널</SelectItem>
            {channels.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mdId} onValueChange={setMdId}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 MD</SelectItem>
            {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr || p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length}건</div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>상태</TableHead>
              <TableHead>품목</TableHead>
              <TableHead>채널</TableHead>
              <TableHead>담당 MD</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>기간</TableHead>
              <TableHead className="text-right">정상가</TableHead>
              <TableHead className="text-right">행사가</TableHead>
              <TableHead className="text-right">할인</TableHead>
              <TableHead className="text-right">예상매출</TableHead>
              <TableHead>경고</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">등록된 행사가 없습니다</TableCell></TableRow>
            )}
            {filtered.map(p => {
              const s = STATUS_LABEL[p.status];
              const conflict = conflictMap.get(p.id);
              const discount = p.regular_price && p.promo_price
                ? Math.round((1 - Number(p.promo_price) / Number(p.regular_price)) * 100)
                : null;
              return (
                <TableRow key={p.id}>
                  <TableCell><Badge variant="outline" className={s?.className}>{s?.label ?? p.status}</Badge></TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {productMap.get(p.product_id)?.name ?? '-'}
                    {p.title && <div className="text-xs text-muted-foreground truncate">{p.title}</div>}
                  </TableCell>
                  <TableCell>{channelMap.get(p.channel_id)?.name ?? '-'}</TableCell>
                  <TableCell>{profileMap.get(p.md_id)?.name_kr || profileMap.get(p.md_id)?.name || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{KIND_LABEL[p.kind] || p.kind}</Badge></TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{p.start_date}<br />~ {p.end_date}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{p.regular_price ? `₩${Number(p.regular_price).toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">₩{Number(p.promo_price).toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{discount !== null ? `${discount}%` : '-'}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{p.expected_revenue ? `₩${Number(p.expected_revenue).toLocaleString()}` : '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {conflict?.policy_violation && (
                        <Badge variant="destructive" className="gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3" />
                          {conflict.policy_violation === 'below_min' ? '최저가 미만' : '최고가 초과'}
                        </Badge>
                      )}
                      {conflict?.cheaper_overlap_count > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                          저가 겹침 {conflict.cheaper_overlap_count}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {canEdit(p) && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}
