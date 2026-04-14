import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Copy, BarChart3, Trash2, ImagePlus, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { SurveyResults } from '@/components/surveys/SurveyResults';

interface Survey {
  id: string;
  title: string;
  description: string;
  description_image_urls: string[] | null;
  share_token: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string;
}

interface OptionInput {
  text: string;
  imageFile: File | null;
  imagePreview: string | null;
}

export default function Surveys() {
  const { profile } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [resultsSurveyId, setResultsSurveyId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionImages, setDescriptionImages] = useState<{ file: File; preview: string }[]>([]);
  const [options, setOptions] = useState<OptionInput[]>([
    { text: '', imageFile: null, imagePreview: null },
    { text: '', imageFile: null, imagePreview: null },
  ]);
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL?.trim() || 'https://hub.recoverylabkorea.com').replace(/\/$/, '');

  const getVoteUrl = (token: string) => `${PUBLIC_SITE_URL}/vote/${token}`;

  const fetchSurveys = async () => {
    const { data } = await supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false });
    setSurveys((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSurveys(); }, []);

  const addOption = () => setOptions([...options, { text: '', imageFile: null, imagePreview: null }]);
  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };
  const updateOptionText = (idx: number, val: string) => {
    const newOpts = [...options];
    newOpts[idx] = { ...newOpts[idx], text: val };
    setOptions(newOpts);
  };
  const updateOptionImage = (idx: number, file: File | null) => {
    const newOpts = [...options];
    if (file) {
      newOpts[idx] = { ...newOpts[idx], imageFile: file, imagePreview: URL.createObjectURL(file) };
    } else {
      newOpts[idx] = { ...newOpts[idx], imageFile: null, imagePreview: null };
    }
    setOptions(newOpts);
  };

  const handleCreate = async () => {
    const validOptions = options.filter(o => o.text.trim() || o.imageFile);
    if (!title.trim() || validOptions.length < 2) {
      toast.error('제목과 최소 2개 선택지를 입력하세요 (텍스트 또는 이미지)');
      return;
    }
    if (!profile) return;
    setSubmitting(true);

    // Upload description images first
    const descImageUrls: string[] = [];
    for (const img of descriptionImages) {
      const ext = img.file.name.split('.').pop();
      const filePath = `desc/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('survey-images').upload(filePath, img.file);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('survey-images').getPublicUrl(filePath);
        descImageUrls.push(urlData.publicUrl);
      }
    }

    const { data: survey, error } = await supabase
      .from('surveys')
      .insert({
        title: title.trim(),
        description: description.trim(),
        description_image_urls: descImageUrls.length > 0 ? descImageUrls : [],
        created_by: profile.id,
        expires_at: expiresAt || null,
      } as any)
      .select()
      .single();

    if (error || !survey) {
      toast.error('설문 생성 실패');
      setSubmitting(false);
      return;
    }

    // Upload images and create options
    const optionInserts = [];
    for (let i = 0; i < validOptions.length; i++) {
      const opt = validOptions[i];
      let imageUrl: string | null = null;

      if (opt.imageFile) {
        const ext = opt.imageFile.name.split('.').pop();
        const filePath = `${survey.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('survey-images')
          .upload(filePath, opt.imageFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('survey-images').getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      }

      optionInserts.push({
        survey_id: survey.id,
        option_text: opt.text.trim() || '(이미지)',
        sort_order: i,
        image_url: imageUrl,
      });
    }

    await supabase.from('survey_options').insert(optionInserts);

    toast.success('설문이 생성되었습니다');
    setCreateOpen(false);
    setTitle('');
    setDescription('');
    setDescriptionImages([]);
    setOptions([
      { text: '', imageFile: null, imagePreview: null },
      { text: '', imageFile: null, imagePreview: null },
    ]);
    setExpiresAt('');
    setSubmitting(false);
    fetchSurveys();
  };

  const copyLink = async (token: string) => {
    const url = getVoteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('투표 링크가 복사되었습니다');
    } catch {
      toast.error('링크 복사에 실패했습니다');
    }
  };

  const openVotePage = (token: string) => {
    window.open(getVoteUrl(token), '_blank', 'noopener,noreferrer');
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('surveys').update({ is_active: !current }).eq('id', id);
    fetchSurveys();
    toast.success(current ? '설문이 마감되었습니다' : '설문이 재개되었습니다');
  };

  const deleteSurvey = async (id: string) => {
    await supabase.from('surveys').delete().eq('id', id);
    fetchSurveys();
    toast.success('설문이 삭제되었습니다');
  };

  if (resultsSurveyId) {
    return (
      <SurveyResults
        surveyId={resultsSurveyId}
        onBack={() => setResultsSurveyId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">설문 / 투표</h1>
          <p className="text-sm text-muted-foreground">무기명 설문을 만들고 링크를 공유하세요</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />새 설문 만들기</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 설문 / 투표 만들기</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">제목 *</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="설문 제목" />
              </div>
              <div>
                <label className="text-sm font-medium">설명</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="설문 설명 (선택)" rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium">설명 이미지</label>
                <p className="text-xs text-muted-foreground mb-2">설문 내용에 포함할 이미지를 첨부하세요 (여러 장 가능)</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {descriptionImages.map((img, i) => (
                    <div key={i} className="relative inline-block">
                      <img src={img.preview} alt="" className="h-24 rounded-md object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => setDescriptionImages(prev => prev.filter((_, j) => j !== i))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <label className="flex items-center justify-center h-24 w-24 rounded-md border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary transition-colors">
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        const newImages = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
                        setDescriptionImages(prev => [...prev, ...newImages]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">선택지 (최소 2개) *</label>
                <p className="text-xs text-muted-foreground mb-2">텍스트만, 이미지만, 또는 둘 다 가능합니다</p>
                <div className="space-y-3 mt-1">
                  {options.map((opt, i) => (
                    <div key={i} className="rounded-lg border p-3 space-y-2">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-medium text-muted-foreground w-6">{i + 1}.</span>
                        <Input
                          value={opt.text}
                          onChange={e => updateOptionText(i, e.target.value)}
                          placeholder={`선택지 ${i + 1} 텍스트`}
                          className="flex-1"
                        />
                        {options.length > 2 && (
                          <Button variant="ghost" size="icon" onClick={() => removeOption(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {opt.imagePreview ? (
                        <div className="relative inline-block">
                          <img src={opt.imagePreview} alt="" className="max-h-[48rem] rounded-md object-contain" />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-5 w-5"
                            onClick={() => updateOptionImage(i, null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                          <ImagePlus className="h-4 w-4" />
                          이미지 추가
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) updateOptionImage(i, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addOption}>+ 선택지 추가</Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">마감일 (선택)</label>
                <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
              <Button onClick={handleCreate} disabled={submitting} className="w-full">
                {submitting ? '생성 중...' : '생성하기'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : surveys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            아직 생성된 설문이 없습니다. 새 설문을 만들어보세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {surveys.map(survey => (
            <Card key={survey.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{survey.title}</CardTitle>
                    {survey.description && (
                      <CardDescription className="mt-1">{survey.description}</CardDescription>
                    )}
                    {survey.description_image_urls && survey.description_image_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {survey.description_image_urls.map((url, i) => (
                          <img key={i} src={url} alt="" className="max-h-32 rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(url, '_blank')} />
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant={survey.is_active ? 'default' : 'secondary'}>
                    {survey.is_active ? '진행중' : '마감'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => copyLink(survey.share_token)}>
                    <Copy className="h-3 w-3 mr-1" />링크 복사
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openVotePage(survey.share_token)}>
                    <ExternalLink className="h-3 w-3 mr-1" />투표 페이지
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setResultsSurveyId(survey.id)}>
                    <BarChart3 className="h-3 w-3 mr-1" />결과 보기
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(survey.id, survey.is_active)}>
                    {survey.is_active ? '마감하기' : '재개하기'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteSurvey(survey.id)}>
                    <Trash2 className="h-3 w-3 mr-1" />삭제
                  </Button>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(survey.created_at).toLocaleDateString('ko-KR')}
                    {survey.expires_at && ` · 마감: ${new Date(survey.expires_at).toLocaleDateString('ko-KR')}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
