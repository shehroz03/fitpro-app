// ════════════════════════════════════════════════════════════════════════════
//  FitCore — AI Coach  (Supabase Edge Function)
//  Two modes:
//    mode = 'report' → returns structured JSON wellness report
//    mode = 'chat'   → returns plain text coaching response
//
//  Model: gpt-4o  (same OpenAI key as analyze-food)
//
//  DEPLOY:
//    supabase secrets set OPENAI_API_KEY=sk-....your-key....
//    supabase functions deploy ai-coach
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

// ── helpers ──────────────────────────────────────────────────────────────────
type AppData = Record<string, unknown>;
type NumDict  = Record<string, number>;

function buildDataContext(appData: AppData): string {
  const p     = (appData?.profile        as Record<string, unknown>) || {};
  const n     = (appData?.todayNutrition as Record<string, unknown>) || {};
  const d     = (appData?.dashboard      as Record<string, unknown>) || {};
  const goals = ((appData?.goals as Record<string, unknown>[]) || []).slice(0, 5);
  const sleep = ((appData?.recentSleep as Record<string, unknown>[]) || []).slice(0, 3);

  const consumed    = (n?.consumed    as NumDict) || {};
  const targets     = (n?.targets     as NumDict) || {};
  const calConsumed = consumed.calories  || 0;
  const calTarget   = targets.calories   || 2200;
  const proteinG    = consumed.protein_g || 0;
  const carbsG      = consumed.carbs_g   || 0;
  const fatG        = consumed.fat_g     || 0;
  const calPct      = calTarget > 0 ? Math.round((calConsumed / calTarget) * 100) : 0;

  const ws             = (d?.workout_stats    as NumDict) || {};
  const streak         = (d?.streak           as NumDict)?.current_streak || 0;
  const weeklyActivity = (d?.weekly_activity  as Record<string, unknown>[]) || [];
  const todayAct       = (weeklyActivity[weeklyActivity.length - 1] as NumDict) || {};

  const lastSleep  = sleep[0] || ({} as Record<string, unknown>);
  const sleepMin   = (lastSleep.duration_min as number) || 0;
  const sleepDur   = sleepMin
    ? `${Math.floor(sleepMin / 60)}h ${sleepMin % 60}m`
    : "Not logged";
  const sleepScore = lastSleep.quality_score ?? "Not logged";

  const goalsSummary = goals.length > 0
    ? goals.map(g => {
        const tv  = (g.target_value  as number) || 0;
        const cv  = (g.current_value as number) || 0;
        const pct = tv > 0 ? `${Math.min((cv / tv) * 100, 100).toFixed(0)}%` : "in progress";
        return `  • ${g.title} (${g.type}): ${pct} — ${cv}/${tv || "?"} ${g.unit || ""}`;
      }).join("\n")
    : "  • No active goals set";

  const weekSummary = weeklyActivity
    .map(d => `  • ${d.day_name || d.date}: ${(d as NumDict).count || 0} workout(s), ${(d as NumDict).calories || 0} kcal`)
    .join("\n") || "  No weekly data";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return `TODAY: ${today}

USER PROFILE:
  Name: ${p.name || "User"} | Age: ${p.age || "?"} | Gender: ${p.gender || "?"}
  Height: ${p.height_cm || "?"}cm | Weight: ${p.weight_kg || "?"}kg | BMI: ${p.bmi || "?"}
  Fitness Level: ${p.fitness_level || "beginner"}

NUTRITION TODAY:
  Calories: ${calConsumed} / ${calTarget} kcal (${calPct}% of target)
  Protein: ${proteinG}g (target ${targets.protein_g || "?"}g)
  Carbs: ${carbsG}g (target ${targets.carbs_g || "?"}g)
  Fat: ${fatG}g (target ${targets.fat_g || "?"}g)

WORKOUT TODAY:
  Workouts logged: ${todayAct.count || 0}
  Calories burned today: ${todayAct.calories || 0} kcal
  Current streak: ${streak} days
  Total all-time: ${ws.total_workouts || 0} workouts | ${ws.total_calories || 0} kcal | ${ws.total_minutes || 0} min

SLEEP LAST NIGHT:
  Duration: ${sleepDur} | Quality Score: ${sleepScore}/100
${(lastSleep.notes as string) ? `  Notes: ${lastSleep.notes}` : ""}

ACTIVE GOALS:
${goalsSummary}

7-DAY ACTIVITY:
${weekSummary}`;
}

// ── Report mode system prompt ─────────────────────────────────────────────────
function buildReportSystemPrompt(appData: AppData): string {
  return `You are FitCore AI Coach — an expert personal trainer and nutritionist. You MUST analyze the user's real fitness data and respond ONLY with a valid JSON object. No markdown, no explanation, no code fences — pure JSON only.

${buildDataContext(appData)}

SCORING RULES:
- nutrition: 100 if calories within ±5% of target AND macros balanced. Deduct 20 for each 15% deviation. Min 0.
- workout: 100 if 1+ workouts logged today AND streak ≥ 3. 60 if 1 workout no streak. 30 if no workout but streak > 0. 10 if no workout no streak.
- sleep: Based on quality_score (use it directly if available). If not logged = 40.
- goals: Average of individual goal completion percentages. If no goals = 50.
- overall_score: Weighted average: nutrition 30% + workout 35% + sleep 20% + goals 15%.

REQUIRED JSON FORMAT (respond with ONLY this, no other text):
{
  "overall_score": <integer 0-100>,
  "nutrition": {
    "score": <integer 0-100>,
    "status": "<excellent|good|fair|poor>",
    "summary": "<one concise sentence about nutrition today using actual numbers>",
    "tip": "<one specific actionable nutrition tip for tomorrow>"
  },
  "workout": {
    "score": <integer 0-100>,
    "status": "<excellent|good|fair|poor>",
    "summary": "<one concise sentence about workout activity using actual data>",
    "tip": "<one specific actionable workout tip for tomorrow>"
  },
  "sleep": {
    "score": <integer 0-100>,
    "status": "<excellent|good|fair|poor>",
    "summary": "<one concise sentence about sleep quality>",
    "tip": "<one specific actionable sleep improvement tip>"
  },
  "goals": {
    "score": <integer 0-100>,
    "status": "<excellent|good|fair|poor>",
    "summary": "<one concise sentence about goal progress>",
    "tip": "<one specific tip to accelerate goal progress>"
  },
  "coach_message": "<2-3 warm, personalized motivational sentences referencing the user's actual data and name>",
  "next_steps": [
    "<specific action #1 for tomorrow — include time/quantity/amount>",
    "<specific action #2 for tomorrow>",
    "<specific action #3 for tomorrow>"
  ]
}`;
}

// ── Chat mode system prompt ───────────────────────────────────────────────────
function buildChatSystemPrompt(appData: AppData): string {
  return `You are FitCore AI Coach — a professional personal trainer and nutritionist embedded in the FitCore fitness app. You have the user's complete real-time fitness data and give specific, personalized, actionable advice.

${buildDataContext(appData)}

GUIDELINES:
- Always reference actual numbers from the data. Never invent numbers.
- Be warm, direct, and motivating — like a knowledgeable friend who is also an expert.
- If data is missing, acknowledge it and give general evidence-based advice.
- For plans: be specific — times, quantities, sets/reps, durations.
- Keep responses under 350 words unless creating a detailed multi-day plan.
- Use bullet points and clear sections for readability.
- Always end with 1-2 clear immediate action items.
- Do not repeat the user's question back to them.`;
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const OPENAI_API_KEY =
      Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY not set" }, 500);
    }

    const body = await req.json();
    const { question, appData = {}, mode = "chat" } = body as {
      question: string;
      appData:  AppData;
      mode:     "report" | "chat";
    };

    if (!question) return json({ error: "question is required" }, 400);

    const isReport     = mode === "report";
    const systemPrompt = isReport
      ? buildReportSystemPrompt(appData)
      : buildChatSystemPrompt(appData);

    // 25-second timeout — Supabase edge functions time out at 30s
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 25000);

    let aiResp: Response;
    try {
      aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model:       "gpt-4o",
          max_tokens:  isReport ? 1024 : 2048,
          temperature: 0.4,
          response_format: isReport ? { type: "json_object" } : undefined,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: question },
          ],
        }),
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const isTimeout = (fetchErr as Error)?.name === "AbortError";
      return json({ error: isTimeout
        ? "AI Coach timed out (>25s). Please try again."
        : `Network error: ${(fetchErr as Error)?.message}`
      }, 504);
    }
    clearTimeout(timeoutId);

    if (aiResp.status === 429) {
      return json({ error: "AI is busy right now (rate limit). Please wait a moment and try again." }, 429);
    }
    if (aiResp.status === 401) {
      return json({ error: "Invalid OPENAI_API_KEY. Check your Supabase secret." }, 401);
    }
    if (!aiResp.ok) {
      const errTxt = await aiResp.text();
      return json({ error: `OpenAI error ${aiResp.status}: ${errTxt}` }, 502);
    }

    const aiJson  = await aiResp.json();
    const rawText = (aiJson?.choices?.[0]?.message?.content ?? "").trim();

    if (!rawText) return json({ error: "Empty response from AI" }, 500);

    // Report mode: parse JSON and return structured object
    if (isReport) {
      try {
        const cleaned = rawText.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();
        const report  = JSON.parse(cleaned);
        return json({ report });
      } catch {
        return json({
          error: `AI returned invalid JSON. Raw: ${rawText.slice(0, 300)}`,
        }, 500);
      }
    }

    // Chat mode: return plain text
    return json({ response: rawText });

  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
