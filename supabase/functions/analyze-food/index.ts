// ════════════════════════════════════════════════════════════════════════════
//  FitCore — AI Food Analyzer  (Supabase Edge Function)
//  Calls OpenAI GPT-4o Vision to identify a food item, estimate its quantity,
//  calories and macros. The API key stays server-side (never shipped in the app).
//
//  DEPLOY:
//    1) supabase login
//    2) supabase link --project-ref nlzuqzkxtmqabmwkggpy
//    3) supabase secrets set OPENAI_API_KEY=sk-....your-key....
//    4) supabase functions deploy analyze-food
// ════════════════════════════════════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const OPENAI_API_KEY =
      Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY not set" }, 500);
    }

    const { imageBase64, region, mimeType } = await req.json();
    if (!imageBase64) return json({ error: "imageBase64 is required" }, 400);

    // Build a region hint so the model focuses on the circled item.
    let regionHint =
      "The user did not circle a specific item — analyse the single main dish in the photo.";
    if (region && typeof region.x === "number") {
      const pct = (v: number) => Math.round(v * 100);
      regionHint =
        `The user circled ONE specific food item. The circled area spans roughly ` +
        `${pct(region.x)}%–${pct(region.x + region.w)}% from the left and ` +
        `${pct(region.y)}%–${pct(region.y + region.h)}% from the top of the image. ` +
        `Identify and analyse ONLY the food inside that circled region — ignore everything else on the plate.`;
    }

    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    const prompt =
      `You are an expert nutritionist and food-portion estimator. ${regionHint}\n\n` +
      `Estimate the visible portion as accurately as possible (aim for 90-95% accuracy) by ` +
      `judging the portion size from visual cues (plate size, utensils, typical serving sizes).\n\n` +
      `Respond with STRICT JSON only, no markdown, no commentary, in exactly this shape:\n` +
      `{\n` +
      `  "name": "short food name",\n` +
      `  "quantity": "estimated portion, e.g. '1 bowl (~250g)'",\n` +
      `  "serving_size_g": number (estimated grams of the visible portion),\n` +
      `  "calories": number (kcal for that visible portion),\n` +
      `  "protein_g": number,\n` +
      `  "carbs_g": number,\n` +
      `  "fat_g": number,\n` +
      `  "confidence": number (0-100, how sure you are),\n` +
      `  "note": "one short tip or note"\n` +
      `}`;

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 25000);

    let aiResp: Response;
    try {
      aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 500,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
              ],
            },
          ],
        }),
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const isTimeout = (fetchErr as Error)?.name === "AbortError";
      return json({ error: isTimeout ? "Analysis timed out. Try again." : `Network error: ${(fetchErr as Error)?.message}` }, 504);
    }
    clearTimeout(timeoutId);

    if (aiResp.status === 429) {
      return json({ error: "AI is busy right now. Please wait a moment and try again." }, 429);
    }
    if (!aiResp.ok) {
      const errTxt = await aiResp.text();
      return json({ error: `OpenAI error: ${errTxt}` }, 502);
    }

    const aiJson = await aiResp.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback: pull the first {...} block out of the text.
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const num = (v: unknown, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.round(n) : d;
    };

    const result = {
      name: String(parsed.name || "Unknown food"),
      quantity: String(parsed.quantity || ""),
      serving_size_g: num(parsed.serving_size_g, 100),
      calories: num(parsed.calories),
      protein_g: num(parsed.protein_g),
      carbs_g: num(parsed.carbs_g),
      fat_g: num(parsed.fat_g),
      confidence: num(parsed.confidence, 85),
      note: String(parsed.note || ""),
    };

    return json({ data: result, message: "AI analysis complete" });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
