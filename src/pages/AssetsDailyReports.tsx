import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AssetLibraryShell, { AssetCategory, AssetItem } from '@/components/assets/AssetLibraryShell';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

// 일일보고는 명시적 카테고리 컬럼이 없어 승인 단계를 카테고리로 활용
const REPORT_CATS: AssetCategory[] = [
  { id: 'ceo_approved', name: '대표 결재완료', color: '#10b981' },
  { id: 'director_approved', name: '본부장 결재', color: '#3b82f6' },
  { id: 'checked', name: '확인 완료', color: '#f59e0b' },
  { id: 'pending', name: '확인 전', color: '#94a3b8' },
];

function classify(r: any): string {
  if (r.ceo_approved) return 'ceo_approved';
  if (r.director_approved) return 'director_approved';
  if (r.completion_checked) return 'checked';
  return 'pending';
}

function summarizeMorning(morning: any): string {
  if (!morning) return '';
  if (Array.isArray(morning)) {
    return morning.map((m: any) => `• ${m.title || m.task || JSON.stringify(m)}`).join('\n');
  }
  if (typeof morning === 'string') return morning;
  return JSON.stringify(morning).slice(0, 200);
}

export default function AssetsDailyReports() {
  const nav = useNavigate();
  const [items, setItems] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [repRes, profRes] = await Promise.all([
        supabase
          .from('daily_work_reports')
          .select('id,user_id,date,morning_tasks,completion_checked,director_approved,ceo_approved,notes,created_at')
          .order('date', { ascending: false })
          .limit(500),
        supabase.from('profiles').select('id,name_kr,name'),
      ]);
      const profMap = new Map((profRes.data || []).map(p => [p.id, p.name_kr || p.name]));
      const catMap = new Map(REPORT_CATS.map(c => [c.id, c]));
      setItems(
        (repRes.data || []).map(r => {
          const key = classify(r);
          const c = catMap.get(key)!;
          const title = `${r.date} 일일업무보고`;
          const summary = [summarizeMorning(r.morning_tasks), r.notes].filter(Boolean).join('\n\n');
          return {
            id: r.id,
            title,
            summary,
            categoryId: key,
            categoryName: c.name,
            categoryColor: c.color,
            assigneeName: r.user_id ? profMap.get(r.user_id) : undefined,
            completedAt: r.date || r.created_at,
          };
        })
      );
      setLoading(false);
    })();
  }, []);

  return (
    <AssetLibraryShell
      source="daily_reports"
      title="일일보고 자산함"
      description="과거 일일업무보고를 결재 단계·작성자별로 검색하고 다시 활용할 수 있습니다."
      categories={REPORT_CATS}
      items={items}
      loading={loading}
      renderActions={item => (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => nav(`/tasks?report=${item.id}`)}
        >
          <ExternalLink className="h-3 w-3" /> 열기
        </Button>
      )}
    />
  );
}
