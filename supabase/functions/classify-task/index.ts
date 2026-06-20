// 신규 업무 등록 시 제목/설명을 분석해 적합한 카테고리 ID를 반환
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CatIn {
  id: string;
  name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const title: string = (body.title || '').toString().slice(0, 300);
    const description: string = (body.description || '').toString().slice(0, 1500);
    const categories: CatIn[] = Array.isArray(body.categories) ? body.categories : [];

    if (!title || categories.length === 0) {
      return new Response(JSON.stringify({ category_id: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const list = categories.map((c, i) => `${i + 1}. ${c.name} (id=${c.id})`).join('\n');

    const prompt = `당신은 한국 브랜드 회사의 업무 분류 전문가입니다. 아래 업무를 가장 적합한 카테고리 1개로 분류하세요.

[카테고리 목록]
${list}

[업무]
제목: ${title}
${description ? `설명: ${description}` : ''}

응답은 반드시 다음 JSON 형식만(코드블록·설명 없이):
{"category_id":"<위 목록 중 정확히 하나의 id>"}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI gateway error', detail: txt, category_id: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    let content: string = data.choices?.[0]?.message?.content || '';
    content = content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();

    let cid: string | null = null;
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.category_id === 'string') {
        if (categories.some(c => c.id === parsed.category_id)) cid = parsed.category_id;
      }
    } catch {
      // fallback: regex-extract a uuid that matches one of the categories
      const m = content.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (m && categories.some(c => c.id === m[0])) cid = m[0];
    }

    return new Response(JSON.stringify({ category_id: cid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, category_id: null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
