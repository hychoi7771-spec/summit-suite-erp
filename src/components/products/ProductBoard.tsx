import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type ProductStage = 'Planning' | 'R&D/Sampling' | 'Design' | 'Certification' | 'Production' | 'Launch';

const stages: ProductStage[] = ['Planning', 'R&D/Sampling', 'Design', 'Certification', 'Production', 'Launch'];
const stageLabels: Record<ProductStage, string> = {
  'Planning': '기획', 'R&D/Sampling': 'R&D/샘플링', 'Design': '디자인',
  'Certification': '인증', 'Production': '생산', 'Launch': '출시',
};

interface ProductBoardProps {
  products: any[];
  profiles: any[];
  onSelectProduct: (product: any) => void;
}

export function ProductBoard({ products, profiles, onSelectProduct }: ProductBoardProps) {
  const getProfile = (id: string | null) => profiles.find((p: any) => p.id === id);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {stages.map(stage => {
          const stageProducts = products.filter((p: any) => p.stage === stage);
          return (
            <div key={stage} className="w-64 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={stage} />
                <span className="text-xs text-muted-foreground font-medium">{stageLabels[stage]}</span>
                <span className="text-xs text-muted-foreground">({stageProducts.length})</span>
              </div>
              <div className="space-y-3">
                {stageProducts.map((product: any) => {
                  const assignee = getProfile(product.assignee_id);
                  return (
                    <Card key={product.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectProduct(product)}>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                        </div>
                        {product.description && <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>}
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>진행률</span><span>{product.progress}%</span>
                          </div>
                          <Progress value={product.progress} className="h-1.5" />
                        </div>
                        <div className="flex items-center justify-between">
                          {assignee && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5 bg-primary"><AvatarFallback className="bg-primary text-primary-foreground text-[9px]">{assignee.avatar}</AvatarFallback></Avatar>
                              <span className="text-xs text-muted-foreground">{assignee.name_kr}</span>
                            </div>
                          )}
                          {product.deadline && <span className="text-xs text-muted-foreground">{product.deadline}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {stageProducts.length === 0 && (
                  <div className="border border-dashed border-border rounded-lg p-6 text-center">
                    <p className="text-xs text-muted-foreground">제품 없음</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
