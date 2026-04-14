import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Constants } from '@/integrations/supabase/types';
import { ProductBoard } from '@/components/products/ProductBoard';
import { CostVersionManager } from '@/components/products/CostVersionManager';
import { CostAnalysis } from '@/components/products/CostAnalysis';
import { ProductComments } from '@/components/products/ProductComments';

type ProductStage = 'Planning' | 'R&D/Sampling' | 'Design' | 'Certification' | 'Production' | 'Launch';
const stages: ProductStage[] = ['Planning', 'R&D/Sampling', 'Design', 'Certification', 'Production', 'Launch'];
const stageLabels: Record<ProductStage, string> = {
  'Planning': '기획', 'R&D/Sampling': 'R&D/샘플링', 'Design': '디자인',
  'Certification': '인증', 'Production': '생산', 'Launch': '출시',
};
const categories = Constants.public.Enums.product_category;

export default function Products() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState({ name: '', category: '', stage: 'Planning', description: '', assignee_id: '', deadline: '' });
  const [costProduct, setCostProduct] = useState<any>(null);

  const isAdmin = userRole === 'ceo' || userRole === 'general_director';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [prodRes, profRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, name_kr, avatar'),
    ]);
    setProducts(prodRes.data || []);
    setProfiles(profRes.data || []);
    setLoading(false);
  };

  const openEditDialog = (product: any) => {
    setEditProduct(product);
    setForm({
      name: product.name,
      category: product.category,
      stage: product.stage,
      description: product.description || '',
      assignee_id: product.assignee_id || '',
      deadline: product.deadline || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditProduct(null);
    setForm({ name: '', category: '', stage: 'Planning', description: '', assignee_id: '', deadline: '' });
  };

  const handleSubmit = async () => {
    if (editProduct) {
      const { error } = await supabase.from('products').update({
        name: form.name,
        category: form.category as any,
        stage: form.stage as any,
        description: form.description,
        assignee_id: form.assignee_id || null,
        deadline: form.deadline || null,
      }).eq('id', editProduct.id);
      if (error) {
        toast({ title: '수정 실패', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '제품 수정 완료' });
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    } else {
      const { error } = await supabase.from('products').insert({
        name: form.name,
        category: form.category as any,
        stage: form.stage as any,
        description: form.description,
        assignee_id: form.assignee_id || null,
        deadline: form.deadline || null,
      });
      if (error) {
        toast({ title: '제품 등록 실패', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '제품 등록 완료' });
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '제품이 삭제되었습니다' });
      setCostProduct(null);
      fetchData();
    }
  };

  const filteredProducts = filterCategory === 'all' ? products : products.filter(p => p.category === filterCategory);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">제품 개발</h1>
          <p className="text-sm text-muted-foreground mt-1">기획부터 출시까지 제품 개발 현황 관리</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" />새 제품 등록
        </Button>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editProduct ? '제품 수정' : '새 제품 등록'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>제품명</Label>
              <Input placeholder="제품명 입력" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="카테고리 선택" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>단계</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{stages.map(s => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>담당자</Label>
              <Select value={form.assignee_id} onValueChange={v => setForm(f => ({ ...f, assignee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>마감일</Label>
              <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea placeholder="제품 설명" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <Button onClick={handleSubmit} disabled={!form.name || !form.category} className="w-full">
              {editProduct ? '수정' : '등록'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="board" className="w-full">
        <TabsList>
          <TabsTrigger value="board" className="gap-1.5"><Package className="h-3.5 w-3.5" />제품 현황</TabsTrigger>
          <TabsTrigger value="cost" className="gap-1.5"><Calculator className="h-3.5 w-3.5" />원가 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['all', ...categories].map(cat => (
              <Button key={cat} variant={filterCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory(cat)}>
                {cat === 'all' ? '전체 제품' : cat}
              </Button>
            ))}
          </div>
          <ProductBoard products={filteredProducts} profiles={profiles} onSelectProduct={setCostProduct} />
        </TabsContent>

        <TabsContent value="cost" className="mt-4">
          <CostVersionManager products={products} />
        </TabsContent>
      </Tabs>

      {/* Product Detail Dialog */}
      <Dialog open={!!costProduct} onOpenChange={open => !open && setCostProduct(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{costProduct?.name} 상세</DialogTitle>
              {isAdmin && costProduct && (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => { openEditDialog(costProduct); setCostProduct(null); }}>수정</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(costProduct.id)}>삭제</Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {costProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">카테고리:</span> <span className="font-medium">{costProduct.category}</span></div>
                <div><span className="text-muted-foreground">단계:</span> <span className="font-medium">{stageLabels[costProduct.stage as ProductStage]}</span></div>
                {costProduct.description && <div className="col-span-2"><span className="text-muted-foreground">설명:</span> <span>{costProduct.description}</span></div>}
              </div>
              <div className="border-t pt-4">
                <CostAnalysis productId={costProduct.id} productName={costProduct.name} />
              </div>
              <div className="border-t pt-4">
                <ProductComments productId={costProduct.id} profiles={profiles} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
