import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const extractTranscript = (payload: any): string => {
  const candidates = [
    payload?.data?.text,
    payload?.data?.transcript,
    payload?.data?.transcription,
    payload?.data?.result?.text,
    payload?.data?.result?.transcript,
    payload?.data?.results?.[0]?.text,
    payload?.text,
    payload?.transcript,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }

  const words = payload?.data?.words || payload?.words;
  if (Array.isArray(words)) {
    const text = words.map((word: any) => word?.text || word?.word || "").join(" ").trim();
    if (text) return text;
  }

  return "";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioUrl, fileName, prompt } = await req.json();
    const GENSPARK_API_KEY = Deno.env.get("GENSPARK_API_KEY");
    if (!GENSPARK_API_KEY) throw new Error("GENSPARK_API_KEY is not configured");
    if (!audioUrl || typeof audioUrl !== "string") {
      return new Response(JSON.stringify({ error: "녹음 파일 URL이 필요합니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://www.genspark.ai/api/tool_cli/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": GENSPARK_API_KEY,
      },
      body: JSON.stringify({
        audio_urls: [audioUrl],
        model: "whisper-1",
        prompt: prompt || `Korean business meeting transcription${fileName ? ` for ${fileName}` : ""}`,
      }),
    });

    const raw = await response.text();
    const lastJsonLine = raw.trim().split("\n").reverse().find((line) => line.trim().startsWith("{"));
    const payload = lastJsonLine ? JSON.parse(lastJsonLine) : JSON.parse(raw);

    if (!response.ok || payload?.status === "error") {
      console.error("Genspark transcription error:", response.status, payload);
      return new Response(JSON.stringify({ error: payload?.message || "Genspark 녹취 변환 중 오류가 발생했습니다." }), {
        status: response.ok ? 500 : response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcript = extractTranscript(payload);
    if (!transcript || transcript.length < 10) {
      console.error("Genspark response without transcript:", payload);
      return new Response(JSON.stringify({ error: "Genspark 응답에서 녹취록을 찾을 수 없습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ transcript, raw: payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("genspark-transcribe-meeting error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});