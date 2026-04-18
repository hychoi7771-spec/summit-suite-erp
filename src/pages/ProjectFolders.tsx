import { useState, useEffect } from 'react';
import { Folder, Plus, Trash2, Edit2, FolderKanban, ChevronRight, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const folderColors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e', '#06b6d4', '#eab308'];

export default function ProjectFolders() {
  const { profile, userRole, isManager } = useAuth();
  const { toast } = useToast();
  const isAdmin = isManager;

  const [folders, setFolders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<any>(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#3b82f6');
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [assignProject, setAssignProject] = useState<{ projectId: string; folderId: string } | null>(null);

  const fetchData = async () => {
    const [fRes, pRes] = await Promise.all([
      supabase.from('project_folders').select('*').order('created_at', { ascending: true }),
      supabase.from('products').select('id, name, stage, progress, folder_id, deadline').order('name'),
    ]);
    setFolders(fRes.data || []);
    setProjects(pRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateFolder = async () => {
    if (!folderName.trim() || !profile) return;
    await supabase.from('project_folders').insert({ name: folderName, color: folderColor, created_by: profile.id });
    toast({ title: '📁 폴더가 생성되었습니다' });
    setCreateOpen(false);
    setFolderName('');
    fetchData();
  };

  const handleUpdateFolder = async () => {
    if (!editFolder || !folderName.trim()) return;
    await supabase.from('project_folders').update({ name: folderName, color: folderColor }).eq('id', editFolder.id);
    toast({ title: '폴더가 수정되었습니다' });
    setEditFolder(null);
    setFolderName('');
    fetchData();
  };

  const handleDeleteFolder = async (id: string) => {
    // Unassign projects first
    await supabase.from('products').update({ folder_id: null }).eq('folder_id', id);
    await supabase.from('project_folders').delete().eq('id', id);
    toast({ title: '폴더가 삭제되었습니다' });
    fetchData();
  };

  const handleAssignProject = async (projectId: string, folderId: string | null) => {
    await supabase.from('products').update({ folder_id: folderId }).eq('id', projectId);
    toast({ title: '프로젝트가 이동되었습니다' });
    fetchData();
  };

  const unassignedProjects = projects.filter(p => !p.folder_id);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">프로젝트 폴더</h1>
          <p className="text-sm text-muted-foreground mt-1">프로젝트를 폴더별로 정리하고 관리하세요</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> 폴더 만들기</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>새 폴더</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>폴더명</Label>
                <Input value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="폴더 이름" />
              </div>
              <div>
                <Label>색상</Label>
                <div className="flex items-center gap-2 mt-1">
                  {folderColors.map(c => (
                    <button
                      key={c}
                      className={`h-7 w-7 rounded-full border-2 transition-transform ${folderColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setFolderColor(c)}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreateFolder} disabled={!folderName.trim()} className="w-full">생성</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit folder dialog */}
      <Dialog open={!!editFolder} onOpenChange={open => { if (!open) setEditFolder(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>폴더 수정</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>폴더명</Label>
              <Input value={folderName} onChange={e => setFolderName(e.target.value)} />
            </div>
            <div>
              <Label>색상</Label>
              <div className="flex items-center gap-2 mt-1">
                {folderColors.map(c => (
                  <button
                    key={c}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${folderColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setFolderColor(c)}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleUpdateFolder} className="w-full">저장</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Folders */}
      <div className="space-y-3">
        {folders.map(folder => {
          const folderProjects = projects.filter(p => p.folder_id === folder.id);
          const isExpanded = expandedFolder === folder.id;
          return (
            <Card key={folder.id}>
              <CardContent className="p-0">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedFolder(isExpanded ? null : folder.id)}
                >
                  <Folder className="h-5 w-5 shrink-0" style={{ color: folder.color }} />
                  <span className="text-sm font-medium text-foreground flex-1">{folder.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{folderProjects.length}개 프로젝트</Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); setEditFolder(folder); setFolderName(folder.name); setFolderColor(folder.color); }}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                {isExpanded && (
                  <div className="border-t border-border px-4 py-2 space-y-1.5">
                    {folderProjects.length === 0 && (
                      <p className="text-xs text-muted-foreground py-3 text-center">이 폴더에 프로젝트가 없습니다</p>
                    )}
                    {folderProjects.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/30">
                        <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium text-foreground flex-1">{p.name}</span>
                        <Badge variant="outline" className="text-[9px]">{p.stage}</Badge>
                        <Progress value={p.progress} className="w-16 h-1.5" />
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleAssignProject(p.id, null)}>
                          폴더 해제
                        </Button>
                      </div>
                    ))}
                    {/* Add project to folder */}
                    {unassignedProjects.length > 0 && (
                      <div className="pt-2 border-t border-border mt-2">
                        <Select onValueChange={val => handleAssignProject(val, folder.id)}>
                          <SelectTrigger className="h-7 text-[10px]">
                            <SelectValue placeholder="+ 프로젝트 추가" />
                          </SelectTrigger>
                          <SelectContent>
                            {unassignedProjects.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unassigned projects */}
      {unassignedProjects.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">📂 미분류 프로젝트</h3>
          <div className="space-y-1.5">
            {unassignedProjects.map(p => (
              <Card key={p.id}>
                <CardContent className="px-4 py-2.5 flex items-center gap-3">
                  <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground flex-1">{p.name}</span>
                  <Badge variant="outline" className="text-[9px]">{p.stage}</Badge>
                  {folders.length > 0 && (
                    <Select onValueChange={val => handleAssignProject(p.id, val)}>
                      <SelectTrigger className="h-7 w-[120px] text-[10px]">
                        <SelectValue placeholder="폴더 이동" />
                      </SelectTrigger>
                      <SelectContent>
                        {folders.map(f => (
                          <SelectItem key={f.id} value={f.id} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              <Folder className="h-3 w-3" style={{ color: f.color }} />
                              {f.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
