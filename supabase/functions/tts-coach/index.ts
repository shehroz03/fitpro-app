// ════════════════════════════════════════════════════════════════════════════
//  FitCore — TTS Coach  (Supabase Edge Function)
//  Converts text → speech using OpenAI TTS
//  voice: nova (female) | onyx (male)
//
//  DEPLOY:
//    supabase functions deploy tts-coach --project-ref nlzuqzkxtmqabmwkggpy
// ════════════════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not set" }, 500);

    const { text, voice = "nova" } = await req.json() as { text: string; voice?: string };
    if (!text?.trim()) return json({ error: "text is required" }, 400);

    const allowed = ["nova", "shimmer", "alloy", "echo", "fable", "onyx"];
    const safeVoice = allowed.includes(voice) ? voice : "nova";

    const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text.slice(0, 500),
        voice: safeVoice,
        response_format: "mp3",
        speed: 1.05,
      }),
    });

    if (!ttsResp.ok) {
      const err = await ttsResp.text();
      return json({ error: `OpenAI TTS error: ${err}` }, 502);
    }

    const buffer = await ttsResp.arrayBuffer();
    const bytes  = new Uint8Array(buffer);
    let binary   = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    return json({ audio: base64, voice: safeVoice });

  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
