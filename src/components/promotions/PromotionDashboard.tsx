import { useMemo } from 'react';
import { PromotionTimeline } from './PromotionTimeline';
import { PromotionMatrix } from './PromotionMatrix';
import { AlertTriangle } from 'lucide-react';

export function PromotionDashboard({
  promotions, channels, profiles, products, conflictMap,
  onSelect, onFilterList,
}: {
  promotions: any[]; channels: any[]; profiles: any[]; products: any[];
  conflictMap: Map<string, any>;
  onSelect: (p: any) => void;
  onFilterList: (filters: { mdId?: string; channelId?: string }) => void;
}) {
  const alerts = useMemo(() => {
    let vio = 0, cheap = 0;
    conflictMap.forEach((c: any) => {
      if (c.policy_violation) vio++;
      if ((c.cheaper_overlap_count ?? 0) > 0) cheap++;
    });
    return { vio, cheap };
  }, [conflictMap]);

  return (
    <div className="space-y-4">
      {(alerts.vio > 0 || alerts.cheap > 0) && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
          <div className="flex-1 text-amber-900">
            {alerts.vio > 0 && <span className="mr-3"><b>정책 위반 {alerts.vio}건</b></span>}
            {alerts.cheap > 0 && <span>저가 겹침 {alerts.cheap}건</span>}
          </div>
          <button
            className="text-xs font-medium text-amber-700 hover:underline"
            onClick={() => onFilterList({})}
          >
            목록에서 확인 →
          </button>
        </div>
      )}

      <PromotionTimeline
        promotions={promotions}
        channels={channels}
        products={products}
        profiles={profiles}
        conflictMap={conflictMap}
        onSelect={onSelect}
      />

      <PromotionMatrix
        promotions={promotions}
        channels={channels}
        profiles={profiles}
        conflictMap={conflictMap}
        onCellClick={(mdId, channelId) => onFilterList({ mdId, channelId })}
      />
    </div>
  );
}
