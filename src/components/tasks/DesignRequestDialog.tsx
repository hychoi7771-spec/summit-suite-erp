import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette, CalendarIcon, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DesignRequestDialogProps {
  profiles: any[];
  onSuccess: () => void;
}

export default function DesignRequestDialog({ profiles, onSuccess }: DesignRequestDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    assignee_id: '',
    project_name: '',
    description: '',
    key_story: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.project_name || !form.assignee_id) return;
    setLoading(true);

    try {
      // Upload attachments
      const attachmentUrls: string[] = [];
      for (const file of files) {
        const filePath = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('design-attachments')
          .upload(filePath, file);
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('design-attachments')
            .getPublicUrl(filePath);
          attachmentUrls.push(urlData.publicUrl);
        }
      }

      // Create task
      const { error } = await supabase.from('tasks').insert({
        title: `[디자인 의뢰] ${form.project_name}`,
        description: form.description || null,
        priority: 'high' as any,
        assignee_id: form.assignee_id,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        status: 'todo' as any,
        is_design_request: true,
        project_name: form.project_name,
        key_story: form.key_story || null,
        attachments: attachmentUrls,
        tags: ['디자인'],
      });

      if (error) throw error;

      // Send notification to assignee
      const assignee = profiles.find(p => p.id === form.assignee_id);
      if (assignee) {
        // Get the user_id from the profile to send notification
        const { data: assigneeProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('id', form.assignee_id)
          .single();

        if (assigneeProfile) {
          await supabase.from('notifications').insert({
            user_id: assigneeProfile.user_id,
            title: '새 디자인 의뢰가 도착했습니다',
            message: `${profile?.name_kr || ''}님이 "${form.project_name}" 디자인을 의뢰했습니다.`,
            type: 'task',
          });
        }
      }

      toast({ title: '디자인 의뢰가 등록되었습니다' });
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (e: any) {
      toast({ title: '등록 실패', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ assignee_id: '', project_name: '', description: '', key_story: '' });
    setDueDate(undefined);
    setFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 shrink-0 border-primary/30 text-primary hover:bg-primary/10">
          <Palette className="h-4 w-4" />디자인 의뢰하기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            디자인 의뢰하기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* 담당자 지정 */}
          <div className="space-y-2">
            <Label className="font-semibold">담당 팀원 지정 *</Label>
            <Select value={form.assignee_id} onValueChange={v => setForm(f => ({ ...f, assignee_id: v }))}>
              <SelectTrigger><SelectValue placeholder="담당자를 선택하세요" /></SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name_kr} ({p.name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 프로젝트명 */}
          <div className="space-y-2">
            <Label className="font-semibold">프로젝트명 *</Label>
            <Input
              placeholder="예: 리커버리 치약 펀딩 페이지 디자인"
              value={form.project_name}
              onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))}
            />
          </div>

          {/* 상세 설명 */}
          <div className="space-y-2">
            <Label className="font-semibold">상세 설명</Label>
            <Textarea
              placeholder="디자인 요청 사항을 상세히 기술해주세요"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* 핵심 강조 스토리 */}
          <div className="space-y-2">
            <Label className="font-semibold">핵심 강조 스토리</Label>
            <Textarea
              placeholder="예: 8차 샘플링 과정, 임상 시험 결과 등 강조할 내용"
              value={form.key_story}
              onChange={e => setForm(f => ({ ...f, key_story: e.target.value }))}
              rows={3}
            />
          </div>

          {/* 필수 첨부 자료 */}
          <div className="space-y-2">
            <Label className="font-semibold">필수 첨부 자료</Label>
            <p className="text-xs text-muted-foreground">임상 시험 결과 보고서, 의약외품 인증서 등</p>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">파일을 선택하세요</span>
              <input type="file" multiple className="hidden" onChange={handleFileChange} />
            </label>
            {files.length > 0 && (
              <div className="space-y-1 mt-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted rounded px-3 py-1.5 text-sm">
                    <span className="truncate flex-1">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="ml-2 text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 마감 기한 */}
          <div className="space-y-2">
            <Label className="font-semibold">마감 기한</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'yyyy년 MM월 dd일', { locale: ko }) : '마감일을 선택하세요'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!form.project_name || !form.assignee_id || loading}
            className="w-full"
          >
            {loading ? '등록 중...' : '디자인 의뢰 등록'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
