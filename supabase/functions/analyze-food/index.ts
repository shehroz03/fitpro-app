// ════════════════════════════════════════════════════════════════════════════
//  FitCore — AI Food Analyzer  (Supabase Edge Function)
//  mode "single"   → identify ONE item (circled region or main dish)
//  mode "scan_all" → detect ALL items on the plate in one call
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not set" }, 500);

    const { imageBase64, region, mimeType, mode = "single" } = await req.json();
    if (!imageBase64) return json({ error: "imageBase64 is required" }, 400);

    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    // ── PROMPT SELECTION ──────────────────────────────────────────────────────
    let prompt: string;

    // Shared guidance so the model names dishes specifically (esp. South Asian / desi food)
    const CUISINE_GUIDE =
      `IMPORTANT — be SPECIFIC with food names. This app is used mainly in Pakistan/India, ` +
      `so the food is often South Asian / desi cuisine. Identify the exact dish, NOT a generic ` +
      `category. Never answer with vague words like "meat", "curry", "bread", "rice dish" or ` +
      `"grilled food" if a more specific name fits.\n` +
      `Use visual cues to tell dishes apart:\n` +
      `- Chicken tikka: red/orange marinated bone-in or boneless chicken chunks, char-grilled.\n` +
      `- Malai boti / malai tikka: pale/cream-colored, mild, creamy marinated boneless chicken.\n` +
      `- Seekh kabab: minced-meat cylinders on skewers.\n` +
      `- Chapli kabab: flat round minced patties. Shami kabab: small round patties.\n` +
      `- Biryani vs pulao vs plain rice; naan vs roti vs paratha; daal, haleem, nihari, karahi, qeema.\n` +
      `If meat is on skewers and looks like chunks of marinated chicken, prefer "chicken tikka" or ` +
      `"malai boti" over generic "meat". State the protein type (chicken/beef/mutton) when visible.\n\n`;

    if (mode === "scan_all") {
      prompt =
        `You are an expert nutritionist and food-portion estimator with deep knowledge of ` +
        `Pakistani, Indian and Middle-Eastern cuisine.\n\n` +
        CUISINE_GUIDE +
        `Carefully examine this image and identify EVERY distinct food item visible.\n` +
        `Estimate each item's portion size using visual cues (plate size, utensils, typical serving sizes).\n\n` +
        `Respond with STRICT JSON only, no markdown, no commentary:\n` +
        `{\n` +
        `  "items": [\n` +
        `    {\n` +
        `      "name": "short food name",\n` +
        `      "quantity": "estimated portion e.g. 1 cup (~200g)",\n` +
        `      "serving_size_g": number,\n` +
        `      "calories": number,\n` +
        `      "protein_g": number,\n` +
        `      "carbs_g": number,\n` +
        `      "fat_g": number\n` +
        `    }\n` +
        `  ],\n` +
        `  "total_calories": number,\n` +
        `  "confidence": number,\n` +
        `  "note": "one brief tip about this meal"\n` +
        `}`;
    } else {
      let regionHint =
        "The user did not circle a specific item — analyse the single main dish in the photo.";
      if (region && typeof region.x === "number") {
        const pct = (v: number) => Math.round(v * 100);
        regionHint =
          `The user circled ONE specific food item. The circled area spans roughly ` +
          `${pct(region.x)}%–${pct(region.x + region.w)}% from the left and ` +
          `${pct(region.y)}%–${pct(region.y + region.h)}% from the top of the image. ` +
          `Identify and analyse ONLY the food inside that circled region — ignore everything else.`;
      }

      prompt =
        `You are an expert nutritionist and food-portion estimator with deep knowledge of ` +
        `Pakistani, Indian and Middle-Eastern cuisine. ${regionHint}\n\n` +
        CUISINE_GUIDE +
        `Estimate the visible portion as accurately as possible (aim for 90-95% accuracy).\n\n` +
        `Respond with STRICT JSON only, no markdown, no commentary:\n` +
        `{\n` +
        `  "name": "short food name",\n` +
        `  "quantity": "estimated portion, e.g. 1 bowl (~250g)",\n` +
        `  "serving_size_g": number,\n` +
        `  "calories": number,\n` +
        `  "protein_g": number,\n` +
        `  "carbs_g": number,\n` +
        `  "fat_g": number,\n` +
        `  "confidence": number (0-100),\n` +
        `  "note": "one short tip or note"\n` +
        `}`;
    }

    // ── OPENAI CALL ───────────────────────────────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 28000);

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
          model: "gpt-4.1",
          max_tokens: mode === "scan_all" ? 1200 : 500,
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
      return json({
        error: isTimeout ? "Analysis timed out. Try again." : `Network error: ${(fetchErr as Error)?.message}`,
      }, 504);
    }
    clearTimeout(timeoutId);

    if (aiResp.status === 429) return json({ error: "AI is busy. Please wait and try again." }, 429);
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
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const num = (v: unknown, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.round(n) : d;
    };

    // ── RESPONSE ──────────────────────────────────────────────────────────────
    if (mode === "scan_all") {
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
      const items = rawItems.map((it: Record<string, unknown>) => ({
        name: String(it.name || "Unknown food"),
        quantity: String(it.quantity || ""),
        serving_size_g: num(it.serving_size_g, 100),
        calories: num(it.calories),
        protein_g: num(it.protein_g),
        carbs_g: num(it.carbs_g),
        fat_g: num(it.fat_g),
      }));
      const total = num(parsed.total_calories) || items.reduce((s: number, i: {calories:number}) => s + i.calories, 0);

      return json({
        data: {
          mode: "scan_all",
          items,
          total_calories: total,
          confidence: num(parsed.confidence, 85),
          note: String(parsed.note || ""),
        },
        message: `Found ${items.length} item${items.length !== 1 ? "s" : ""}`,
      });
    }

    return json({
      data: {
        name: String(parsed.name || "Unknown food"),
        quantity: String(parsed.quantity || ""),
        serving_size_g: num(parsed.serving_size_g, 100),
        calories: num(parsed.calories),
        protein_g: num(parsed.protein_g),
        carbs_g: num(parsed.carbs_g),
        fat_g: num(parsed.fat_g),
        confidence: num(parsed.confidence, 85),
        note: String(parsed.note || ""),
      },
      message: "AI analysis complete",
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
