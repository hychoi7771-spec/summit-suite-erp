import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import logo from '@/assets/logo.jpg';

const EMAIL_DOMAIN = 'shfoodhub.local';

export default function Auth() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [signName, setSignName] = useState('');
  const [signNameKr, setSignNameKr] = useState('');
  const [signLoginId, setSignLoginId] = useState('');
  const [signPassword, setSignPassword] = useState('');
  const [signPasswordConfirm, setSignPasswordConfirm] = useState('');
  const [signLoading, setSignLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const email = loginId.includes('@') ? loginId : `${loginId}@${EMAIL_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: '로그인 실패', description: '아이디 또는 비밀번호를 확인해주세요.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signNameKr.trim() || !signLoginId.trim() || !signPassword) {
      toast({ title: '입력 오류', description: '이름, 아이디, 비밀번호를 모두 입력해주세요.', variant: 'destructive' });
      return;
    }
    if (signPassword.length < 6) {
      toast({ title: '비밀번호 오류', description: '비밀번호는 6자 이상이어야 합니다.', variant: 'destructive' });
      return;
    }
    if (signPassword !== signPasswordConfirm) {
      toast({ title: '비밀번호 오류', description: '비밀번호가 서로 일치하지 않습니다.', variant: 'destructive' });
      return;
    }
    setSignLoading(true);
    const email = signLoginId.includes('@') ? signLoginId.trim() : `${signLoginId.trim()}@${EMAIL_DOMAIN}`;
    const { error } = await supabase.auth.signUp({
      email,
      password: signPassword,
      options: {
        data: { name: signName.trim() || signNameKr.trim(), name_kr: signNameKr.trim(), login_id: signLoginId.trim() },
      },
    });
    if (error) {
      toast({ title: '가입 실패', description: error.message.includes('already registered') ? '이미 사용 중인 아이디입니다.' : error.message, variant: 'destructive' });
    } else {
      toast({ title: '가입 완료', description: '가입이 완료되었습니다. 로그인 탭에서 로그인해주세요.' });
      setLoginId(signLoginId.trim());
      setSignName(''); setSignNameKr(''); setSignLoginId(''); setSignPassword(''); setSignPasswordConfirm('');
    }
    setSignLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="SHFoodHub" className="h-16 w-16 object-contain" />
          </div>
          <CardTitle className="text-xl">SHFoodHub</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">로그인</TabsTrigger>
              <TabsTrigger value="signup">회원가입</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-id">아이디</Label>
                  <Input id="login-id" type="text" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="아이디를 입력하세요" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">비밀번호</Label>
                  <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '로그인 중...' : '로그인'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="pt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name-kr">이름</Label>
                  <Input id="signup-name-kr" type="text" value={signNameKr} onChange={e => setSignNameKr(e.target.value)} placeholder="예: 김주한" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-id">아이디</Label>
                  <Input id="signup-id" type="text" value={signLoginId} onChange={e => setSignLoginId(e.target.value)} placeholder="사용할 아이디" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">비밀번호 (6자 이상)</Label>
                  <Input id="signup-password" type="password" value={signPassword} onChange={e => setSignPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password-confirm">비밀번호 확인</Label>
                  <Input id="signup-password-confirm" type="password" value={signPasswordConfirm} onChange={e => setSignPasswordConfirm(e.target.value)} placeholder="••••••••" required />
                </div>
                <Button type="submit" className="w-full" disabled={signLoading}>
                  {signLoading ? '가입 중...' : '가입하기'}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                가입 즉시 사원(staff) 권한으로 등록되며, 입사일은 가입일로 자동 기록됩니다.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
