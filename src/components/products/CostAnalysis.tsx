import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Calculator, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const costCategories = ['원료비', '포장비', '제조비', '인건비', '물류비', '인증비', '기타'];

interface CostAnalysisProps {
  productId: string;
  productName: string;
}

export function CostAnalysis({ productId, productName }: CostAnalysisProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ item_name: '', category: '원료비', unit_cost: '', quantity: '1', notes: '' });

  useEffect(() => { fetchItems(); }, [productId]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('cost_analysis')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    const unitCost = parseInt(form.unit_cost) || 0;
    const quantity = parseInt(form.quantity) || 1;
    const { error } = await supabase.from('cost_analysis').insert({
      product_id: productId,
      item_name: form.item_name,
      category: form.category,
      unit_cost: unitCost,
      quantity,
      total_cost: unitCost * quantity,
      notes: form.notes || null,
    });
    if (error) {
      toast({ title: '등록 실패', description: error.message, variant: 'destructive' });
    } else {
      setForm({ item_name: '', category: '원료비', unit_cost: '', quantity: '1', notes: '' });
      setDialogOpen(false);
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('cost_analysis').delete().eq('id', id);
    fetchItems();
  };

  const totalCost = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);
  const byCategory = costCategories.map(cat => ({
    category: cat,
    total: items.filter(i => i.category === cat).reduce((s, i) => s + (i.total_cost || 0), 0),
  })).filter(c => c.total > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Calculator className="h-4 w-4" />원가분석표 — {productName}</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />항목 추가</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>원가 항목 추가</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label>항목명</Label>
                <Input placeholder="예: 히알루론산" value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>분류</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{costCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>단가 (원)</Label>
                  <Input type="number" placeholder="0" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>수량</Label>
                  <Input type="number" placeholder="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>비고</Label>
                <Input placeholder="선택사항" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button onClick={handleAdd} disabled={!form.item_name || !form.unit_cost} className="w-full">추가</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
      ) : items.length === 0 ? (
        <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">등록된 원가 항목이 없습니다</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>항목</TableHead>
                  <TableHead>분류</TableHead>
                  <TableHead className="text-right">단가</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">합계</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm">{item.item_name}</TableCell>
                    <TableCell><span className="text-xs bg-muted px-2 py-0.5 rounded">{item.category}</span></TableCell>
                    <TableCell className="text-right text-sm">{item.unit_cost.toLocaleString()}원</TableCell>
                    <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{item.total_cost.toLocaleString()}원</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.notes || '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={4}>총 원가</TableCell>
                  <TableCell className="text-right">{totalCost.toLocaleString()}원</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {byCategory.length > 0 && (
            <div className="flex gap-3 flex-wrap">
              {byCategory.map(c => (
                <div key={c.category} className="bg-muted/40 rounded-lg px-3 py-2 text-xs">
                  <span className="text-muted-foreground">{c.category}</span>
                  <span className="ml-2 font-semibold">{c.total.toLocaleString()}원</span>
                  <span className="ml-1 text-muted-foreground">({totalCost > 0 ? Math.round(c.total / totalCost * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
