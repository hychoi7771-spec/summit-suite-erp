import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, members } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!transcript || transcript.trim().length < 10) {
      return new Response(JSON.stringify({ error: "회의 내용이 너무 짧습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memberList = Array.isArray(members) && members.length > 0
      ? `\n\n팀 멤버 목록 (이름으로 담당자 배정에 사용):\n${members.map((m: any) => `- ${m.name_kr} (${m.name})`).join('\n')}`
      : '';

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `당신은 한국어 회의록 분석 전문가입니다. 회의 녹취록을 분석하여 구조화된 회의록을 생성합니다.
액션 아이템을 도출할 때, 녹취록에서 언급된 담당자를 팀 멤버 목록에서 찾아 assignee_name에 정확한 한국어 이름(name_kr)을 입력하세요.
담당자가 명확하지 않으면 assignee_name을 빈 문자열로 두세요.
반드시 아래 JSON 도구를 사용하여 응답하세요.`,
          },
          {
            role: "user",
            content: `다음 회의 녹취록을 분석하여 회의록을 작성해주세요:${memberList}\n\n녹취록:\n${transcript}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_meeting_summary",
              description: "회의 녹취록을 분석하여 구조화된 회의록을 생성합니다.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "회의 제목 (간결하게)" },
                  goal: { type: "string", description: "회의 목표 요약" },
                  notes: { type: "string", description: "회의 내용 요약 (핵심 논의 사항, 줄바꿈으로 구분)" },
                  kpi_notes: { type: "string", description: "언급된 핵심 지표/KPI (없으면 빈 문자열)" },
                  achievement_comment: { type: "string", description: "성과 또는 이슈 요약" },
                  action_items: {
                    type: "array",
                    description: "도출된 액션 아이템 목록",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "액션 아이템 제목" },
                        priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "우선순위" },
                        assignee_name: { type: "string", description: "담당자 한국어 이름 (팀 멤버 목록에서 매칭, 없으면 빈 문자열)" },
                      },
                      required: ["title", "priority", "assignee_name"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "goal", "notes", "kpi_notes", "achievement_comment", "action_items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_meeting_summary" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 크레딧이 부족합니다." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 분석 중 오류가 발생했습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI 응답을 파싱할 수 없습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-meeting error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
