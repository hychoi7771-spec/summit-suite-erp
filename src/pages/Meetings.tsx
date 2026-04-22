import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, Users, FileText, ChevronDown, ChevronUp, ArrowRight, Target, CheckCircle2, AlertCircle, Clock, BarChart3, Video, ExternalLink, Send, Mic, MicOff, Brain, Loader2, ClipboardPaste, Pencil, Trash2, Upload } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notifyUsers } from '@/lib/notifications';

// Web Speech API type declarations
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  completed: { label: '✅ 완료', icon: CheckCircle2, color: 'text-green-600' },
  in_progress: { label: '⚠️ 진행 중', icon: Clock, color: 'text-yellow-600' },
  delayed: { label: '❌ 지연', icon: AlertCircle, color: 'text-red-600' },
};

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.webm', '.ogg', '.mp4', '.aac'];
const isAudioFile = (file: File) => file.type.startsWith('audio/') || AUDIO_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
const getPreferredAudioMimeType = () => {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';
};

export default function Meetings() {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetingUpdates, setMeetingUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState({ title: '', assignee_id: '', priority: 'medium' });
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '', date: '', category: '', notes: '', attendee_ids: [] as string[],
    goal: '', achievement_status: 'in_progress', achievement_comment: '',
    kpi_notes: '', roadmap_aligned: false, schedule_adjustment_needed: false,
    meeting_link: '',
  });
  const [editingUpdates, setEditingUpdates] = useState<Record<string, { done: string; todo: string; blockers: string }>>({});

  // Recording & transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMeetingId, setRecordingMeetingId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogFileInputRef = useRef<HTMLInputElement>(null);
  const [dialogFileName, setDialogFileName] = useState('');
  const [dialogFileContent, setDialogFileContent] = useState('');
  const [isReadingDialogFile, setIsReadingDialogFile] = useState(false);
  const [dialogAudioFile, setDialogAudioFile] = useState<File | null>(null);

  const analyzeMeetingText = useCallback(async (meetingId: string, text: string) => {
    const members = profiles.map(p => ({ name: p.name, name_kr: p.name_kr, id: p.id }));
    const { data, error } = await supabase.functions.invoke('analyze-meeting', {
      body: { transcript: text.trim(), members },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    await supabase.from('meetings').update({
      notes: data.notes,
      goal: data.goal,
      kpi_notes: data.kpi_notes || null,
      achievement_comment: data.achievement_comment || null,
    }).eq('id', meetingId);

    if (data.action_items && data.action_items.length > 0) {
      const taskInserts = data.action_items.map((item: any) => {
        let assigneeId: string | null = null;
        if (item.assignee_name) {
          const matched = profiles.find(p =>
            p.name_kr === item.assignee_name ||
            p.name.toLowerCase() === item.assignee_name.toLowerCase()
          );
          if (matched) assigneeId = matched.id;
        }
        return {
          title: item.title,
          priority: item.priority || 'medium',
          status: 'todo' as const,
          meeting_id: meetingId,
          assignee_id: assigneeId,
          description: `AI 회의록 분석에서 도출된 액션 아이템${item.assignee_name ? ` (담당: ${item.assignee_name})` : ''}`,
        };
      });
      await supabase.from('tasks').insert(taskInserts);
    }

    return data;
  }, [profiles]);

  const transcribeAudioFile = useCallback(async (meetingId: string, file: File) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('로그인이 필요합니다.');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${userId}/${meetingId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('meeting-audio').upload(filePath, file, { upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabase.storage.from('meeting-audio').getPublicUrl(filePath);
    const { data, error } = await supabase.functions.invoke('genspark-transcribe-meeting', {
      body: { audioUrl: publicUrlData.publicUrl, fileName: file.name },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.transcript || '';
  }, []);

  const handleFileUpload = useCallback(async (meetingId: string, file: File) => {
    setIsReadingFile(true);
    setUploadedFileName(file.name);
    try {
      let text = '';
      if (isAudioFile(file)) {
        text = await transcribeAudioFile(meetingId, file);
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        text = await file.text();
      } else if (file.name.endsWith('.docx')) {
        // Extract text from docx (ZIP containing XML)
        const arrayBuffer = await file.arrayBuffer();
        const JSZip = (await import('jszip')).default;
        const zipData = await JSZip.loadAsync(arrayBuffer);
        const docXml = await zipData.file('word/document.xml')?.async('string');
        if (docXml) {
          // Strip XML tags to get plain text
          text = docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      } else {
        // Try reading as text for any other extension
        text = await file.text();
      }

      if (!text || text.trim().length < 10) {
        toast({ title: '파일 내용이 너무 짧습니다', description: '최소 10자 이상의 내용이 필요합니다.', variant: 'destructive' });
        setIsReadingFile(false);
        return;
      }

      setManualTranscript(text.trim());
      toast({ title: `📄 "${file.name}" 파일 로드 완료`, description: `${text.trim().length}자 추출됨. AI 분석을 자동 실행합니다.` });
      setIsReadingFile(false);

      setIsAnalyzing(true);
      try {
        const data = await analyzeMeetingText(meetingId, text.trim());

        const assignedCount = data.action_items?.filter((i: any) => i.assignee_name).length || 0;
        toast({
          title: '✅ AI 분석 완료',
          description: `회의록이 자동 생성되었습니다. 액션 아이템 ${data.action_items?.length || 0}건 추가 (${assignedCount}건 자동 배정)`,
        });

        setManualTranscript('');
        setUploadedFileName('');
        fetchData();
      } catch (err: any) {
        toast({ title: 'AI 분석 실패', description: err.message, variant: 'destructive' });
      } finally {
        setIsAnalyzing(false);
      }
    } catch (err: any) {
      toast({ title: '파일 읽기 실패', description: err.message, variant: 'destructive' });
      setIsReadingFile(false);
    }
  }, [toast, analyzeMeetingText, transcribeAudioFile]);

  const startRecording = useCallback((meetingId: string) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: '지원되지 않는 브라우저', description: 'Chrome 브라우저를 사용해주세요.', variant: 'destructive' });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = transcriptRef.current;
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
          transcriptRef.current = finalTranscript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      // Ignore transient errors that occur during normal operation
      const ignoredErrors = ['no-speech', 'aborted'];
      const fatalErrors = ['audio-capture', 'not-allowed'];
      
      if (fatalErrors.includes(event.error)) {
        // Stop recording on fatal errors (mic blocked/unavailable)
        recognitionRef.current = null;
        setIsRecording(false);
        setRecordingMeetingId(null);
        toast({ 
          title: '🎤 마이크 접근 불가', 
          description: '브라우저에서 마이크 권한을 허용해주세요. 또는 텍스트 붙여넣기 탭을 이용하세요.', 
          variant: 'destructive' 
        });
        return;
      }
      
      if (!ignoredErrors.includes(event.error)) {
        console.warn('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    transcriptRef.current = '';
    setTranscript('');
    setRecordingMeetingId(meetingId);
    setIsRecording(true);
    recognition.start();
    toast({ title: '🎙️ 녹음 시작', description: '회의 내용을 말씀해주세요.' });
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition.stop();
    }
    setIsRecording(false);
    toast({ title: '녹음 중지', description: '녹취록을 확인하고 AI 분석을 실행하세요.' });
  }, [toast]);

  const analyzeTranscript = useCallback(async (meetingId: string, source: 'recording' | 'manual' = 'recording') => {
    const text = source === 'manual'
      ? manualTranscript.trim()
      : (transcriptRef.current.trim() || transcript.trim());
    if (!text || text.length < 10) {
      toast({ title: '녹취록이 너무 짧습니다', description: '최소 10자 이상의 내용을 입력해주세요.', variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = await analyzeMeetingText(meetingId, text);

      const assignedCount = data.action_items?.filter((i: any) => i.assignee_name).length || 0;
      toast({
        title: '✅ AI 분석 완료',
        description: `회의록이 자동 생성되었습니다. 액션 아이템 ${data.action_items?.length || 0}건 추가 (${assignedCount}건 자동 배정)`,
      });

      setTranscript('');
      transcriptRef.current = '';
      setManualTranscript('');
      setRecordingMeetingId(null);
      fetchData();
    } catch (err: any) {
      toast({ title: 'AI 분석 실패', description: err.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  }, [transcript, manualTranscript, toast, analyzeMeetingText]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [meetRes, profRes, taskRes, updRes] = await Promise.all([
      supabase.from('meetings').select('*').order('date', { ascending: false }),
      supabase.from('profiles').select('id, name, name_kr, avatar, user_id'),
      supabase.from('tasks').select('*').not('meeting_id', 'is', null),
      supabase.from('meeting_updates').select('*'),
    ]);
    setMeetings(meetRes.data || []);
    setProfiles(profRes.data || []);
    setTasks(taskRes.data || []);
    setMeetingUpdates(updRes.data || []);
    setLoading(false);
  };

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  const handleDialogFileRead = async (file: File) => {
    setIsReadingDialogFile(true);
    setDialogFileName(file.name);
    try {
      let text = '';
      if (isAudioFile(file)) {
        setDialogAudioFile(file);
        setDialogFileContent('');
        toast({ title: `🎧 "${file.name}" 녹음 파일 선택 완료`, description: '등록 시 Genspark가 자동으로 녹취 후 AI 분석합니다.' });
        return;
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
        text = await file.text();
      } else if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const JSZip = (await import('jszip')).default;
        const zipData = await JSZip.loadAsync(arrayBuffer);
        const docXml = await zipData.file('word/document.xml')?.async('string');
        if (docXml) {
          text = docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      } else {
        text = await file.text();
      }
      setDialogAudioFile(null);
      setDialogFileContent(text);
      toast({ title: `📄 "${file.name}" 파일 로드 완료`, description: `${text.length}자 추출됨` });
    } catch (err: any) {
      toast({ title: '파일 읽기 실패', description: err.message, variant: 'destructive' });
      setDialogFileName('');
    } finally {
      setIsReadingDialogFile(false);
    }
  };

  const handleAddMeeting = async () => {
    if (!meetingForm.title) return;
    const { data: inserted, error } = await supabase.from('meetings').insert({
      title: meetingForm.title,
      date: meetingForm.date || new Date().toISOString().split('T')[0],
      category: meetingForm.category || null,
      notes: meetingForm.notes || null,
      attendee_ids: meetingForm.attendee_ids,
      goal: meetingForm.goal || null,
      achievement_status: meetingForm.achievement_status,
      achievement_comment: meetingForm.achievement_comment || null,
      kpi_notes: meetingForm.kpi_notes || null,
      roadmap_aligned: meetingForm.roadmap_aligned,
      schedule_adjustment_needed: meetingForm.schedule_adjustment_needed,
      meeting_link: meetingForm.meeting_link || null,
    }).select().single();
    if (error) {
      toast({ title: '회의 등록 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '회의 등록 완료' });
      setMeetingDialogOpen(false);
      setMeetingForm({ title: '', date: '', category: '', notes: '', attendee_ids: [], goal: '', achievement_status: 'in_progress', achievement_comment: '', kpi_notes: '', roadmap_aligned: false, schedule_adjustment_needed: false, meeting_link: '' });

      // If a file was attached, auto-trigger AI analysis
      if ((dialogFileContent || dialogAudioFile) && inserted) {
        const meetingId = inserted.id;
        setExpandedId(meetingId);
        setIsAnalyzing(true);
        try {
          const sourceText = dialogAudioFile
            ? await transcribeAudioFile(meetingId, dialogAudioFile)
            : dialogFileContent;
          const data = await analyzeMeetingText(meetingId, sourceText);

          toast({
            title: '✅ AI 분석 완료',
            description: `회의록 자동 생성 완료. 액션 아이템 ${data.action_items?.length || 0}건`,
          });
        } catch (err: any) {
          toast({ title: 'AI 분석 실패', description: err.message, variant: 'destructive' });
        } finally {
          setIsAnalyzing(false);
        }
      }

      setDialogFileName('');
      setDialogFileContent('');
      setDialogAudioFile(null);
      fetchData();
    }
  };

  const handleAddActionItem = async (meetingId: string) => {
    if (!actionForm.title) return;
    const { error } = await supabase.from('tasks').insert({
      title: actionForm.title,
      assignee_id: actionForm.assignee_id || null,
      priority: actionForm.priority as any,
      status: 'todo',
      meeting_id: meetingId,
      description: '회의록에서 생성된 실행 항목',
    });
    if (error) {
      toast({ title: '실행 항목 추가 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '실행 항목이 칸반 보드에 추가되었습니다' });
      setActionDialog(null);
      setActionForm({ title: '', assignee_id: '', priority: 'medium' });
      fetchData();
    }
  };

  const handleSaveUpdate = async (meetingId: string, profileId: string) => {
    const key = `${meetingId}-${profileId}`;
    const data = editingUpdates[key];
    if (!data) return;
    const { error } = await supabase.from('meeting_updates').upsert({
      meeting_id: meetingId,
      profile_id: profileId,
      done: data.done,
      todo: data.todo,
      blockers: data.blockers,
    }, { onConflict: 'meeting_id,profile_id' });
    if (error) {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '업데이트 저장됨' });
      setEditingUpdates(prev => { const n = { ...prev }; delete n[key]; return n; });
      fetchData();
    }
  };

  const handleUpdateMeetingField = async (meetingId: string, field: string, value: any) => {
    const { error } = await supabase.from('meetings').update({ [field]: value }).eq('id', meetingId);
    if (error) {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ 자동 저장 완료' });
    }
    fetchData();
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    await supabase.from('meeting_updates').delete().eq('meeting_id', meetingId);
    await supabase.from('tasks').update({ meeting_id: null }).eq('meeting_id', meetingId);
    const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '🗑️ 회의록이 삭제되었습니다' });
      setExpandedId(null);
    }
    fetchData();
  };

  const getMeetingTasks = (meetingId: string) => tasks.filter(t => t.meeting_id === meetingId);
  const getMeetingUpdates = (meetingId: string) => meetingUpdates.filter(u => u.meeting_id === meetingId);

  const toggleAttendee = (id: string) => {
    setMeetingForm(f => ({
      ...f,
      attendee_ids: f.attendee_ids.includes(id) ? f.attendee_ids.filter(a => a !== id) : [...f.attendee_ids, id],
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">📋 회의록</h1>
          <p className="text-sm text-muted-foreground mt-1">실행 중심 회의 기록 · 주간 스탠드업</p>
        </div>
        <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0"><Plus className="h-4 w-4" />새 회의 등록</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>새 회의 등록</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2"><Label>회의 제목</Label><Input placeholder="주간 제품 스탠드업" value={meetingForm.title} onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>날짜</Label><Input type="date" value={meetingForm.date} onChange={e => setMeetingForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>카테고리</Label><Input placeholder="제품, 영업 등" value={meetingForm.category} onChange={e => setMeetingForm(f => ({ ...f, category: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>🎯 목표</Label><Input placeholder="지난주 성과 복기, 이번 주 목표 동기화" value={meetingForm.goal} onChange={e => setMeetingForm(f => ({ ...f, goal: e.target.value }))} /></div>
              <div className="space-y-2"><Label>🎥 화상회의 링크</Label><Input placeholder="Google Meet / Zoom 링크 붙여넣기" value={meetingForm.meeting_link} onChange={e => setMeetingForm(f => ({ ...f, meeting_link: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>달성 여부</Label>
                <Select value={meetingForm.achievement_status} onValueChange={v => setMeetingForm(f => ({ ...f, achievement_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">✅ 완료</SelectItem>
                    <SelectItem value="in_progress">⚠️ 진행 중</SelectItem>
                    <SelectItem value="delayed">❌ 지연</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>간단 코멘트</Label><Input placeholder="성과 또는 이슈 요약" value={meetingForm.achievement_comment} onChange={e => setMeetingForm(f => ({ ...f, achievement_comment: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>참석자</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                  {profiles.map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer py-1">
                      <Checkbox checked={meetingForm.attendee_ids.includes(p.id)} onCheckedChange={() => toggleAttendee(p.id)} />
                      <span className="text-sm">{p.name_kr} ({p.name})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2"><Label>회의 내용</Label><Textarea placeholder="회의 내용을 입력하세요" value={meetingForm.notes} onChange={e => setMeetingForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>📎 회의록 파일 첨부 (선택)</Label>
                <input
                  type="file"
                  ref={dialogFileInputRef}
                  className="hidden"
                  accept=".txt,.md,.csv,.docx,audio/*,.mp3,.m4a,.wav,.webm,.ogg,.mp4,.aac"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDialogFileRead(file);
                    e.target.value = '';
                  }}
                />
                <div
                  className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => dialogFileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleDialogFileRead(file);
                  }}
                >
                  {isReadingDialogFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      <p className="text-sm">파일 읽는 중...</p>
                    </div>
                  ) : dialogFileName ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <p className="text-sm font-medium">{dialogFileName}</p>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); setDialogFileName(''); setDialogFileContent(''); setDialogAudioFile(null); }}>제거</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">파일을 드래그하거나 클릭 (.txt, .md, .csv, .docx, 오디오)</p>
                    </div>
                  )}
                </div>
                {(dialogFileContent || dialogAudioFile) && (
                  <p className="text-[10px] text-muted-foreground">💡 등록 시 Genspark 녹취와 AI 회의록 분석을 자동 실행합니다.</p>
                )}
              </div>
              <div className="space-y-2"><Label>📊 핵심 지표 (KPI)</Label><Input placeholder="DAU 5% 상승, 이탈률 2% 감소 등" value={meetingForm.kpi_notes} onChange={e => setMeetingForm(f => ({ ...f, kpi_notes: e.target.value }))} /></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={meetingForm.roadmap_aligned} onCheckedChange={v => setMeetingForm(f => ({ ...f, roadmap_aligned: !!v }))} />
                  <span className="text-sm">로드맵 방향 일치</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={meetingForm.schedule_adjustment_needed} onCheckedChange={v => setMeetingForm(f => ({ ...f, schedule_adjustment_needed: !!v }))} />
                  <span className="text-sm">일정 조정 필요</span>
                </label>
              </div>
              <Button onClick={handleAddMeeting} disabled={!meetingForm.title} className="w-full">등록</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {meetings.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">등록된 회의가 없습니다</p>}
        {meetings.map(meeting => {
          const isExpanded = expandedId === meeting.id;
          const attendees = (meeting.attendee_ids || []).map((id: string) => getProfile(id)).filter(Boolean);
          const meetingTasks = getMeetingTasks(meeting.id);
          const updates = getMeetingUpdates(meeting.id);
          const status = statusConfig[meeting.achievement_status] || statusConfig.in_progress;

          return (
            <Card key={meeting.id} className="overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedId(isExpanded ? null : meeting.id)}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{meeting.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{meeting.date}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{attendees.length}명</span>
                      {meeting.category && <Badge variant="outline" className="text-[10px]">{meeting.category}</Badge>}
                      <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
                      {meetingTasks.length > 0 && <Badge variant="secondary" className="text-[10px]">액션 {meetingTasks.length}건</Badge>}
                      {meeting.meeting_link && (
                        <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                          <Badge variant="default" className="text-[10px] gap-1 cursor-pointer hover:opacity-80">
                            <Video className="h-3 w-3" />참여
                          </Badge>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={e => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>회의록 삭제</AlertDialogTitle>
                        <AlertDialogDescription>"{meeting.title}" 회의록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteMeeting(meeting.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">삭제</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <CardContent className="pt-0 pb-5 space-y-5 border-t">
                  {/* Section 1: 개요 및 회고 */}
                  <div className="pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />1. 개요 및 회고
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="bg-muted/40 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">목표</p>
                        <Textarea
                          className="text-sm min-h-[60px] resize-none"
                          placeholder="회의 목표를 입력하세요..."
                          defaultValue={meeting.goal || ''}
                          onBlur={e => {
                            if (e.target.value !== (meeting.goal || '')) {
                              handleUpdateMeetingField(meeting.id, 'goal', e.target.value || null);
                            }
                          }}
                        />
                      </div>
                      <div className="bg-muted/40 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">달성 여부</p>
                        <Select value={meeting.achievement_status || 'in_progress'} onValueChange={v => handleUpdateMeetingField(meeting.id, 'achievement_status', v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completed">✅ 완료</SelectItem>
                            <SelectItem value="in_progress">⚠️ 진행 중</SelectItem>
                            <SelectItem value="delayed">❌ 지연</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">코멘트</p>
                        <Textarea
                          className="text-sm min-h-[60px] resize-none"
                          placeholder="성과 코멘트를 입력하세요..."
                          defaultValue={meeting.achievement_comment || ''}
                          onBlur={e => {
                            if (e.target.value !== (meeting.achievement_comment || '')) {
                              handleUpdateMeetingField(meeting.id, 'achievement_comment', e.target.value || null);
                            }
                          }}
                        />
                      </div>
                    </div>
                    {/* 화상회의 링크 */}
                    <div className="bg-muted/40 rounded-lg p-3 flex items-center gap-3">
                      <Video className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">화상회의 링크</p>
                        <Input
                          className="h-7 text-xs"
                          placeholder="Google Meet / Zoom 링크 붙여넣기"
                          defaultValue={meeting.meeting_link || ''}
                          onBlur={e => {
                            if (e.target.value !== (meeting.meeting_link || '')) {
                              handleUpdateMeetingField(meeting.id, 'meeting_link', e.target.value || null);
                            }
                          }}
                        />
                      </div>
                      {meeting.meeting_link && (
                        <>
                          <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="default" className="h-7 text-xs gap-1 shrink-0">
                              <ExternalLink className="h-3 w-3" />참여하기
                            </Button>
                          </a>
                          {(meeting.attendee_ids || []).length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 shrink-0"
                              onClick={async () => {
                                const attendeeIds = meeting.attendee_ids || [];
                                await notifyUsers(
                                  attendeeIds,
                                  '🎥 화상회의 초대',
                                  `"${meeting.title}" 화상회의에 참여해주세요.\n링크: ${meeting.meeting_link}`,
                                  'meeting',
                                  meeting.id
                                );
                                toast({ title: `${attendeeIds.length}명에게 화상회의 초대 알림을 보냈습니다` });
                              }}
                            >
                              <Send className="h-3 w-3" />초대 알림
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section: AI 회의록 녹음 & 분석 */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Mic className="h-3.5 w-3.5" />🎙️ 실시간 녹음 & AI 분석
                    </h4>
                    <div className="bg-muted/40 rounded-lg p-4 space-y-3">
                      <Tabs defaultValue="record" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-8">
                          <TabsTrigger value="record" className="text-xs gap-1"><Mic className="h-3 w-3" />음성 녹음</TabsTrigger>
                          <TabsTrigger value="paste" className="text-xs gap-1"><ClipboardPaste className="h-3 w-3" />텍스트 붙여넣기</TabsTrigger>
                          <TabsTrigger value="file" className="text-xs gap-1"><Upload className="h-3 w-3" />파일 첨부</TabsTrigger>
                        </TabsList>
                        <TabsContent value="record" className="space-y-3 mt-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isRecording && recordingMeetingId === meeting.id ? (
                              <Button size="sm" variant="destructive" className="gap-1.5" onClick={stopRecording}>
                                <MicOff className="h-3.5 w-3.5" />녹음 중지
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => startRecording(meeting.id)}
                                disabled={isRecording || isAnalyzing}
                              >
                                <Mic className="h-3.5 w-3.5" />녹음 시작
                              </Button>
                            )}
                            {recordingMeetingId === meeting.id && transcript.length > 0 && !isRecording && (
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1.5"
                                onClick={() => analyzeTranscript(meeting.id, 'recording')}
                                disabled={isAnalyzing}
                              >
                                {isAnalyzing ? (
                                  <><Loader2 className="h-3.5 w-3.5 animate-spin" />분석 중...</>
                                ) : (
                                  <><Brain className="h-3.5 w-3.5" />AI 분석 실행</>
                                )}
                              </Button>
                            )}
                            {isRecording && recordingMeetingId === meeting.id && (
                              <Badge variant="destructive" className="text-[10px] animate-pulse gap-1">
                                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />녹음 중...
                              </Badge>
                            )}
                          </div>
                          {recordingMeetingId === meeting.id && transcript && (
                            <div className="bg-background rounded-md p-3 border max-h-40 overflow-y-auto">
                              <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">녹취록 (실시간)</p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            💡 Chrome 브라우저에서 마이크를 허용하고 녹음 시작을 누르세요.
                          </p>
                        </TabsContent>
                        <TabsContent value="paste" className="space-y-3 mt-3">
                          <Textarea
                            placeholder="회의 녹취록 또는 회의 내용을 여기에 붙여넣으세요..."
                            value={manualTranscript}
                            onChange={(e) => setManualTranscript(e.target.value)}
                            className="min-h-[120px] text-sm"
                            disabled={isAnalyzing}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5"
                              onClick={() => analyzeTranscript(meeting.id, 'manual')}
                              disabled={isAnalyzing || manualTranscript.trim().length < 10}
                            >
                              {isAnalyzing ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" />분석 중...</>
                              ) : (
                                <><Brain className="h-3.5 w-3.5" />AI 분석 실행</>
                              )}
                            </Button>
                            <span className="text-[10px] text-muted-foreground">
                              {manualTranscript.trim().length}자 입력됨 (최소 10자)
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            💡 회의 녹취록이나 메모를 붙여넣고 AI 분석을 실행하면 회의록이 자동 생성됩니다.
                          </p>
                        </TabsContent>
                        <TabsContent value="file" className="space-y-3 mt-3">
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".txt,.md,.csv,.docx,audio/*,.mp3,.m4a,.wav,.webm,.ogg,.mp4,.aac"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(meeting.id, file);
                              e.target.value = '';
                            }}
                          />
                          <div
                            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleFileUpload(meeting.id, file);
                            }}
                          >
                            {isReadingFile || (isAnalyzing && uploadedFileName) ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                <p className="text-sm font-medium">{isReadingFile ? '파일 읽는 중...' : 'AI 분석 중...'}</p>
                                {uploadedFileName && <p className="text-xs text-muted-foreground">{uploadedFileName}</p>}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                                <p className="text-sm font-medium">파일을 드래그하거나 클릭하여 업로드</p>
                                <p className="text-xs text-muted-foreground">지원 형식: .txt, .md, .csv, .docx, .mp3, .m4a, .wav</p>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            💡 녹음 파일은 Genspark로 녹취 변환 후 AI 분석을 실행합니다.
                          </p>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>

                  {/* Section 2: 개인별 업데이트 */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />2. 개인별 업데이트
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs w-[120px]">담당자</TableHead>
                            <TableHead className="text-xs">지난주 성과 (Done)</TableHead>
                            <TableHead className="text-xs">이번 주 목표 (Todo)</TableHead>
                            <TableHead className="text-xs">장애물 (Blockers)</TableHead>
                            <TableHead className="text-xs w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendees.map((a: any) => {
                            if (!a) return null;
                            const existing = updates.find(u => u.profile_id === a.id);
                            const key = `${meeting.id}-${a.id}`;
                            const isEditing = key in editingUpdates;
                            const vals = isEditing ? editingUpdates[key] : { done: existing?.done || '', todo: existing?.todo || '', blockers: existing?.blockers || '' };

                            return (
                              <TableRow key={a.id}>
                                <TableCell className="py-2">
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="h-5 w-5"><AvatarFallback className="bg-primary text-primary-foreground text-[9px]">{a.avatar}</AvatarFallback></Avatar>
                                    <span className="text-xs font-medium">{a.name_kr}</span>
                                  </div>
                                </TableCell>
                                {isEditing ? (
                                  <>
                                    <TableCell className="py-1"><Input className="h-7 text-xs" value={vals.done} onChange={e => setEditingUpdates(prev => ({ ...prev, [key]: { ...prev[key], done: e.target.value } }))} /></TableCell>
                                    <TableCell className="py-1"><Input className="h-7 text-xs" value={vals.todo} onChange={e => setEditingUpdates(prev => ({ ...prev, [key]: { ...prev[key], todo: e.target.value } }))} /></TableCell>
                                    <TableCell className="py-1"><Input className="h-7 text-xs" value={vals.blockers} onChange={e => setEditingUpdates(prev => ({ ...prev, [key]: { ...prev[key], blockers: e.target.value } }))} /></TableCell>
                                    <TableCell className="py-1"><Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => handleSaveUpdate(meeting.id, a.id)}>저장</Button></TableCell>
                                  </>
                                ) : (
                                  <>
                                    <TableCell className="py-2 text-xs">{vals.done || '—'}</TableCell>
                                    <TableCell className="py-2 text-xs">{vals.todo || '—'}</TableCell>
                                    <TableCell className="py-2 text-xs">{vals.blockers || '없음'}</TableCell>
                                    <TableCell className="py-2">
                                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                                        onClick={() => setEditingUpdates(prev => ({ ...prev, [key]: { done: vals.done, todo: vals.todo, blockers: vals.blockers } }))}>
                                        편집
                                      </Button>
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            );
                          })}
                          {attendees.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-4">참석자가 없습니다</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Section 3: KPI & 로드맵 */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" />3. 주요 지표(KPI) 및 로드맵 점검
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-muted/40 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">핵심 지표</p>
                        <Textarea
                          className="text-sm min-h-[60px] resize-none"
                          placeholder="핵심 지표(KPI)를 입력하세요..."
                          defaultValue={meeting.kpi_notes || ''}
                          onBlur={e => {
                            if (e.target.value !== (meeting.kpi_notes || '')) {
                              handleUpdateMeetingField(meeting.id, 'kpi_notes', e.target.value || null);
                            }
                          }}
                        />
                      </div>
                      <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">로드맵 점검</p>
                        <div className="space-y-1">
                          <label className="flex items-center gap-2 text-xs">
                            <Checkbox checked={meeting.roadmap_aligned ?? false} onCheckedChange={v => handleUpdateMeetingField(meeting.id, 'roadmap_aligned', !!v)} />
                            현재 작업이 제품 로드맵 방향과 일치하는가?
                          </label>
                          <label className="flex items-center gap-2 text-xs">
                            <Checkbox checked={meeting.schedule_adjustment_needed ?? false} onCheckedChange={v => handleUpdateMeetingField(meeting.id, 'schedule_adjustment_needed', !!v)} />
                            일정 조정이 필요한 마일스톤이 있는가?
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meeting notes */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">📝 회의 내용</p>
                    <Textarea
                      className="text-sm min-h-[100px] leading-relaxed bg-muted/30"
                      placeholder="회의 내용을 입력하세요..."
                      defaultValue={meeting.notes || ''}
                      onBlur={e => {
                        if (e.target.value !== (meeting.notes || '')) {
                          handleUpdateMeetingField(meeting.id, 'notes', e.target.value || null);
                        }
                      }}
                    />
                  </div>

                  {/* Section 4: 액션 아이템 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <ArrowRight className="h-3.5 w-3.5" />4. 액션 아이템 → 칸반 보드
                      </h4>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setActionDialog(meeting.id)}>
                        <Plus className="h-3 w-3" />추가
                      </Button>
                    </div>
                    {meetingTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">아직 실행 항목이 없습니다.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {meetingTasks.map((task: any) => {
                          const assignee = getProfile(task.assignee_id);
                          return (
                            <div key={task.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Checkbox checked={task.status === 'done'} disabled className="h-3.5 w-3.5" />
                                <span className={`text-sm truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                                <Badge variant="outline" className="text-[10px] shrink-0">{task.status}</Badge>
                              </div>
                              {assignee && (
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <Avatar className="h-5 w-5"><AvatarFallback className="bg-primary text-primary-foreground text-[9px]">{assignee.avatar}</AvatarFallback></Avatar>
                                  <span className="text-xs text-muted-foreground">@{assignee.name}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 운영 팁 */}
                  <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-1">
                    <p className="text-[10px] font-bold text-accent uppercase">💡 운영 팁</p>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                      <li>특정 주제 토론이 3분 이상 → "별도 세션"으로 분리</li>
                      <li>칸반 보드를 화면에 공유하세요</li>
                      <li>미팅 직후 공유 채널에 업로드</li>
                    </ul>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Action Item Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>액션 아이템 추가 → 칸반 보드</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2"><Label>업무 제목</Label><Input placeholder="실행할 업무를 입력하세요" value={actionForm.title} onChange={e => setActionForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>담당자</Label>
              <Select value={actionForm.assignee_id} onValueChange={v => setActionForm(f => ({ ...f, assignee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
                <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name_kr} (@{p.name})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>우선순위</Label>
              <Select value={actionForm.priority} onValueChange={v => setActionForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">낮음</SelectItem><SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="high">높음</SelectItem><SelectItem value="urgent">긴급</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => actionDialog && handleAddActionItem(actionDialog)} disabled={!actionForm.title} className="w-full">칸반 보드에 추가</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
