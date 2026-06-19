import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AssetLibraryShell, { AssetCategory, AssetItem } from '@/components/assets/AssetLibraryShell';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';

export default function AssetsTasks() {
  const nav = useNavigate();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [items, setItems] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [catRes, taskRes, profRes] = await Promise.all([
        supabase.from('task_categories').select('id,name,color,icon').order('sort_order'),
        supabase
          .from('tasks')
          .select('id,title,description,assignee_id,category_id,tags,updated_at,created_at')
          .eq('status', 'done')
          .order('updated_at', { ascending: false })
          .limit(500),
        supabase.from('profiles').select('id,name_kr,name'),
      ]);
      const cats = (catRes.data || []) as AssetCategory[];
      const profMap = new Map((profRes.data || []).map(p => [p.id, p.name_kr || p.name]));
      const catMap = new Map(cats.map(c => [c.id, c]));
      setCategories(cats);
      setItems(
        (taskRes.data || []).map(t => {
          const c = t.category_id ? catMap.get(t.category_id) : undefined;
          return {
            id: t.id,
            title: t.title,
            summary: t.description || '',
            categoryId: t.category_id,
            categoryName: c?.name,
            categoryColor: c?.color,
            assigneeName: t.assignee_id ? profMap.get(t.assignee_id) : undefined,
            completedAt: t.updated_at || t.created_at,
            tags: t.tags || [],
          };
        })
      );
      setLoading(false);
    })();
  }, []);

  return (
    <AssetLibraryShell
      source="tasks"
      title="업무 자산함"
      description="완료된 업무를 카테고리별로 모아 다음 업무의 자산으로 활용합니다."
      categories={categories}
      items={items}
      loading={loading}
      renderActions={item => (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => nav(`/tasks?duplicate=${item.id}`)}
            title="템플릿으로 복제"
          >
            <Copy className="h-3 w-3" /> 복제
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => nav(`/tasks?open=${item.id}`)}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </>
      )}
    />
  );
}
