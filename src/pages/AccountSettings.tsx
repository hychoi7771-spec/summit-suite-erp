import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { User, KeyRound, AtSign } from 'lucide-react';

const EMAIL_DOMAIN = 'shfoodhub.local';

/** 이메일에서 로컬 파트(아이디)만 추출 */
const extractLoginId = (email?: string | null) => {
  if (!email) return '';
  const [local] = email.split('@');
  return local;
};

export default function AccountSettings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const currentLoginId = extractLoginId(user?.email);

  const [loginId, setLoginId] = useState(currentLoginId);
  const [savingId, setSavingId] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const handleUpdateLoginId = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = loginId.trim().toLowerCase();
    if (!trimmed) {
      toast({ title: '아이디를 입력하세요', variant: 'destructive' });
      return;
    }
    if (!/^[a-z0-9._-]+$/.test(trimmed)) {
      toast({ title: '아이디 형식 오류', description: '영문 소문자, 숫자, . _ - 만 사용 가능합니다.', variant: 'destructive' });
      return;
    }
    if (trimmed === currentLoginId) {
      toast({ title: '변경 사항이 없습니다' });
      return;
    }

    setSavingId(true);
    const newEmail = `${trimmed}@${EMAIL_DOMAIN}`;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSavingId(false);

    if (error) {
      toast({ title: '아이디 변경 실패', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '아이디가 변경되었습니다', description: `새 아이디: ${trimmed}` });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: '비밀번호는 6자 이상이어야 합니다', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: '새 비밀번호가 일치하지 않습니다', variant: 'destructive' });
      return;
    }
    if (!currentPassword) {
      toast({ title: '현재 비밀번호를 입력하세요', variant: 'destructive' });
      return;
    }

    setSavingPw(true);

    // 현재 비밀번호 검증
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    });
    if (signInError) {
      setSavingPw(false);
      toast({ title: '현재 비밀번호가 올바르지 않습니다', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);

    if (error) {
      toast({ title: '비밀번호 변경 실패', description: error.message, variant: 'destructive' });
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast({ title: '비밀번호가 변경되었습니다' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">계정 관리</h1>
          <p className="text-sm text-muted-foreground">아이디와 비밀번호를 변경할 수 있습니다.</p>
        </div>
      </div>

      {/* 프로필 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">내 프로필</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">이름</span>
            <span className="font-medium">{profile?.name_kr || profile?.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">현재 아이디</span>
            <span className="font-medium font-mono">{currentLoginId}</span>
          </div>
        </CardContent>
      </Card>

      {/* 아이디 변경 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AtSign className="h-4 w-4" /> 아이디 변경
          </CardTitle>
          <CardDescription>로그인에 사용할 아이디를 변경합니다. 변경 즉시 적용됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateLoginId} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-id">새 아이디</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="login-id"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="예: hong.gildong"
                  className="font-mono"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">@{EMAIL_DOMAIN}</span>
              </div>
              <p className="text-xs text-muted-foreground">영문 소문자, 숫자, . _ - 사용 가능</p>
            </div>
            <Button type="submit" disabled={savingId}>
              {savingId ? '변경 중...' : '아이디 변경'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> 비밀번호 변경
          </CardTitle>
          <CardDescription>보안을 위해 주기적으로 변경하세요. (최소 6자)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-pw">현재 비밀번호</Label>
              <Input id="current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">새 비밀번호</Label>
              <Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">새 비밀번호 확인</Label>
              <Input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={savingPw}>
              {savingPw ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
