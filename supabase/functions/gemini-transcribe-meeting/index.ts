import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const getAudioFormat = (fileName = "", mimeType = "") => {
  const source = `${mimeType} ${fileName}`.toLowerCase();
  if (source.includes("wav")) return "wav";
  if (source.includes("mp3") || source.includes("mpeg")) return "mp3";
  if (source.includes("m4a")) return "m4a";
  if (source.includes("mp4")) return "mp4";
  if (source.includes("ogg")) return "ogg";
  return "webm";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioUrl, fileName, mimeType, prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!audioUrl || typeof audioUrl !== "string") {
      return new Response(JSON.stringify({ error: "녹음 파일 URL이 필요합니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return new Response(JSON.stringify({ error: "녹음 파일을 불러올 수 없습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBytes = new Uint8Array(await audioResponse.arrayBuffer());
    if (audioBytes.byteLength < 1024) {
      return new Response(JSON.stringify({ error: "녹음 파일이 너무 짧습니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: "당신은 한국어 비즈니스 회의 녹취 전문가입니다. 오디오를 들은 그대로 자연스러운 한국어 회의 녹취록으로 전사하세요. 설명 없이 녹취 텍스트만 반환하세요.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt || `다음 회의 녹음 파일을 한국어 회의록 분석에 적합한 텍스트로 전사해주세요.${fileName ? ` 파일명: ${fileName}` : ""}` },
              { type: "input_audio", input_audio: { data: toBase64(audioBytes), format: getAudioFormat(fileName, mimeType || audioResponse.headers.get("Content-Type") || "") } },
            ],
          },
        ],
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
      console.error("Gemini transcription error:", response.status, t);
      return new Response(JSON.stringify({ error: "Gemini 음성 인식 중 오류가 발생했습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const transcript = data.choices?.[0]?.message?.content?.trim() || "";
    if (!transcript || transcript.length < 10) {
      console.error("Gemini response without transcript:", data);
      return new Response(JSON.stringify({ error: "Gemini 응답에서 녹취록을 찾을 수 없습니다." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gemini-transcribe-meeting error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});