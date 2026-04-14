import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, MessageSquare, Check, RotateCcw, Eye, Trash2, Send, Palette, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2, Pencil, Type, MousePointer, Undo2, Eraser, GitCompare, MapPin, Edit2, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  '검토중': { label: '검토중', color: 'bg-warning/10 text-warning border-warning/20', icon: Eye },
  '수정요청': { label: '수정요청', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: RotateCcw },
  '승인완료': { label: '승인완료', color: 'bg-success/10 text-success border-success/20', icon: Check },
};

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.3 } }),
};

type AnnotationMode = 'pointer' | 'draw' | 'text';

interface DrawStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface OtherUserStrokes {
  userId: string;
  userName: string;
  userColor: string;
  strokes: DrawStroke[];
}

const OTHER_USER_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#10b981'];

export default function DesignReviews() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = userRole === 'ceo' || userRole === 'general_director';

  const [reviews, setReviews] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [isRevisionRequest, setIsRevisionRequest] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Annotation state
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>('pointer');
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawWidth, setDrawWidth] = useState(3);
  const [myStrokes, setMyStrokes] = useState<DrawStroke[]>([]);
  const [othersStrokeGroups, setOthersStrokeGroups] = useState<OtherUserStrokes[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);

  // Point comment state
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [pendingPointText, setPendingPointText] = useState('');

  // Presence state for currently viewing users
  const [presentUsers, setPresentUsers] = useState<{ id: string; name: string; avatar: string }[]>([]);
  const presenceChannelRef = useRef<any>(null);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);

  // Version compare state
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLeft, setCompareLeft] = useState<string>('');
  const [compareRight, setCompareRight] = useState<string>('');
  const [compareSlider, setCompareSlider] = useState(50);
  const [compareMode, setCompareMode] = useState<'side' | 'slider'>('side');

  // Form state
  const [form, setForm] = useState({ title: '', description: '', version: 'v1', project_id: '', assignee_id: '' });
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', version: '', project_id: '', assignee_id: '' });
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editUploading, setEditUploading] = useState(false);

  const fetchData = async () => {
    const [revRes, profRes, prodRes] = await Promise.all([
      supabase.from('design_reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('products').select('id, name'),
    ]);
    setReviews(revRes.data || []);
    setProfiles(profRes.data || []);
    setProducts(prodRes.data || []);
    setLoading(false);
  };

  const fetchComments = async (reviewId: string) => {
    const { data } = await supabase
      .from('design_review_comments')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  const fetchAnnotations = async (reviewId: string, imgIdx: number) => {
    const { data } = await supabase
      .from('design_annotations')
      .select('*')
      .eq('review_id', reviewId)
      .eq('image_index', imgIdx);
    const myId = profile?.id;
    const mine: DrawStroke[] = [];
    const othersMap = new Map<string, DrawStroke[]>();
    (data || []).forEach((row: any) => {
      if (Array.isArray(row.strokes)) {
        if (row.user_id === myId) {
          mine.push(...(row.strokes as DrawStroke[]));
        } else {
          const existing = othersMap.get(row.user_id) || [];
          existing.push(...(row.strokes as DrawStroke[]));
          othersMap.set(row.user_id, existing);
        }
      }
    });
    setMyStrokes(mine);
    // Build grouped others with name & color
    let colorIdx = 0;
    const groups: OtherUserStrokes[] = [];
    othersMap.forEach((strokes, userId) => {
      const p = profiles.find(pr => pr.id === userId);
      groups.push({
        userId,
        userName: p ? (p.name_kr || p.name) : '알 수 없음',
        userColor: OTHER_USER_COLORS[colorIdx % OTHER_USER_COLORS.length],
        strokes,
      });
      colorIdx++;
    });
    setOthersStrokeGroups(groups);
  };

  const saveAnnotations = async (newStrokes: DrawStroke[]) => {
    if (!selectedReview || !profile) return;
    const { data: existing } = await supabase
      .from('design_annotations')
      .select('id')
      .eq('review_id', selectedReview.id)
      .eq('user_id', profile.id)
      .eq('image_index', activeImageIdx)
      .maybeSingle();

    if (existing) {
      await supabase.from('design_annotations').update({ strokes: newStrokes as any, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('design_annotations').insert({
        review_id: selectedReview.id,
        user_id: profile.id,
        image_index: activeImageIdx,
        strokes: newStrokes as any,
      });
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (selectedReview) {
      fetchComments(selectedReview.id);
      fetchAnnotations(selectedReview.id, activeImageIdx);
    } else {
      setMyStrokes([]);
      setOthersStrokeGroups([]);
    }
  }, [selectedReview, activeImageIdx]);

  // Realtime subscriptions
  useEffect(() => {
    if (!selectedReview) return;
    const channel = supabase
      .channel(`review-${selectedReview.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'design_review_comments', filter: `review_id=eq.${selectedReview.id}` }, () => {
        fetchComments(selectedReview.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'design_annotations', filter: `review_id=eq.${selectedReview.id}` }, () => {
        fetchAnnotations(selectedReview.id, activeImageIdx);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedReview?.id, activeImageIdx]);

  // Presence tracking for the detail view
  useEffect(() => {
    if (!selectedReview || !profile) {
      setPresentUsers([]);
      return;
    }
    const ch = supabase.channel(`presence-review-${selectedReview.id}`, { config: { presence: { key: profile.id } } });
    presenceChannelRef.current = ch;

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const users: { id: string; name: string; avatar: string }[] = [];
      const seen = new Set<string>();
      Object.values(state).forEach((arr: any) => {
        arr.forEach((u: any) => {
          if (!seen.has(u.id)) {
            seen.add(u.id);
            users.push({ id: u.id, name: u.name, avatar: u.avatar });
          }
        });
      });
      setPresentUsers(users);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({
          id: profile.id,
          name: profile.name_kr || profile.name,
          avatar: profile.avatar,
        });
      }
    });

    return () => {
      ch.untrack();
      supabase.removeChannel(ch);
      presenceChannelRef.current = null;
      setPresentUsers([]);
    };
  }, [selectedReview?.id, profile?.id]);

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  const handleCreate = async () => {
    if (!form.title || !profile) return;
    setUploading(true);

    let fileUrls: string[] = [];
    for (const file of formFiles) {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('design-reviews').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('design-reviews').getPublicUrl(path);
        fileUrls.push(urlData.publicUrl);
      }
    }

    const { error } = await supabase.from('design_reviews').insert({
      title: form.title,
      description: form.description,
      version: form.version,
      project_id: form.project_id || null,
      assignee_id: form.assignee_id || null,
      uploaded_by: profile.id,
      file_urls: fileUrls,
    });

    if (error) {
      toast({ title: '등록 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ 디자인 시안이 등록되었습니다' });
      setCreateOpen(false);
      setForm({ title: '', description: '', version: 'v1', project_id: '', assignee_id: '' });
      setFormFiles([]);
      fetchData();
    }
    setUploading(false);
  };

  const handleStatusChange = async (reviewId: string, newStatus: string) => {
    await supabase.from('design_reviews').update({ status: newStatus }).eq('id', reviewId);
    toast({ title: `상태가 "${newStatus}"로 변경되었습니다` });
    fetchData();
    if (selectedReview?.id === reviewId) {
      setSelectedReview((prev: any) => ({ ...prev, status: newStatus }));
    }
  };

  // Add a regular comment or point comment
  const handleAddComment = async (pinX?: number, pinY?: number, pinImageIndex?: number) => {
    const text = pinX !== undefined ? pendingPointText : newComment;
    if (!text.trim() || !selectedReview || !profile) return;

    // Build annotation summary for drawing strokes
    let annotationSummary = '';
    if (pinX === undefined && myStrokes.length > 0) {
      annotationSummary += `\n✏️ ${myStrokes.length}개 드로잉 마크 포함`;
    }

    const insertData: any = {
      review_id: selectedReview.id,
      user_id: profile.id,
      content: text + annotationSummary,
      is_revision_request: pinX !== undefined ? false : isRevisionRequest,
    };

    if (pinX !== undefined) {
      insertData.pin_x = pinX;
      insertData.pin_y = pinY;
      insertData.pin_image_index = pinImageIndex;
    }

    const { error } = await supabase.from('design_review_comments').insert(insertData);
    if (error) {
      console.error('Comment insert error:', error);
      toast({ title: '코멘트 저장 실패', description: error.message, variant: 'destructive' });
      return;
    }

    if (pinX === undefined && isRevisionRequest && selectedReview.status !== '수정요청') {
      await handleStatusChange(selectedReview.id, '수정요청');
    }

    if (pinX !== undefined) {
      setPendingPoint(null);
      setPendingPointText('');
    } else {
      setNewComment('');
      setIsRevisionRequest(false);
      setMyStrokes([]);
    }
    fetchComments(selectedReview.id);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('design_reviews').delete().eq('id', id);
    if (!error) {
      toast({ title: '🗑️ 시안이 삭제되었습니다' });
      setSelectedReview(null);
      fetchData();
    }
  };

  const openEdit = (review: any) => {
    setEditTarget(review);
    setEditForm({
      title: review.title,
      description: review.description || '',
      version: review.version,
      project_id: review.project_id || '',
      assignee_id: review.assignee_id || '',
    });
    setEditFiles([]);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget || !editForm.title) return;
    setEditUploading(true);

    let fileUrls = [...(editTarget.file_urls || [])];
    for (const file of editFiles) {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('design-reviews').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('design-reviews').getPublicUrl(path);
        fileUrls.push(urlData.publicUrl);
      }
    }

    const { error } = await supabase.from('design_reviews').update({
      title: editForm.title,
      description: editForm.description,
      version: editForm.version,
      project_id: editForm.project_id || null,
      assignee_id: editForm.assignee_id || null,
      file_urls: fileUrls,
    }).eq('id', editTarget.id);

    if (error) {
      toast({ title: '수정 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ 시안이 수정되었습니다' });
      setEditOpen(false);
      setEditTarget(null);
      if (selectedReview?.id === editTarget.id) {
        setSelectedReview((prev: any) => ({
          ...prev,
          title: editForm.title,
          description: editForm.description,
          version: editForm.version,
          project_id: editForm.project_id || null,
          assignee_id: editForm.assignee_id || null,
          file_urls: fileUrls,
        }));
      }
      fetchData();
    }
    setEditUploading(false);
  };

  // --- Drawing logic ---
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = imageContainerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw others' strokes grouped by user with distinct colors and name labels
    for (const group of othersStrokeGroups) {
      if (group.strokes.length === 0) continue;
      let firstPoint: { px: number; py: number } | null = null;
      for (const stroke of group.strokes) {
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = group.userColor;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.7;
        const startX = stroke.points[0].x / 100 * canvas.width;
        const startY = stroke.points[0].y / 100 * canvas.height;
        if (!firstPoint) firstPoint = { px: startX, py: startY };
        ctx.moveTo(startX, startY);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x / 100 * canvas.width, stroke.points[i].y / 100 * canvas.height);
        }
        ctx.stroke();
      }
      // Draw user name label near first stroke
      if (firstPoint) {
        ctx.globalAlpha = 0.9;
        const label = group.userName;
        ctx.font = 'bold 11px sans-serif';
        const textWidth = ctx.measureText(label).width;
        const labelX = Math.min(firstPoint.px, canvas.width - textWidth - 12);
        const labelY = Math.max(firstPoint.py - 8, 16);
        ctx.fillStyle = group.userColor;
        ctx.beginPath();
        ctx.roundRect(labelX - 4, labelY - 12, textWidth + 8, 16, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, labelX, labelY);
      }
    }
    ctx.globalAlpha = 1;

    // Draw my strokes + current stroke
    const allMyStrokes = currentStroke ? [...myStrokes, currentStroke] : myStrokes;
    for (const stroke of allMyStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x / 100 * canvas.width, stroke.points[0].y / 100 * canvas.height);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x / 100 * canvas.width, stroke.points[i].y / 100 * canvas.height);
      }
      ctx.stroke();
    }
  }, [myStrokes, othersStrokeGroups, currentStroke]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => redrawCanvas());
    observer.observe(container);
    return () => observer.disconnect();
  }, [redrawCanvas]);

  const getRelativePos = (e: React.MouseEvent) => {
    const container = imageContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (annotationMode === 'draw') {
      isDrawing.current = true;
      const pos = getRelativePos(e);
      setCurrentStroke({ points: [pos], color: drawColor, width: drawWidth });
    } else if (annotationMode === 'text') {
      const pos = getRelativePos(e);
      setPendingPoint({ x: pos.x, y: pos.y });
      setPendingPointText('');
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (annotationMode === 'draw' && isDrawing.current && currentStroke) {
      const pos = getRelativePos(e);
      setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pos] } : null);
    }
  };

  const handleCanvasMouseUp = () => {
    if (annotationMode === 'draw' && isDrawing.current && currentStroke) {
      isDrawing.current = false;
      if (currentStroke.points.length > 1) {
        const newStrokes = [...myStrokes, currentStroke];
        setMyStrokes(newStrokes);
        saveAnnotations(newStrokes);
      }
      setCurrentStroke(null);
    }
  };

  const handleUndoStroke = () => {
    const newStrokes = myStrokes.slice(0, -1);
    setMyStrokes(newStrokes);
    saveAnnotations(newStrokes);
  };
  const handleClearAll = () => {
    setMyStrokes([]);
    saveAnnotations([]);
    setPendingPoint(null);
  };

  const filteredReviews = filterStatus === 'all' ? reviews : reviews.filter(r => r.status === filterStatus);
  const annotationColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff'];

  // Point comments for current image
  const pointComments = comments.filter(c => c.pin_x !== null && c.pin_x !== undefined && c.pin_image_index === activeImageIdx);

  // Get reviews grouped by title for version comparison
  const getVersionGroups = () => {
    const groups: Record<string, any[]> = {};
    reviews.forEach(r => {
      const key = r.title.replace(/\s*v\d+\s*$/i, '').trim() || r.title;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  };

  // Get all reviews for same project for version compare
  const getSameProjectReviews = () => {
    if (!selectedReview) return reviews;
    if (selectedReview.project_id) {
      return reviews.filter(r => r.project_id === selectedReview.project_id);
    }
    // fallback: same title base
    const baseTitle = selectedReview.title.replace(/\s*v\d+\s*$/i, '').trim();
    return reviews.filter(r => r.title.replace(/\s*v\d+\s*$/i, '').trim() === baseTitle);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">디자인 시안</h1>
          <p className="text-sm text-muted-foreground mt-1">디자인 시안을 공유하고 피드백을 주고받으세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setCompareOpen(true); setCompareLeft(''); setCompareRight(''); }}>
            <GitCompare className="h-4 w-4 mr-1" /> 버전 비교
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> 시안 등록</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>새 디자인 시안 등록</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>제목 *</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="시안 제목" />
                </div>
                <div>
                  <Label>설명</Label>
                  <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="시안에 대한 설명" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>버전</Label>
                    <Input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} placeholder="v1" />
                  </div>
                  <div>
                    <Label>프로젝트</Label>
                    <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>담당자</Label>
                  <Select value={form.assignee_id} onValueChange={v => setForm(p => ({ ...p, assignee_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr || p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>파일 첨부</Label>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">클릭하여 파일 선택</p>
                    {formFiles.length > 0 && (
                      <p className="text-xs text-primary mt-2">{formFiles.length}개 파일 선택됨</p>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.ai,.psd,.fig"
                    className="hidden"
                    onChange={e => setFormFiles(Array.from(e.target.files || []))}
                  />
                </div>
                <Button onClick={handleCreate} disabled={!form.title || uploading} className="w-full">
                  {uploading ? '업로드 중...' : '등록'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button variant={filterStatus === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus('all')}>
          전체 ({reviews.length})
        </Button>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <Button key={key} variant={filterStatus === key ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(key)}>
            {cfg.label} ({reviews.filter(r => r.status === key).length})
          </Button>
        ))}
      </div>

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredReviews.map((review, i) => {
            const uploader = getProfile(review.uploaded_by);
            const assignee = review.assignee_id ? getProfile(review.assignee_id) : null;
            const cfg = statusConfig[review.status] || statusConfig['검토중'];
            const firstImage = (review.file_urls || []).find((url: string) =>
              /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)
            );
            const canManageCard = isAdmin || review.uploaded_by === profile?.id;

            return (
              <motion.div key={review.id} custom={i} variants={fadeIn} initial="hidden" animate="visible" exit="hidden" layout>
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => {
                    setSelectedReview(review);
                    setMyStrokes([]); setOthersStrokeGroups([]);
                    setAnnotationMode('pointer');
                    setActiveImageIdx(0);
                    setZoomLevel(1);
                  }}
                >
                  {firstImage ? (
                    <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                      <img src={firstImage} alt={review.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                      <Palette className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{review.title}</h3>
                        {review.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{review.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${cfg.color}`}>{cfg.label}</Badge>
                        {canManageCard && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => openEdit(review)}>
                                <Edit2 className="h-3.5 w-3.5 mr-2" /> 수정
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(review.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{review.version}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {uploader && <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{uploader.avatar}</AvatarFallback></Avatar>}
                        {assignee && <Avatar className="h-5 w-5 -ml-1"><AvatarFallback className="text-[8px] bg-accent text-accent-foreground">{assignee.avatar}</AvatarFallback></Avatar>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredReviews.length === 0 && (
        <div className="text-center py-16">
          <Palette className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">등록된 시안이 없습니다</p>
        </div>
      )}

      {/* ========== Detail Modal ========== */}
      <Dialog open={!!selectedReview} onOpenChange={open => {
        if (!open) {
          setSelectedReview(null);
          setActiveImageIdx(0);
          setZoomLevel(1);
          setAnnotationMode('pointer');
           setMyStrokes([]); setOthersStrokeGroups([]);
          setPendingPoint(null);
        }
      }}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          {selectedReview && (() => {
            const uploader = getProfile(selectedReview.uploaded_by);
            const assignee = selectedReview.assignee_id ? getProfile(selectedReview.assignee_id) : null;
            const cfg = statusConfig[selectedReview.status] || statusConfig['검토중'];
            const canManage = isAdmin || selectedReview.uploaded_by === profile?.id;
            const imageUrls = (selectedReview.file_urls || []).filter((url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url));
            const nonImageUrls = (selectedReview.file_urls || []).filter((url: string) => !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url));
            const currentImage = imageUrls[activeImageIdx];
            const relatedReviews = getSameProjectReviews();

            return (
              <div className="flex flex-col lg:flex-row h-[85vh]">
                {/* Left: Image Preview Area */}
                <div className="flex-1 flex flex-col bg-muted/30 min-w-0">
                  {/* Top bar */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
                    <div className="flex items-center gap-2 min-w-0">
                      <DialogTitle className="text-sm font-semibold truncate">{selectedReview.title}</DialogTitle>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${cfg.color}`}>{cfg.label}</Badge>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{selectedReview.version}</Badge>
                      {/* Presence avatars */}
                      {presentUsers.length > 0 && (
                        <div className="flex items-center gap-1 ml-2">
                          <div className="flex -space-x-1.5">
                            {presentUsers.slice(0, 5).map((u) => (
                              <div
                                key={u.id}
                                className="relative h-6 w-6 rounded-full bg-primary flex items-center justify-center ring-2 ring-background"
                                title={u.name}
                              >
                                <span className="text-[9px] font-medium text-primary-foreground">{u.avatar || u.name.slice(0, 2)}</span>
                                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-1 ring-background" />
                              </div>
                            ))}
                          </div>
                          {presentUsers.length > 5 && (
                            <span className="text-[10px] text-muted-foreground ml-1">+{presentUsers.length - 5}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-1">{presentUsers.length}명 접속 중</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {relatedReviews.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] mr-2"
                          onClick={() => {
                            setCompareOpen(true);
                            setCompareLeft(selectedReview.id);
                            setCompareRight('');
                          }}
                        >
                          <GitCompare className="h-3 w-3 mr-1" /> 버전 비교
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.max(0.25, z - 0.25))} disabled={zoomLevel <= 0.25}>
                        <ZoomOut className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-[10px] text-muted-foreground w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))} disabled={zoomLevel >= 3}>
                        <ZoomIn className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(1)}>
                        <Maximize2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Annotation Toolbar */}
                  {currentImage && (
                    <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-border bg-background/80">
                      <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                        {([
                          { mode: 'pointer' as const, icon: MousePointer, label: '선택' },
                          { mode: 'draw' as const, icon: Pencil, label: '그리기' },
                          { mode: 'text' as const, icon: MapPin, label: '포인트 코멘트' },
                        ]).map(({ mode, icon: Icon, label }) => (
                          <Button
                            key={mode}
                            variant={annotationMode === mode ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setAnnotationMode(mode)}
                            title={label}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </Button>
                        ))}
                      </div>

                      {(annotationMode === 'draw' || annotationMode === 'text') && (
                        <>
                          <div className="w-px h-5 bg-border mx-1" />
                          <div className="flex items-center gap-1">
                            {annotationColors.map(c => (
                              <button
                                key={c}
                                className={`h-5 w-5 rounded-full border-2 transition-transform ${drawColor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setDrawColor(c)}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {annotationMode === 'draw' && (
                        <>
                          <div className="w-px h-5 bg-border mx-1" />
                          <div className="flex items-center gap-1">
                            {[2, 3, 5, 8].map(w => (
                              <button
                                key={w}
                                className={`flex items-center justify-center h-6 w-6 rounded transition-colors ${drawWidth === w ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                onClick={() => setDrawWidth(w)}
                              >
                                <div className="rounded-full bg-current" style={{ width: w + 1, height: w + 1 }} />
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      <div className="w-px h-5 bg-border mx-1" />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleUndoStroke} disabled={myStrokes.length === 0} title="실행취소">
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleClearAll} disabled={myStrokes.length === 0} title="전체 지우기">
                        <Eraser className="h-3.5 w-3.5" />
                      </Button>

                      {annotationMode === 'text' && (
                        <span className="text-[10px] text-muted-foreground ml-2">이미지를 클릭하여 포인트 코멘트를 남기세요</span>
                      )}
                    </div>
                  )}

                  {/* Image viewer with annotation overlay */}
                  {currentImage ? (
                    <div className="flex-1 relative overflow-auto flex items-center justify-center">
                      <div
                        ref={imageContainerRef}
                        className="relative inline-block"
                        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                      >
                        <img
                          src={currentImage}
                          alt={selectedReview.title}
                          className="block max-w-full max-h-full select-none"
                          draggable={false}
                          style={{ maxWidth: zoomLevel <= 1 ? '100%' : 'none', maxHeight: zoomLevel <= 1 ? '100%' : 'none' }}
                        />

                        {/* Canvas overlay for drawing */}
                        <canvas
                          ref={canvasRef}
                          className="absolute inset-0 w-full h-full"
                          style={{
                            cursor: annotationMode === 'draw' ? 'crosshair' : annotationMode === 'text' ? 'crosshair' : 'default',
                            pointerEvents: annotationMode === 'pointer' ? 'none' : 'auto',
                          }}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                        />

                        {/* Persisted point comments (from DB) */}
                        {pointComments.map((c, idx) => {
                          const commenter = getProfile(c.user_id);
                          const isHovered = hoveredCommentId === c.id;
                          return (
                            <div
                              key={c.id}
                              className="absolute z-10 group/pin"
                              style={{
                                left: `${c.pin_x}%`,
                                top: `${c.pin_y}%`,
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'auto',
                              }}
                              onMouseEnter={() => setHoveredCommentId(c.id)}
                              onMouseLeave={() => setHoveredCommentId(null)}
                            >
                              <div
                                className={`w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white cursor-pointer transition-transform ${isHovered ? 'scale-125' : ''}`}
                                style={{ backgroundColor: '#3b82f6' }}
                              >
                                {idx + 1}
                              </div>
                              {/* Tooltip */}
                              {isHovered && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground text-background text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl max-w-[220px] z-30 whitespace-normal">
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <span className="font-semibold">{commenter?.name_kr || commenter?.name}</span>
                                    <span className="opacity-60 text-[8px]">{new Date(c.created_at).toLocaleString('ko-KR')}</span>
                                  </div>
                                  <p className="leading-relaxed">{c.content}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Pending point comment input */}
                        {pendingPoint && (
                          <div
                            className="absolute z-20"
                            style={{
                              left: `${pendingPoint.x}%`,
                              top: `${pendingPoint.y}%`,
                              transform: 'translate(-50%, 12px)',
                            }}
                          >
                            {/* Pin indicator */}
                            <div
                              className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                              style={{ backgroundColor: drawColor }}
                            >
                              <MapPin className="h-3 w-3 text-white" />
                            </div>
                            <div className="bg-background border border-border rounded-lg shadow-xl p-2.5 min-w-[220px] mt-1" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <MapPin className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-medium text-foreground">포인트 코멘트 추가</span>
                              </div>
                              <Textarea
                                autoFocus
                                value={pendingPointText}
                                onChange={e => setPendingPointText(e.target.value)}
                                placeholder="이 위치에 대한 코멘트를 입력하세요..."
                                className="text-xs min-h-[50px] mb-1.5"
                                rows={2}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(pendingPoint.x, pendingPoint.y, activeImageIdx);
                                  }
                                  if (e.key === 'Escape') setPendingPoint(null);
                                }}
                              />
                              <div className="flex items-center gap-1 justify-end">
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setPendingPoint(null)}>취소</Button>
                                <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => handleAddComment(pendingPoint.x, pendingPoint.y, activeImageIdx)} disabled={!pendingPointText.trim()}>
                                  <Send className="h-2.5 w-2.5 mr-1" /> 추가
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Navigation arrows */}
                      {imageUrls.length > 1 && (
                        <>
                          <Button variant="secondary" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md opacity-80 hover:opacity-100"
                            onClick={() => { setActiveImageIdx(i => (i - 1 + imageUrls.length) % imageUrls.length); setMyStrokes([]); setOthersStrokeGroups([]); }}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="secondary" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md opacity-80 hover:opacity-100"
                            onClick={() => { setActiveImageIdx(i => (i + 1) % imageUrls.length); setMyStrokes([]); setOthersStrokeGroups([]); }}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <Palette className="h-16 w-16 mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-sm text-muted-foreground">이미지가 없습니다</p>
                      </div>
                    </div>
                  )}

                  {/* Thumbnail strip */}
                  {imageUrls.length > 1 && (
                    <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-background overflow-x-auto">
                      {imageUrls.map((url: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => { setActiveImageIdx(idx); setZoomLevel(1); setMyStrokes([]); setOthersStrokeGroups([]); }}
                          className={`shrink-0 h-12 w-12 rounded-md overflow-hidden border-2 transition-colors ${idx === activeImageIdx ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'}`}
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {nonImageUrls.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-background">
                      {nonImageUrls.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">📎 파일 {idx + 1}</a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Info + Comments Panel */}
                <div className="w-full lg:w-[360px] shrink-0 flex flex-col border-l border-border bg-background">
                  <div className="p-4 space-y-3 border-b border-border">
                    {selectedReview.description && <p className="text-xs text-muted-foreground">{selectedReview.description}</p>}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>등록: {uploader?.name_kr || uploader?.name}</span>
                      {assignee && <span>담당: {assignee.name_kr || assignee.name}</span>}
                      <span>{new Date(selectedReview.created_at).toLocaleDateString('ko-KR')}</span>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.keys(statusConfig).map(s => (
                          <Button key={s} variant={selectedReview.status === s ? 'default' : 'outline'} size="sm" className="text-[10px] h-7 px-2" onClick={() => handleStatusChange(selectedReview.id, s)}>
                            {s}
                          </Button>
                        ))}
                        <Button variant="ghost" size="sm" className="h-7 ml-auto" onClick={() => openEdit(selectedReview)}>
                          <Edit2 className="h-3 w-3 mr-1" /> 수정
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => handleDelete(selectedReview.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-4 py-2.5 border-b border-border">
                      <h4 className="text-xs font-semibold flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" /> 피드백 ({comments.length})
                      </h4>
                    </div>

                    <ScrollArea className="flex-1 px-4 py-2">
                      <div className="space-y-2">
                        {comments.map((c, idx) => {
                          const commenter = getProfile(c.user_id);
                          const isPointComment = c.pin_x !== null && c.pin_x !== undefined;
                          const pointIdx = isPointComment ? pointComments.indexOf(c) + 1 : null;
                          return (
                            <div
                              key={c.id}
                              className={`p-2.5 rounded-lg text-sm transition-colors ${c.is_revision_request ? 'bg-destructive/5 border border-destructive/20' : isPointComment ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30' : 'bg-muted'} ${hoveredCommentId === c.id ? 'ring-2 ring-primary' : ''}`}
                              onMouseEnter={() => isPointComment && setHoveredCommentId(c.id)}
                              onMouseLeave={() => setHoveredCommentId(null)}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                {isPointComment && (
                                  <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                                    {pointIdx}
                                  </div>
                                )}
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{commenter?.avatar || '??'}</AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] font-medium">{commenter?.name_kr || commenter?.name}</span>
                                {c.is_revision_request && (
                                  <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30 px-1 py-0">수정요청</Badge>
                                )}
                                {isPointComment && (
                                  <Badge variant="outline" className="text-[9px] text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 px-1 py-0">
                                    <MapPin className="h-2 w-2 mr-0.5" />포인트
                                  </Badge>
                                )}
                                <span className="text-[10px] text-muted-foreground ml-auto">
                                  {new Date(c.created_at).toLocaleString('ko-KR')}
                                </span>
                              </div>
                              <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{c.content}</p>
                            </div>
                          );
                        })}
                        {comments.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-8">아직 피드백이 없습니다</p>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Comment input */}
                    <div className="p-3 border-t border-border space-y-2">
                      <Textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="이미지에 대한 피드백을 입력하세요..."
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input type="checkbox" checked={isRevisionRequest} onChange={e => setIsRevisionRequest(e.target.checked)} className="rounded h-3 w-3" />
                          <span className="text-destructive font-medium">수정 요청</span>
                        </label>
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleAddComment()} disabled={!newComment.trim()}>
                          <Send className="h-3 w-3 mr-1" /> 전송
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ========== Edit Modal ========== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>디자인 시안 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>제목 *</Label>
              <Input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} placeholder="시안 제목" />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="시안에 대한 설명" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>버전</Label>
                <Input value={editForm.version} onChange={e => setEditForm(p => ({ ...p, version: e.target.value }))} placeholder="v1" />
              </div>
              <div>
                <Label>프로젝트</Label>
                <Select value={editForm.project_id} onValueChange={v => setEditForm(p => ({ ...p, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>담당자</Label>
              <Select value={editForm.assignee_id} onValueChange={v => setEditForm(p => ({ ...p, assignee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr || p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>파일 추가</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => editFileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">클릭하여 추가 파일 선택</p>
                {editFiles.length > 0 && (
                  <p className="text-xs text-primary mt-1">{editFiles.length}개 파일 추가</p>
                )}
              </div>
              <input
                ref={editFileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.ai,.psd,.fig"
                className="hidden"
                onChange={e => setEditFiles(Array.from(e.target.files || []))}
              />
              {editTarget?.file_urls?.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">기존 파일 {editTarget.file_urls.length}개 유지됨</p>
              )}
            </div>
            <Button onClick={handleEdit} disabled={!editForm.title || editUploading} className="w-full">
              {editUploading ? '저장 중...' : '수정 완료'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== Version Compare Modal ========== */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background">
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                <GitCompare className="h-4 w-4" /> 버전 비교
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={compareMode === 'side' ? 'default' : 'outline'}
                  size="sm"
                  className="text-[10px] h-7"
                  onClick={() => setCompareMode('side')}
                >
                  나란히 보기
                </Button>
                <Button
                  variant={compareMode === 'slider' ? 'default' : 'outline'}
                  size="sm"
                  className="text-[10px] h-7"
                  onClick={() => setCompareMode('slider')}
                >
                  슬라이더 비교
                </Button>
              </div>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-2 gap-4 px-6 py-3 border-b border-border bg-muted/30">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">왼쪽 (이전 버전)</Label>
                <Select value={compareLeft} onValueChange={setCompareLeft}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="시안 선택" /></SelectTrigger>
                  <SelectContent>
                    {reviews.map(r => (
                      <SelectItem key={r.id} value={r.id} disabled={r.id === compareRight}>
                        <span className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[9px] px-1">{r.version}</Badge>
                          {r.title}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">오른쪽 (최신 버전)</Label>
                <Select value={compareRight} onValueChange={setCompareRight}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="시안 선택" /></SelectTrigger>
                  <SelectContent>
                    {reviews.map(r => (
                      <SelectItem key={r.id} value={r.id} disabled={r.id === compareLeft}>
                        <span className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[9px] px-1">{r.version}</Badge>
                          {r.title}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Compare content */}
            <div className="flex-1 overflow-hidden">
              {compareLeft && compareRight ? (() => {
                const leftReview = reviews.find(r => r.id === compareLeft);
                const rightReview = reviews.find(r => r.id === compareRight);
                if (!leftReview || !rightReview) return null;
                const leftImage = (leftReview.file_urls || []).find((u: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u));
                const rightImage = (rightReview.file_urls || []).find((u: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u));
                const leftCfg = statusConfig[leftReview.status] || statusConfig['검토중'];
                const rightCfg = statusConfig[rightReview.status] || statusConfig['검토중'];

                if (compareMode === 'side') {
                  return (
                    <div className="grid grid-cols-2 h-full">
                      {/* Left side */}
                      <div className="flex flex-col border-r border-border">
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
                          <Badge variant="secondary" className="text-[9px]">{leftReview.version}</Badge>
                          <span className="text-xs font-medium truncate">{leftReview.title}</span>
                          <Badge variant="outline" className={`text-[9px] ml-auto ${leftCfg.color}`}>{leftCfg.label}</Badge>
                        </div>
                        <div className="flex-1 flex items-center justify-center p-4 bg-muted/20 overflow-auto">
                          {leftImage ? (
                            <img src={leftImage} alt={leftReview.title} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <Palette className="h-12 w-12 mx-auto opacity-30 mb-2" />
                              <p className="text-xs">이미지 없음</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Right side */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background">
                          <Badge variant="secondary" className="text-[9px]">{rightReview.version}</Badge>
                          <span className="text-xs font-medium truncate">{rightReview.title}</span>
                          <Badge variant="outline" className={`text-[9px] ml-auto ${rightCfg.color}`}>{rightCfg.label}</Badge>
                        </div>
                        <div className="flex-1 flex items-center justify-center p-4 bg-muted/20 overflow-auto">
                          {rightImage ? (
                            <img src={rightImage} alt={rightReview.title} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <Palette className="h-12 w-12 mx-auto opacity-30 mb-2" />
                              <p className="text-xs">이미지 없음</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Slider mode
                return (
                  <div className="relative h-full flex items-center justify-center bg-muted/20 overflow-hidden">
                    {/* Right image (full) */}
                    {rightImage && (
                      <img src={rightImage} alt={rightReview.title} className="max-w-full max-h-full object-contain" />
                    )}
                    {/* Left image (clipped) */}
                    {leftImage && (
                      <div
                        className="absolute inset-0 flex items-center justify-center overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - compareSlider}% 0 0)` }}
                      >
                        <img src={leftImage} alt={leftReview.title} className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                    {/* Slider line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                      style={{ left: `${compareSlider}%` }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                        <ChevronLeft className="h-3 w-3" />
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                    {/* Slider control */}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={compareSlider}
                      onChange={e => setCompareSlider(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize z-20"
                    />
                    {/* Version labels */}
                    <div className="absolute bottom-4 left-4 z-10">
                      <Badge variant="secondary" className="text-[9px] bg-background/80 backdrop-blur">{leftReview.version} (이전)</Badge>
                    </div>
                    <div className="absolute bottom-4 right-4 z-10">
                      <Badge variant="secondary" className="text-[9px] bg-background/80 backdrop-blur">{rightReview.version} (최신)</Badge>
                    </div>
                  </div>
                );
              })() : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <GitCompare className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">비교할 두 버전을 선택하세요</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
