import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Plus, FileText, Image, Archive, Download, File, Upload, ExternalLink, HardDrive, FolderOpen, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const fileIcons: Record<string, typeof FileText> = { PDF: FileText, AI: Image, ZIP: Archive };
const categoryOptions = ['브랜딩', '인증', '디자인', '계약서', '마케팅', '개발의뢰서', '견적서', '성분표', '기타'];
const previewableTypes = ['PDF', 'PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG'];

export default function Library() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('전체');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [form, setForm] = useState({ category: '' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  const isAdmin = userRole === 'ceo' || userRole === 'general_director';

  const handleDownload = async (url: string, fileName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setDownloading(true);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: '다운로드 실패', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [filesRes, profRes] = await Promise.all([
      supabase.from('asset_files').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, name_kr, avatar'),
    ]);
    setFiles(filesRes.data || []);
    setProfiles(profRes.data || []);
    setLoading(false);
  };

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  const handleUpload = async () => {
    if (!uploadFile || !profile || !form.category) return;
    setSubmitting(true);

    const ext = uploadFile.name.split('.').pop()?.toUpperCase() || 'FILE';
    const safeName = encodeURIComponent(uploadFile.name).replace(/%/g, '_');
    const path = `${Date.now()}_${safeName}`;
    const { data: storageData, error: storageError } = await supabase.storage.from('receipts').upload(`library/${path}`, uploadFile);

    if (storageError) {
      toast({ title: '파일 저장 실패', description: storageError.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(storageData.path);
    const url = urlData.publicUrl;

    const sizeKB = uploadFile.size / 1024;
    const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${Math.round(sizeKB)} KB`;

    const { error } = await supabase.from('asset_files').insert({
      name: uploadFile.name,
      type: ext,
      category: form.category,
      uploaded_by: profile.id,
      size: sizeStr,
      url,
    });

    if (error) {
      toast({ title: '파일 등록 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '파일 업로드 완료' });
      setDialogOpen(false);
      setUploadFile(null);
      setForm({ category: '' });
      fetchData();
    }
    setSubmitting(false);
  };

  const allCategories = ['전체', ...new Set(files.map(f => f.category))];
  const filtered = filterCategory === '전체' ? files : files.filter(f => f.category === filterCategory);

  // Storage stats
  const totalFiles = files.length;
  const totalSizeBytes = files.reduce((sum, f) => {
    if (!f.size) return sum;
    const match = f.size.match(/([\d.]+)\s*(KB|MB|GB)/i);
    if (!match) return sum;
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'KB') return sum + val * 1024;
    if (unit === 'MB') return sum + val * 1024 * 1024;
    if (unit === 'GB') return sum + val * 1024 * 1024 * 1024;
    return sum;
  }, 0);
  const totalSizeMB = totalSizeBytes / (1024 * 1024);
  const totalSizeGB = totalSizeBytes / (1024 * 1024 * 1024);
  const storageLimitGB = 1; // 1GB default
  const usagePercent = Math.min((totalSizeGB / storageLimitGB) * 100, 100);

  const categorySizes = categoryOptions.map(cat => {
    const catFiles = files.filter(f => f.category === cat);
    const bytes = catFiles.reduce((sum, f) => {
      if (!f.size) return sum;
      const match = f.size.match(/([\d.]+)\s*(KB|MB|GB)/i);
      if (!match) return sum;
      const val = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      if (unit === 'KB') return sum + val * 1024;
      if (unit === 'MB') return sum + val * 1024 * 1024;
      if (unit === 'GB') return sum + val * 1024 * 1024 * 1024;
      return sum;
    }, 0);
    return { category: cat, count: catFiles.length, bytes, sizeMB: bytes / (1024 * 1024) };
  }).filter(c => c.count > 0);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">자료실</h1>
          <p className="text-sm text-muted-foreground mt-1">디자인 자산, 인증서, 계약서 관리</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0"><Plus className="h-4 w-4" />파일 업로드</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>파일 업로드</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>파일</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <input type="file" className="hidden" id="lib-upload" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                  <label htmlFor="lib-upload" className="cursor-pointer">
                    {uploadFile ? (
                      <div className="flex items-center justify-center gap-2 text-sm"><File className="h-4 w-4 text-success" /><span>{uploadFile.name}</span></div>
                    ) : (
                      <div className="flex flex-col items-center gap-1"><Upload className="h-6 w-6 text-muted-foreground" /><span className="text-sm text-muted-foreground">클릭하여 파일 선택</span></div>
                    )}
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>분류</Label>
                <Select value={form.category} onValueChange={v => setForm({ category: v })}>
                  <SelectTrigger><SelectValue placeholder="분류 선택" /></SelectTrigger>
                  <SelectContent>{categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpload} disabled={submitting || !uploadFile || !form.category} className="w-full">
                {submitting ? '업로드 중...' : '업로드'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="files" className="w-full">
        <TabsList>
          <TabsTrigger value="files" className="gap-1.5"><FolderOpen className="h-3.5 w-3.5" />파일 목록</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="storage" className="gap-1.5"><HardDrive className="h-3.5 w-3.5" />저장 용량</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="files" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {allCategories.map(cat => (
              <Button key={cat} variant={filterCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory(cat)}>{cat}</Button>
            ))}
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>파일</TableHead>
                      <TableHead>분류</TableHead>
                      <TableHead>업로더</TableHead>
                      <TableHead>날짜</TableHead>
                      <TableHead>크기</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">파일이 없습니다</TableCell></TableRow>
                    )}
                    {filtered.map(file => {
                      const uploader = getProfile(file.uploaded_by);
                      const FileIcon = fileIcons[file.type] || File;
                      return (
                        <TableRow key={file.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedFile(file)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FileIcon className="h-4 w-4 text-primary" /></div>
                              <div className="min-w-0"><p className="text-sm font-medium truncate">{file.name}</p><p className="text-xs text-muted-foreground">{file.type}</p></div>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{file.category}</span></TableCell>
                          <TableCell>
                            {uploader && (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5 bg-primary"><AvatarFallback className="bg-primary text-primary-foreground text-[9px]">{uploader.avatar}</AvatarFallback></Avatar>
                                <span className="text-xs">{uploader.name_kr}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(file.created_at).toLocaleDateString('ko-KR')}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{file.size || '—'}</TableCell>
                          <TableCell>
                            {file.url && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleDownload(file.url, file.name, e)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="storage" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><HardDrive className="h-4 w-4" />저장 용량 현황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">전체 사용량</span>
                    <span className="font-semibold">
                      {totalSizeMB < 1 ? `${(totalSizeBytes / 1024).toFixed(1)} KB` : totalSizeMB < 1024 ? `${totalSizeMB.toFixed(1)} MB` : `${totalSizeGB.toFixed(2)} GB`}
                      {' / '}{storageLimitGB} GB
                    </span>
                  </div>
                  <Progress value={usagePercent} className="h-3" />
                  <p className="text-xs text-muted-foreground">총 {totalFiles}개 파일 · {usagePercent.toFixed(1)}% 사용 중</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">카테고리별 사용량</h4>
                  {categorySizes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">업로드된 파일이 없습니다</p>
                  ) : (
                    <div className="space-y-2">
                      {categorySizes.map(cs => (
                        <div key={cs.category} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">{cs.category}</span>
                            <span className="text-xs text-muted-foreground">({cs.count}개)</span>
                          </div>
                          <span className="text-sm font-medium">
                            {cs.sizeMB < 1 ? `${(cs.bytes / 1024).toFixed(1)} KB` : `${cs.sizeMB.toFixed(1)} MB`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* File Preview Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={open => !open && setSelectedFile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFile && (() => { const Icon = fileIcons[selectedFile.type] || File; return <Icon className="h-5 w-5 text-primary" />; })()}
              {selectedFile?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              {selectedFile.url && previewableTypes.includes(selectedFile.type) ? (
                selectedFile.type === 'PDF' ? (
                  <iframe src={selectedFile.url} className="w-full h-96 rounded-lg border" title={selectedFile.name} />
                ) : (
                  <div className="flex justify-center bg-muted/30 rounded-lg p-4">
                    <img src={selectedFile.url} alt={selectedFile.name} className="max-h-96 object-contain rounded" />
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-muted/20 rounded-lg">
                  <File className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">미리보기를 지원하지 않는 파일 형식입니다</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">분류:</span> <span className="font-medium">{selectedFile.category}</span></div>
                <div><span className="text-muted-foreground">형식:</span> <span className="font-medium">{selectedFile.type}</span></div>
                <div><span className="text-muted-foreground">크기:</span> <span className="font-medium">{selectedFile.size || '—'}</span></div>
                <div><span className="text-muted-foreground">날짜:</span> <span className="font-medium">{new Date(selectedFile.created_at).toLocaleDateString('ko-KR')}</span></div>
              </div>

              <div className="flex gap-2">
                {selectedFile.url ? (
                  <Button className="w-full gap-2" disabled={downloading} onClick={() => handleDownload(selectedFile.url, selectedFile.name)}>
                    <Download className="h-4 w-4" />{downloading ? '다운로드 중...' : '다운로드'}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground w-full text-center py-2">파일 URL이 없습니다. 재업로드가 필요합니다.</p>
                )}
              </div>

              {isAdmin && (
                <Button variant="destructive" className="w-full gap-2" onClick={async () => {
                  const { error } = await supabase.from('asset_files').delete().eq('id', selectedFile.id);
                  if (error) {
                    toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
                  } else {
                    toast({ title: '파일이 삭제되었습니다' });
                    setSelectedFile(null);
                    fetchData();
                  }
                }}>
                  <Trash2 className="h-4 w-4" />삭제
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
