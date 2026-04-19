import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pin, Clock, Trash2, Megaphone, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { notifyAdmins } from '@/lib/notifications';

// 공경미 실장 프로필 ID — 대표/이사와 함께 자동 팝업 권한 보유
const POPUP_AUTHOR_PROFILE_IDS = new Set<string>([
  '352c4d35-3f3b-4f94-b7bd-f4c18762bfaf',
]);

export default function Notices() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [notices, setNotices] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', show_as_popup: false });
  const [submitting, setSubmitting] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);

  // 팝업 공지 자동 활성화 권한: 대표/이사 + 공경미 실장
  const canAutoPopup = useMemo(() => {
    if (userRole === 'ceo' || userRole === 'general_director') return true;
    if (profile && POPUP_AUTHOR_PROFILE_IDS.has(profile.id)) return true;
    return false;
  }, [userRole, profile]);

  // 모든 공지를 관리(수정/삭제/팝업/고정)할 수 있는 권한: 대표/이사 + 공경미 실장
  const isNoticeAdmin = useMemo(() => {
    if (userRole === 'ceo' || userRole === 'general_director') return true;
    if (profile && POPUP_AUTHOR_PROFILE_IDS.has(profile.id)) return true;
    return false;
  }, [userRole, profile]);

  // 특정 공지에 대한 관리 권한 (작성자 본인 또는 관리자)
  const canManageNotice = (notice: any) =>
    isNoticeAdmin || (profile && notice?.author_id === profile.id);

  useEffect(() => { fetchData(); }, []);

  // 작성 다이얼로그 열릴 때: 신규는 권한자 팝업 기본 ON, 편집은 기존 값 유지
  useEffect(() => {
    if (dialogOpen && !editingId) {
      setForm(f => ({ ...f, show_as_popup: canAutoPopup }));
    }
    if (!dialogOpen) {
      setEditingId(null);
    }
  }, [dialogOpen, canAutoPopup, editingId]);

  const fetchData = async () => {
    const [noticeRes, profRes] = await Promise.all([
      supabase.from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, name_kr, avatar'),
    ]);
    setNotices(noticeRes.data || []);
    setProfiles(profRes.data || []);
    setLoading(false);
  };

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  const handleSubmit = async () => {
    if (!profile || !form.title) return;
    setSubmitting(true);

    if (editingId) {
      // 편집 모드
      const { error } = await supabase
        .from('notices')
        .update({
          title: form.title,
          content: form.content,
          show_as_popup: form.show_as_popup,
        } as any)
        .eq('id', editingId);
      if (error) {
        toast({ title: '수정 실패', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '공지 수정 완료' });
        setDialogOpen(false);
        setEditingId(null);
        setForm({ title: '', content: '', show_as_popup: false });
        fetchData();
      }
    } else {
      // 신규 작성
      const { error } = await supabase.from('notices').insert({
        title: form.title,
        content: form.content,
        author_id: profile.id,
        show_as_popup: form.show_as_popup,
      } as any);
      if (error) {
        toast({ title: '등록 실패', description: error.message, variant: 'destructive' });
      } else {
        await notifyAdmins(
          '새 공지 등록',
          `${profile.name_kr}님이 "${form.title}" 공지를 등록했습니다.${form.show_as_popup ? ' (팝업 공지)' : ''}`,
          'notice',
        );
        toast({
          title: '공지 등록 완료',
          description: form.show_as_popup ? '로그인한 팀원에게 팝업으로 표시됩니다.' : undefined,
        });
        setDialogOpen(false);
        setForm({ title: '', content: '', show_as_popup: false });
        fetchData();
      }
    }
    setSubmitting(false);
  };

  const handleStartEdit = (notice: any) => {
    setEditingId(notice.id);
    setForm({
      title: notice.title ?? '',
      content: notice.content ?? '',
      show_as_popup: !!notice.show_as_popup,
    });
    setSelectedNotice(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '공지 삭제 완료' });
      setSelectedNotice(null);
      fetchData();
    }
  };

  const togglePin = async (notice: any) => {
    await supabase.from('notices').update({ is_pinned: !notice.is_pinned }).eq('id', notice.id);
    fetchData();
  };

  const togglePopup = async (notice: any) => {
    const { error } = await supabase
      .from('notices')
      .update({ show_as_popup: !notice.show_as_popup } as any)
      .eq('id', notice.id);
    if (error) {
      toast({ title: '팝업 설정 실패', description: error.message, variant: 'destructive' });
      return;
    }
    setSelectedNotice({ ...notice, show_as_popup: !notice.show_as_popup });
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">공지 게시판</h1>
          <p className="text-sm text-muted-foreground mt-1">사내 공지사항 및 안내</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0"><Plus className="h-4 w-4" />공지 작성</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>새 공지 작성</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input placeholder="공지 제목" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>내용</Label>
                <Textarea placeholder="공지 내용을 입력하세요" rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <Megaphone className="h-3.5 w-3.5 text-primary" />
                    로그인 시 팝업으로 표시
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {canAutoPopup
                      ? '권한자: 기본 활성화 (해제 가능)'
                      : '대표/이사/실장만 자동 활성화됩니다'}
                  </p>
                </div>
                <Switch
                  checked={form.show_as_popup}
                  onCheckedChange={v => setForm(f => ({ ...f, show_as_popup: v }))}
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !form.title} className="w-full">
                {submitting ? '등록 중...' : '등록'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {notices.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">공지사항이 없습니다</CardContent></Card>
        )}
        {notices.map(notice => {
          const author = getProfile(notice.author_id);
          return (
            <Card key={notice.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedNotice(notice)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {notice.is_pinned && <Pin className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{notice.title}</p>
                      {notice.show_as_popup && (
                        <Badge variant="default" className="gap-1 h-5 text-[10px]">
                          <Megaphone className="h-2.5 w-2.5" />
                          팝업
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notice.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {author && (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-4 w-4 bg-primary"><AvatarFallback className="bg-primary text-primary-foreground text-[8px]">{author.avatar}</AvatarFallback></Avatar>
                          <span className="text-xs text-muted-foreground">{author.name_kr}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(notice.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notice Detail Dialog */}
      <Dialog open={!!selectedNotice} onOpenChange={open => !open && setSelectedNotice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selectedNotice?.is_pinned && <Pin className="h-4 w-4 text-primary" />}
              <span>{selectedNotice?.title}</span>
              {selectedNotice?.show_as_popup && (
                <Badge variant="default" className="gap-1 h-5 text-[10px]">
                  <Megaphone className="h-2.5 w-2.5" />
                  팝업
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedNotice && (
            <div className="space-y-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{selectedNotice.content}</div>
              <div className="flex items-center justify-between pt-3 border-t flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {(() => { const a = getProfile(selectedNotice.author_id); return a ? <span>{a.name_kr}</span> : null; })()}
                  <span>·</span>
                  <span>{new Date(selectedNotice.created_at).toLocaleString('ko-KR')}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {canManageNotice(selectedNotice) && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => togglePopup(selectedNotice)}>
                        <Megaphone className="h-3.5 w-3.5 mr-1" />
                        {selectedNotice.show_as_popup ? '팝업 해제' : '팝업 설정'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => togglePin(selectedNotice)}>
                        <Pin className="h-3.5 w-3.5 mr-1" />{selectedNotice.is_pinned ? '고정 해제' : '고정'}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(selectedNotice.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />삭제
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
