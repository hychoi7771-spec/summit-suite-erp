import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Users, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Constants } from '@/integrations/supabase/types';

const roleLabels: Record<string, string> = {
  ceo: '대표이사', general_director: '총괄이사', deputy_gm: '부장',
  md: '차장', designer: '대리', staff: '사원',
};

const roleOrder: Record<string, number> = {
  ceo: 0, general_director: 1, deputy_gm: 2, md: 3, designer: 4, staff: 5,
};

const roles = Constants.public.Enums.app_role;

const presenceLabels: Record<string, string> = { working: '근무 중', away: '자리비움', offline: '오프라인' };
const presenceColors: Record<string, string> = { working: 'bg-success', away: 'bg-warning', offline: 'bg-muted-foreground/40' };

export default function TeamManagement() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', name_kr: '', role: 'staff' });

  const isAdmin = userRole === 'ceo' || userRole === 'general_director';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [profRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('user_roles').select('*'),
    ]);
    setProfiles(profRes.data || []);
    setUserRoles(roleRes.data || []);
    setLoading(false);
  };

  const getRole = (userId: string) => userRoles.find(r => r.user_id === userId);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const existing = getRole(userId);
    if (!existing) return;
    const { error } = await supabase.from('user_roles').update({ role: newRole as any }).eq('id', existing.id);
    if (error) {
      toast({ title: '역할 변경 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '역할이 변경되었습니다' });
      fetchData();
    }
  };

  const handleDeleteUser = async (targetUserId: string, name: string) => {
    setDeleting(targetUserId);
    try {
      const res = await supabase.functions.invoke('delete-user', {
        body: { user_id: targetUserId },
      });
      if (res.error || res.data?.error) {
        toast({ title: '삭제 실패', description: res.data?.error || res.error?.message, variant: 'destructive' });
      } else {
        toast({ title: `${name} 계정이 삭제되었습니다` });
        fetchData();
      }
    } catch (e: any) {
      toast({ title: '삭제 실패', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name || !newUser.name_kr) {
      toast({ title: '모든 필드를 입력해주세요', variant: 'destructive' });
      return;
    }
    if (newUser.password.length < 6) {
      toast({ title: '비밀번호는 6자 이상이어야 합니다', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke('create-user', { body: newUser });
      if (res.error || res.data?.error) {
        toast({ title: '생성 실패', description: res.data?.error || res.error?.message, variant: 'destructive' });
      } else {
        toast({ title: `${newUser.name_kr} 계정이 생성되었습니다` });
        setNewUser({ email: '', password: '', name: '', name_kr: '', role: 'staff' });
        setShowCreateDialog(false);
        fetchData();
      }
    } catch (e: any) {
      toast({ title: '생성 실패', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const sortedProfiles = [...profiles].sort((a, b) => {
    const roleA = getRole(a.user_id);
    const roleB = getRole(b.user_id);
    return (roleOrder[roleA?.role] ?? 99) - (roleOrder[roleB?.role] ?? 99);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? '팀원 관리' : '팀원 현황'}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAdmin ? '팀원 역할 및 상태 관리' : '팀원 접속 현황'}</p>
        </div>
        {isAdmin && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                팀원 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 팀원 추가</DialogTitle>
                <DialogDescription>새 팀원의 계정 정보를 입력하세요. 생성 후 바로 로그인 가능합니다.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label>이름 (한글)</Label>
                  <Input value={newUser.name_kr} onChange={e => setNewUser(p => ({ ...p, name_kr: e.target.value }))} placeholder="박재민" />
                </div>
                <div className="space-y-1.5">
                  <Label>이름 (영문)</Label>
                  <Input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} placeholder="James Park" />
                </div>
                <div className="space-y-1.5">
                  <Label>이메일</Label>
                  <Input type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="name@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>초기 비밀번호</Label>
                  <Input type="text" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="6자 이상" />
                </div>
                <div className="space-y-1.5">
                  <Label>직급</Label>
                  <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{roleLabels[r] || r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>취소</Button>
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating ? '생성 중...' : '계정 생성'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="p-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">총 팀원</p>
                <p className="text-2xl font-bold mt-1">{profiles.length}명</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted"><Users className="h-5 w-5 text-muted-foreground" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-0">
            <p className="text-xs font-medium text-muted-foreground uppercase">근무 중</p>
            <p className="text-2xl font-bold mt-1">{profiles.filter(p => p.presence === 'working').length}명</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-0">
            <p className="text-xs font-medium text-muted-foreground uppercase">자리비움/오프라인</p>
            <p className="text-2xl font-bold mt-1">{profiles.filter(p => p.presence !== 'working').length}명</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">팀원 목록</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>영문명</TableHead>
                  <TableHead>직급</TableHead>
                  <TableHead>상태</TableHead>
                  {isAdmin && <TableHead>가입일</TableHead>}
                  {isAdmin && <TableHead className="w-[60px]">삭제</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProfiles.map(member => {
                  const role = getRole(member.user_id);
                  const isSelf = member.user_id === user?.id;
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8 bg-primary">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{member.avatar}</AvatarFallback>
                            </Avatar>
                            <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${presenceColors[member.presence] || 'bg-muted-foreground/40'}`} />
                          </div>
                          <span className="text-sm font-medium">{member.name_kr}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{member.name}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select value={role?.role || 'staff'} onValueChange={v => handleRoleChange(member.user_id, v)}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map(r => <SelectItem key={r} value={r}>{roleLabels[r] || r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{roleLabels[role?.role] || '사원'}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          <span className={`h-2 w-2 rounded-full mr-1.5 inline-block ${presenceColors[member.presence]}`} />
                          {presenceLabels[member.presence] || member.presence}
                        </Badge>
                      </TableCell>
                      {isAdmin && <TableCell className="text-sm text-muted-foreground">{new Date(member.created_at).toLocaleDateString('ko-KR')}</TableCell>}
                      {isAdmin && (
                        <TableCell>
                          {!isSelf && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deleting === member.user_id}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>계정 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <strong>{member.name_kr}</strong> ({member.name}) 계정을 삭제하시겠습니까?
                                    <br />이 작업은 되돌릴 수 없으며, 해당 사용자의 모든 데이터가 삭제됩니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDeleteUser(member.user_id, member.name_kr)}
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
