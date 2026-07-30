import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

const LOVABLE_IP = '185.158.133.1';
const DEFAULT_DOMAIN = 'summit-suite-erp.vercel.app';
const AUTO_REFRESH_MS = 60_000;

type CheckState = 'pass' | 'fail' | 'warn' | 'pending';

interface CheckResult {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
  reason?: string;
  fix?: string;
}

async function resolve(name: string, type: 'A' | 'TXT' | 'CNAME'): Promise<string[]> {
  const res = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { accept: 'application/dns-json' } },
  );
  if (!res.ok) throw new Error(`DNS 조회 실패 (HTTP ${res.status})`);
  const json = await res.json();
  const answers: any[] = json?.Answer || [];
  return answers
    .filter((a) => (type === 'A' ? a.type === 1 : type === 'CNAME' ? a.type === 5 : a.type === 16))
    .map((a) => String(a.data).replace(/^"|"$/g, '').replace(/\.$/, ''));
}

export default function DomainStatus() {
  const [domain, setDomain] = useState(DEFAULT_DOMAIN);
  const [input, setInput] = useState(DEFAULT_DOMAIN);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const runChecks = useCallback(async (target: string) => {
    setLoading(true);
    setGlobalError(null);
    const results: CheckResult[] = [];

    const isVercelSubdomain = /\.vercel\.app$/i.test(target);
    if (isVercelSubdomain) {
      results.push({
        id: 'registrar',
        label: '도메인 소유/위임 가능 여부',
        state: 'fail',
        detail: `${target} 은(는) Vercel이 관리하는 공용 서브도메인입니다.`,
        reason: 'vercel.app 서브도메인은 DNS 레코드를 직접 수정할 수 없어 Lovable 커스텀 도메인으로 연결할 수 없습니다.',
        fix: '직접 소유한 도메인(예: example.com)을 Project Settings → Domains 에서 연결하세요.',
      });
    }

    try {
      const [a, www, txt, cname] = await Promise.all([
        resolve(target, 'A').catch((e) => { throw e; }),
        resolve(`www.${target}`, 'A').catch(() => [] as string[]),
        resolve(`_lovable.${target}`, 'TXT').catch(() => [] as string[]),
        resolve(target, 'CNAME').catch(() => [] as string[]),
      ]);

      results.push({
        id: 'a-root',
        label: `A 레코드 (@ → ${LOVABLE_IP})`,
        state: a.includes(LOVABLE_IP) ? 'pass' : 'fail',
        detail: a.length ? `현재 값: ${a.join(', ')}` : '레코드 없음',
        reason: a.includes(LOVABLE_IP)
          ? undefined
          : a.length
            ? 'A 레코드가 Lovable IP가 아닌 다른 서버를 가리키고 있습니다.'
            : 'A 레코드가 조회되지 않습니다.',
        fix: a.includes(LOVABLE_IP) ? undefined : `A 레코드 @ 값을 ${LOVABLE_IP} 로 설정하세요.`,
      });

      results.push({
        id: 'a-www',
        label: `A 레코드 (www → ${LOVABLE_IP})`,
        state: www.includes(LOVABLE_IP) ? 'pass' : www.length ? 'fail' : 'warn',
        detail: www.length ? `현재 값: ${www.join(', ')}` : '레코드 없음',
        reason: www.includes(LOVABLE_IP)
          ? undefined
          : www.length
            ? 'www 서브도메인이 Lovable IP를 가리키지 않습니다.'
            : 'www 서브도메인 레코드가 없어 www 주소로는 접속되지 않습니다.',
        fix: www.includes(LOVABLE_IP) ? undefined : `A 레코드 www 값을 ${LOVABLE_IP} 로 추가하세요.`,
      });

      const verifyTxt = txt.find((t) => t.toLowerCase().includes('lovable_verify'));
      results.push({
        id: 'txt',
        label: '소유권 검증 TXT (_lovable)',
        state: verifyTxt ? 'pass' : 'fail',
        detail: verifyTxt ? `현재 값: ${verifyTxt}` : '레코드 없음',
        reason: verifyTxt ? undefined : '_lovable TXT 레코드가 없어 도메인 소유권 검증을 완료할 수 없습니다.',
        fix: verifyTxt ? undefined : 'Project Settings → Domains 에서 표시되는 lovable_verify= 값을 _lovable TXT 레코드로 추가하세요.',
      });

      if (cname.length) {
        results.push({
          id: 'cname',
          label: 'CNAME 충돌',
          state: 'warn',
          detail: `현재 값: ${cname.join(', ')}`,
          reason: '루트 도메인에 CNAME이 존재하면 A 레코드와 충돌할 수 있습니다.',
          fix: '프록시(Cloudflare 등)를 사용하지 않는다면 CNAME을 제거하세요.',
        });
      }

      try {
        const start = performance.now();
        await fetch(`https://${target}/robots.txt`, { mode: 'no-cors', cache: 'no-store' });
        results.push({
          id: 'https',
          label: 'HTTPS 응답',
          state: 'pass',
          detail: `응답 확인 (${Math.round(performance.now() - start)}ms)`,
        });
      } catch {
        results.push({
          id: 'https',
          label: 'HTTPS 응답',
          state: 'fail',
          detail: '연결 실패',
          reason: 'HTTPS 요청이 실패했습니다. SSL 인증서가 아직 발급되지 않았거나 DNS가 전파되지 않았습니다.',
          fix: 'DNS 전파(최대 72시간)를 기다린 뒤 Domains 화면에서 Retry 를 눌러 재시도하세요.',
        });
      }
    } catch (e: any) {
      setGlobalError(e?.message || 'DNS 조회 중 오류가 발생했습니다.');
    }

    setChecks(results);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    runChecks(domain);
    const id = setInterval(() => runChecks(domain), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [domain, runChecks]);

  const failures = checks.filter((c) => c.state === 'fail');
  const warnings = checks.filter((c) => c.state === 'warn');
  const overall: CheckState = loading && !checks.length
    ? 'pending'
    : failures.length
      ? 'fail'
      : warnings.length
        ? 'warn'
        : 'pass';

  const stateIcon = (s: CheckState) =>
    s === 'pass' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      : s === 'fail' ? <XCircle className="h-4 w-4 text-destructive" />
        : s === 'warn' ? <AlertTriangle className="h-4 w-4 text-amber-600" />
          : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Globe}
        title="도메인 연결 상태"
        description="커스텀 도메인 DNS·SSL 상태를 1분마다 자동 재검증하고 실패 사유를 표시합니다."
        tone="sky"
        actions={
          <Button variant="outline" size="sm" onClick={() => runChecks(domain)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 지금 재검증
          </Button>
        }
      />

      <form
        className="flex gap-2 max-w-xl"
        onSubmit={(e) => { e.preventDefault(); setDomain(input.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')); }}
      >
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="example.com" aria-label="검증할 도메인" />
        <Button type="submit" disabled={loading}>검증</Button>
      </form>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {stateIcon(overall)}
            <span>{domain}</span>
            <Badge variant={overall === 'pass' ? 'default' : overall === 'fail' ? 'destructive' : 'secondary'}>
              {overall === 'pass' ? '연결 정상' : overall === 'fail' ? '연결 실패' : overall === 'warn' ? '주의 필요' : '검사 중'}
            </Badge>
            {lastChecked && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                마지막 검증: {lastChecked.toLocaleTimeString('ko-KR')}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {globalError && (
            <p className="text-sm text-destructive">{globalError}</p>
          )}
          {!checks.length && loading && (
            <p className="text-sm text-muted-foreground">DNS 레코드를 조회하는 중입니다...</p>
          )}
          {checks.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/70 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5">{stateIcon(c.state)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-all">{c.detail}</p>
                  {c.reason && <p className="text-xs text-destructive mt-1">실패 사유: {c.reason}</p>}
                  {c.fix && <p className="text-xs text-muted-foreground mt-1">조치: {c.fix}</p>}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        DNS 레코드 변경은 Project Settings → Domains 및 도메인 등록기관에서 진행해야 하며, 전파에 최대 72시간이 걸릴 수 있습니다.
      </p>
    </div>
  );
}
