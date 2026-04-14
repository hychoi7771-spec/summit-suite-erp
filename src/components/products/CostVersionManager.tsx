import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calculator, History, Copy, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const costCategories = ['원료비', '포장비', '제조비', '인건비', '물류비', '인증비', '기타'];

interface CostVersionManagerProps {
  products: any[];
}

export function CostVersionManager({ products }: CostVersionManagerProps) {
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New version dialog
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionForm, setVersionForm] = useState({ version_name: '', notes: '' });

  // New item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ item_name: '', category: '원료비', unit_cost: '', quantity: '1', notes: '' });

  // Duplicate dialog
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');

  useEffect(() => {
    if (selectedProductId) fetchVersions();
    else { setVersions([]); setSelectedVersion(null); setItems([]); }
  }, [selectedProductId]);

  useEffect(() => {
    if (selectedVersion) fetchItems();
    else setItems([]);
  }, [selectedVersion?.id]);

  const fetchVersions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cost_versions')
      .select('*')
      .eq('product_id', selectedProductId)
      .order('created_at', { ascending: false });
    setVersions(data || []);
    if (!selectedVersion || selectedVersion.product_id !== selectedProductId) {
      setSelectedVersion(data?.[0] || null);
    }
    setLoading(false);
  };

  const fetchItems = async () => {
    if (!selectedVersion) return;
    const { data } = await supabase
      .from('cost_analysis')
      .select('*')
      .eq('version_id', selectedVersion.id)
      .order('created_at', { ascending: true });
    setItems(data || []);
  };

  const handleCreateVersion = async () => {
    if (!selectedProductId || !versionForm.version_name) return;
    const { error } = await supabase.from('cost_versions').insert({
      product_id: selectedProductId,
      version_name: versionForm.version_name,
      notes: versionForm.notes || null,
    });
    if (error) {
      toast({ title: '버전 생성 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '새 버전이 생성되었습니다' });
      setVersionForm({ version_name: '', notes: '' });
      setVersionDialogOpen(false);
      fetchVersions();
    }
  };

  const handleDuplicateVersion = async () => {
    if (!selectedVersion || !duplicateName) return;
    // Create new version
    const { data: newVersion, error: vErr } = await supabase.from('cost_versions').insert({
      product_id: selectedProductId,
      version_name: duplicateName,
      notes: `${selectedVersion.version_name}에서 복사됨`,
      total_cost: selectedVersion.total_cost,
    }).select().single();

    if (vErr || !newVersion) {
      toast({ title: '복사 실패', description: vErr?.message, variant: 'destructive' });
      return;
    }

    // Copy items
    if (items.length > 0) {
      const newItems = items.map(item => ({
        product_id: selectedProductId,
        version_id: newVersion.id,
        item_name: item.item_name,
        category: item.category,
        unit_cost: item.unit_cost,
        quantity: item.quantity,
        total_cost: item.total_cost,
        notes: item.notes,
      }));
      await supabase.from('cost_analysis').insert(newItems);
    }

    toast({ title: '버전이 복사되었습니다' });
    setDuplicateName('');
    setDuplicateDialogOpen(false);
    fetchVersions();
  };

  const handleAddItem = async () => {
    if (!selectedVersion) return;
    const unitCost = parseInt(itemForm.unit_cost) || 0;
    const quantity = parseInt(itemForm.quantity) || 1;
    const totalCost = unitCost * quantity;

    const { error } = await supabase.from('cost_analysis').insert({
      product_id: selectedProductId,
      version_id: selectedVersion.id,
      item_name: itemForm.item_name,
      category: itemForm.category,
      unit_cost: unitCost,
      quantity,
      total_cost: totalCost,
      notes: itemForm.notes || null,
    });

    if (error) {
      toast({ title: '항목 추가 실패', description: error.message, variant: 'destructive' });
    } else {
      setItemForm({ item_name: '', category: '원료비', unit_cost: '', quantity: '1', notes: '' });
      setItemDialogOpen(false);
      fetchItems();
      updateVersionTotal();
    }
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from('cost_analysis').delete().eq('id', id);
    fetchItems();
    updateVersionTotal();
  };

  const updateVersionTotal = async () => {
    if (!selectedVersion) return;
    const { data } = await supabase
      .from('cost_analysis')
      .select('total_cost')
      .eq('version_id', selectedVersion.id);
    const total = (data || []).reduce((s, i) => s + (i.total_cost || 0), 0);
    await supabase.from('cost_versions').update({ total_cost: total }).eq('id', selectedVersion.id);
    setSelectedVersion((v: any) => v ? { ...v, total_cost: total } : v);
    fetchVersions();
  };

  const totalCost = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);
  const byCategory = costCategories.map(cat => ({
    category: cat,
    total: items.filter(i => i.category === cat).reduce((s, i) => s + (i.total_cost || 0), 0),
  })).filter(c => c.total > 0);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      {/* Product selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="space-y-1.5 w-full sm:w-72">
          <Label className="text-sm font-medium">제품 선택</Label>
          <Select value={selectedProductId} onValueChange={v => { setSelectedProductId(v); setSelectedVersion(null); }}>
            <SelectTrigger><SelectValue placeholder="제품을 선택하세요" /></SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name} ({p.category})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedProductId ? (
        <div className="border border-dashed rounded-lg p-12 text-center text-sm text-muted-foreground">
          <Calculator className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          제품을 선택하면 원가 버전을 관리할 수 있습니다
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Version list sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <History className="h-4 w-4" /> 버전 목록
              </h4>
              <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                    <Plus className="h-3 w-3" />새 버전
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>새 원가 버전 생성</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div className="space-y-1">
                      <Label>버전명</Label>
                      <Input placeholder="예: v1.0 초기 견적" value={versionForm.version_name} onChange={e => setVersionForm(f => ({ ...f, version_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>메모</Label>
                      <Input placeholder="선택사항" value={versionForm.notes} onChange={e => setVersionForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <Button onClick={handleCreateVersion} disabled={!versionForm.version_name} className="w-full">생성</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /></div>
            ) : versions.length === 0 ? (
              <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground">
                등록된 버전이 없습니다.<br />새 버전을 생성하세요.
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map(v => (
                  <Card
                    key={v.id}
                    className={`cursor-pointer transition-all hover:shadow-sm ${selectedVersion?.id === v.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                    onClick={() => setSelectedVersion(v)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{v.version_name}</span>
                        {selectedVersion?.id === v.id && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{v.total_cost?.toLocaleString()}원</p>
                      {v.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{v.notes}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(v.created_at).toLocaleDateString('ko-KR')}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Cost items detail */}
          <div className="lg:col-span-3 space-y-4">
            {!selectedVersion ? (
              <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
                버전을 선택하거나 새로 생성하세요
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      {selectedProduct?.name} — {selectedVersion.version_name}
                    </h3>
                    {selectedVersion.notes && <p className="text-xs text-muted-foreground mt-0.5">{selectedVersion.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1">
                          <Copy className="h-3.5 w-3.5" />버전 복사
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>버전 복사</DialogTitle></DialogHeader>
                        <div className="space-y-3 mt-2">
                          <div className="space-y-1">
                            <Label>새 버전명</Label>
                            <Input placeholder="예: v2.0 수정 견적" value={duplicateName} onChange={e => setDuplicateName(e.target.value)} />
                          </div>
                          <Button onClick={handleDuplicateVersion} disabled={!duplicateName} className="w-full">복사하여 생성</Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />항목 추가</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>원가 항목 추가</DialogTitle></DialogHeader>
                        <div className="space-y-3 mt-2">
                          <div className="space-y-1">
                            <Label>항목명</Label>
                            <Input placeholder="예: 히알루론산" value={itemForm.item_name} onChange={e => setItemForm(f => ({ ...f, item_name: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label>분류</Label>
                            <Select value={itemForm.category} onValueChange={v => setItemForm(f => ({ ...f, category: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{costCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>단가 (원)</Label>
                              <Input type="number" placeholder="0" value={itemForm.unit_cost} onChange={e => setItemForm(f => ({ ...f, unit_cost: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <Label>수량</Label>
                              <Input type="number" placeholder="1" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label>비고</Label>
                            <Input placeholder="선택사항" value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} />
                          </div>
                          <Button onClick={handleAddItem} disabled={!itemForm.item_name || !itemForm.unit_cost} className="w-full">추가</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {items.length === 0 ? (
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
                              <TableCell><Badge variant="secondary" className="text-xs">{item.category}</Badge></TableCell>
                              <TableCell className="text-right text-sm">{item.unit_cost?.toLocaleString()}원</TableCell>
                              <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-right text-sm font-medium">{item.total_cost?.toLocaleString()}원</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{item.notes || '—'}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item.id)}>
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

                    {/* Version comparison hint */}
                    {versions.length >= 2 && (
                      <div className="bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground">
                        💡 좌측 버전 목록에서 다른 버전을 클릭하면 이전 원가와 비교할 수 있습니다.
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
