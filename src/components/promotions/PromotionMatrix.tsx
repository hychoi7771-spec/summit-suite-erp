import { useMemo } from 'react';
import { SectionCard } from '@/components/shared/SectionCard';

export function PromotionMatrix({
  promotions, channels, profiles, conflictMap, onCellClick,
}: {
  promotions: any[]; channels: any[]; profiles: any[];
  conflictMap: Map<string, any>;
  onCellClick: (mdId: string, channelId: string) => void;
}) {
  // Only MDs that own at least one promotion
  const activeMds = useMemo(() => {
    const ids = new Set(promotions.map(p => p.md_id));
    return profiles.filter(p => ids.has(p.id));
  }, [promotions, profiles]);

  const activeChannels = useMemo(() => {
    const ids = new Set(promotions.map(p => p.channel_id));
    return channels.filter(c => ids.has(c.id));
  }, [promotions, channels]);

  const cell = (mdId: string, channelId: string) => {
    const items = promotions.filter(p => p.md_id === mdId && p.channel_id === channelId && p.status !== 'cancelled');
    const ongoing = items.filter(p => p.status === 'ongoing').length;
    const planned = items.filter(p => p.status === 'planned').length;
    let hasViolation = false, hasCheaper = false;
    for (const p of items) {
      const c = conflictMap.get(p.id);
      if (c?.policy_violation) hasViolation = true;
      if ((c?.cheaper_overlap_count ?? 0) > 0) hasCheaper = true;
    }
    return { ongoing, planned, total: items.length, hasViolation, hasCheaper };
  };

  if (activeMds.length === 0 || activeChannels.length === 0) {
    return (
      <SectionCard title="MD × 채널 매트릭스">
        <p className="text-sm text-muted-foreground text-center py-4">데이터가 없습니다</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="MD × 채널 매트릭스" description="셀 클릭 시 해당 조건으로 목록 이동">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 text-xs font-semibold text-muted-foreground sticky left-0 bg-card">MD \ 채널</th>
              {activeChannels.map(c => (
                <th key={c.id} className="p-2 text-xs font-medium text-muted-foreground text-center min-w-[80px]">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeMds.map(md => (
              <tr key={md.id} className="border-t">
                <td className="p-2 text-xs font-medium sticky left-0 bg-card">{md.name_kr || md.name}</td>
                {activeChannels.map(c => {
                  const d = cell(md.id, c.id);
                  const intensity = Math.min(d.total, 5);
                  const bg = d.total === 0 ? 'bg-muted/20' : `bg-primary/${Math.max(5, intensity * 10)}`;
                  return (
                    <td key={c.id} className="p-1 text-center">
                      <button
                        disabled={d.total === 0}
                        onClick={() => onCellClick(md.id, c.id)}
                        className={`w-full min-h-[54px] rounded-md flex flex-col items-center justify-center gap-0.5 transition-all ${bg} ${d.total > 0 ? 'hover:ring-2 hover:ring-primary/40 cursor-pointer' : 'cursor-default'}`}
                        style={d.total > 0 ? { backgroundColor: `hsl(210 80% ${Math.max(50, 90 - intensity * 8)}%)` } : {}}
                      >
                        {d.total > 0 ? (
                          <>
                            <div className="flex gap-1 text-[11px] font-semibold">
                              <span className="text-emerald-800">진행 {d.ongoing}</span>
                              <span className="text-slate-600">/ 예정 {d.planned}</span>
                            </div>
                            <div className="flex gap-1 h-1.5 items-center">
                              {d.hasViolation && <span className="w-1.5 h-1.5 rounded-full bg-destructive" title="정책 위반" />}
                              {d.hasCheaper && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="저가 겹침" />}
                            </div>
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">-</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 mt-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive" />정책 위반</div>
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />저가 겹침</div>
        <div className="ml-auto">채도가 짙을수록 등록 행사 많음</div>
      </div>
    </SectionCard>
  );
}
