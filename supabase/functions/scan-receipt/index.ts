import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "date", "category", "items"],
  properties: {
    title: { type: ["string", "null"], description: "짧은 지출 제목 (예: 매장 진열소품 구매)" },
    date: { type: ["string", "null"], description: "영수증 날짜 YYYY-MM-DD" },
    category: { type: ["string", "null"], enum: ["샘플링", "마케팅", "일반", "출장", "장비", null] },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "amount", "note"],
        properties: {
          name: { type: "string" },
          amount: { type: "integer" },
          note: { type: ["string", "null"] },
        },
      },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "로그인이 필요합니다." }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "로그인이 필요합니다." }, 401);

    const { image, mimeType, filename } = await req.json();
    if (!image || typeof image !== "string") return json({ error: "영수증 파일이 없습니다." }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI 설정이 없습니다." }, 500);

    const filePart = mimeType === "application/pdf"
      ? { type: "input_file", filename: filename || "receipt.pdf", file_data: `data:application/pdf;base64,${image}` }
      : { type: "input_image", image_url: `data:${mimeType || "image/jpeg"};base64,${image}` };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: "receipt", strict: true, schema } },
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "이 영수증(또는 지출 증빙)에서 구매 품목별 이름과 금액(원, 정수)을 읽어 지출결의서 내역으로 정리해줘. 품목이 안 보이면 상호명과 합계 금액 1줄로. 날짜와 적절한 분류, 짧은 한국어 제목도 추정해줘." },
            filePart,
          ],
        }],
      }),
    });

    if (!res.ok || !res.body) {
      const t = await res.text();
      console.error("gateway error", res.status, t);
      if (res.status === 429) return json({ error: "요청이 많아요. 잠시 후 다시 시도해주세요." }, 429);
      if (res.status === 402) return json({ error: "AI 사용 크레딧이 부족합니다." }, 402);
      return json({ error: "영수증을 읽지 못했어요. 직접 입력해주세요." }, res.status >= 500 ? 502 : res.status);
    }

    // Read SSE stream and collect output text
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta") out += ev.delta;
          if (ev.type === "response.failed" || ev.type === "error") console.error("stream error", d);
        } catch { /* ignore */ }
      }
    }
    if (!out.trim()) return json({ error: "영수증을 읽지 못했어요. 직접 입력해주세요." }, 422);
    return json(JSON.parse(out));
  } catch (e) {
    console.error(e);
    return json({ error: "영수증을 읽지 못했어요. 직접 입력해주세요." }, 500);
  }
});
