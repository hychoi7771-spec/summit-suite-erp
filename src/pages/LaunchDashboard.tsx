import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { LaunchProcessDetail } from '@/components/launch/LaunchProcessDetail';
import { Rocket, ChevronRight, AlertTriangle } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function LaunchDashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [stepsSummary, setStepsSummary] = useState<Record<string, { total: number; done: number; overdue: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [prodRes, profRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at'),
        supabase.from('profiles').select('*'),
      ]);
      setProducts(prodRes.data || []);
      setProfiles(profRes.data || []);

      // Fetch launch steps summary for all products
      const { data: allSteps } = await supabase.from('launch_steps').select('product_id, status, deadline');
      const summary: Record<string, { total: number; done: number; overdue: number }> = {};
      (allSteps || []).forEach(s => {
        if (!summary[s.product_id]) summary[s.product_id] = { total: 0, done: 0, overdue: 0 };
        summary[s.product_id].total++;
        if (s.status === 'done') summary[s.product_id].done++;
        if (s.deadline && differenceInDays(new Date(s.deadline), new Date()) < 0 && s.status !== 'done') {
          summary[s.product_id].overdue++;
        }
      });
      setStepsSummary(summary);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (selectedProduct) {
    return (
      <div className="p-6">
        <LaunchProcessDetail
          product={selectedProduct}
          profiles={profiles}
          onBack={() => setSelectedProduct(null)}
        />
      </div>
    );
  }

  const getAssignee = (id: string | null) => profiles.find(p => p.id === id);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Rocket className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">런칭 프로세스 관리</h1>
        </div>
        <p className="text-sm text-muted-foreground">의약외품 및 기능성 화장품 런칭 프로세스를 단계별로 관리합니다</p>
      </div>

      {/* Project Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => {
            const summary = stepsSummary[product.id];
            const progress = summary ? Math.round((summary.done / summary.total) * 100) : 0;
            const assignee = getAssignee(product.assignee_id);
            const hasOverdue = summary && summary.overdue > 0;

            return (
              <Card
                key={product.id}
                className={`cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 group ${
                  hasOverdue ? 'border-destructive/30' : ''
                }`}
                onClick={() => setSelectedProduct(product)}
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{product.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{product.category}</Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  {summary ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>진행률</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-success">완료 {summary.done}</span>
                          <span className="text-muted-foreground">전체 {summary.total}</span>
                        </div>
                        {hasOverdue && (
                          <span className="text-destructive flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            지연 {summary.overdue}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">프로세스 미설정 · 클릭하여 시작</p>
                  )}

                  {assignee && (
                    <div className="flex items-center gap-1.5 pt-1 border-t">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{assignee.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{assignee.name_kr}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
