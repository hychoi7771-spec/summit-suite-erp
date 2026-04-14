import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.jpg';

const EMAIL_DOMAIN = 'shfoodhub.local';

export default function Auth() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="SHFoodHub" className="h-16 w-16 object-contain" />
          </div>
          <CardTitle className="text-xl">SHFoodHub</CardTitle>
          <p className="text-sm text-muted-foreground">팀 계정으로 로그인하세요</p>
        </CardHeader>
        <CardContent>
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
          <p className="text-xs text-muted-foreground text-center mt-4">
            계정이 없으신가요? 관리자에게 문의하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
