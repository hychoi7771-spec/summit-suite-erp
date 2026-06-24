// 업무 자산 라이브러리용 AI 요약 엔드포인트
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AssetItemIn {
  id: string;
  title: string;
  summary?: string;
  category?: string;
}

const SOURCE_LABEL: Record<string, string> = {
  tasks: '완료된 업무',
  daily_reports: '일일업무보고',
  approvals: '승인된 결재문서',
};

async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data } = await client.auth.getUser(authHeader.replace("Bearer ", ""));
  return data.user ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const user = await requireUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const source: string = body.source || 'tasks';
    const items: AssetItemIn[] = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const list = items
      .map((it, i) => `${i + 1}. [${it.category || '미분류'}] ${it.title}${it.summary ? `\n   요약: ${it.summary}` : ''}`)
      .join('\n');

    const prompt = `당신은 한국 기업의 업무 데이터 분석가입니다. 아래는 ${SOURCE_LABEL[source] || '업무'} ${items.length}건입니다.
이 데이터에서 향후 업무 자산으로 활용할 수 있는 인사이트를 추출해주세요.

[데이터]
${list}

다음 JSON 형식으로만 응답하세요(코드블록·설명 없이 순수 JSON만):
{
  "overview": "전체 흐름 2~3문장 한국어 요약",
  "patterns": ["반복되는 업무 패턴 3~5개"],
  "recommendations": ["향후 업무에 활용할 추천 액션 3~5개"]
}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI gateway error', detail: txt }), {
        status: aiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    let content: string = data.choices?.[0]?.message?.content || '';
    content = content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();

    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { overview: content, patterns: [], recommendations: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
