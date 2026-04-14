import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, BarChart3, Columns3, RefreshCw } from 'lucide-react';
import { LaunchGanttChart } from './LaunchGanttChart';
import { LaunchKanbanBoard } from './LaunchKanbanBoard';
import { LaunchStepDialog } from './LaunchStepDialog';
import { DEFAULT_STEPS, DEFAULT_DEPENDENCIES, PHASES, PHASE_BG_COLORS } from './launchDefaultSteps';

interface LaunchProcessDetailProps {
  product: any;
  profiles: any[];
  onBack: () => void;
}

export function LaunchProcessDetail({ product, profiles, onBack }: LaunchProcessDetailProps) {
  const [steps, setSteps] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [tab, setTab] = useState('gantt');

  const fetchSteps = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('launch_steps')
      .select('*')
      .eq('product_id', product.id)
      .order('position');

    if (error) {
      toast({ title: '데이터 로드 실패', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // If no steps exist, auto-create default steps
    if (!data || data.length === 0) {
      await initializeDefaultSteps();
    } else {
      setSteps(data);
      // Fetch dependencies
      const stepIds = data.map(s => s.id);
      if (stepIds.length > 0) {
        const { data: deps } = await supabase
          .from('launch_dependencies')
          .select('*')
          .in('source_step_id', stepIds);
        setDependencies(deps || []);
      }
    }
    setLoading(false);
  }, [product.id]);

  const initializeDefaultSteps = async () => {
    const category = product.category;
    const filteredSteps = DEFAULT_STEPS.filter(s => {
      if (s.category_filter.length === 0) return true;
      return s.category_filter.includes(category);
    });

    const inserts = filteredSteps.map(s => ({
      product_id: product.id,
      phase: s.phase,
      step_name: s.step_name,
      position: s.position,
      is_critical: s.is_critical,
      category_filter: s.category_filter,
      status: 'waiting',
    }));

    const { data: inserted, error } = await supabase
      .from('launch_steps')
      .insert(inserts)
      .select();

    if (error || !inserted) {
      toast({ title: '초기화 실패', variant: 'destructive' });
      return;
    }

    // Create default dependencies
    const stepMap = new Map<string, string>();
    inserted.forEach(s => stepMap.set(s.step_name, s.id));

    const depInserts: { source_step_id: string; target_step_id: string }[] = [];
    DEFAULT_DEPENDENCIES.forEach(([src, tgt]) => {
      const srcId = stepMap.get(src);
      const tgtId = stepMap.get(tgt);
      if (srcId && tgtId) {
        depInserts.push({ source_step_id: srcId, target_step_id: tgtId });
      }
    });

    if (depInserts.length > 0) {
      await supabase.from('launch_dependencies').insert(depInserts);
    }

    setSteps(inserted);
    toast({ title: '프로세스 단계가 자동 생성되었습니다' });
  };

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const doneCount = steps.filter(s => s.status === 'done').length;
  const inProgressCount = steps.filter(s => s.status === 'in-progress').length;
  const progressPercent = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

  const phaseSummary = PHASES.map(phase => {
    const phaseSteps = steps.filter(s => s.phase === phase);
    const done = phaseSteps.filter(s => s.status === 'done').length;
    return { phase, total: phaseSteps.length, done };
  }).filter(p => p.total > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">{product.name}</h2>
            <p className="text-sm text-muted-foreground">{product.category} · 런칭 프로세스</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSteps}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> 새로고침
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border bg-card">
          <p className="text-xs text-muted-foreground">전체 진행률</p>
          <p className="text-xl font-bold">{progressPercent}%</p>
          <Progress value={progressPercent} className="h-1.5 mt-1" />
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <p className="text-xs text-muted-foreground">완료</p>
          <p className="text-xl font-bold text-success">{doneCount}<span className="text-sm text-muted-foreground">/{steps.length}</span></p>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <p className="text-xs text-muted-foreground">진행중</p>
          <p className="text-xl font-bold text-info">{inProgressCount}</p>
        </div>
        <div className="p-3 rounded-lg border bg-card">
          <p className="text-xs text-muted-foreground">대기</p>
          <p className="text-xl font-bold text-muted-foreground">{steps.length - doneCount - inProgressCount}</p>
        </div>
      </div>

      {/* Phase progress */}
      <div className="flex flex-wrap gap-2">
        {phaseSummary.map(p => (
          <Badge
            key={p.phase}
            variant="outline"
            className={`text-xs border ${PHASE_BG_COLORS[p.phase] || ''}`}
          >
            {p.phase} {p.done}/{p.total}
          </Badge>
        ))}
      </div>

      {/* Tabs: Gantt / Kanban */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="gantt" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Gantt Chart
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5">
            <Columns3 className="h-3.5 w-3.5" /> Kanban Board
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gantt">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <LaunchGanttChart
              steps={steps}
              dependencies={dependencies}
              profiles={profiles}
              onStepClick={setSelectedStep}
            />
          )}
        </TabsContent>

        <TabsContent value="kanban">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            <LaunchKanbanBoard
              steps={steps}
              profiles={profiles}
              onStepClick={setSelectedStep}
              onRefresh={fetchSteps}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Step detail dialog */}
      <LaunchStepDialog
        open={!!selectedStep}
        onOpenChange={(open) => !open && setSelectedStep(null)}
        step={selectedStep}
        profiles={profiles}
        onSaved={fetchSteps}
      />
    </div>
  );
}
