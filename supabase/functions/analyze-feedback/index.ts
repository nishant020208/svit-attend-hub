import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { feedback } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!feedback || feedback.length === 0) {
      return new Response(JSON.stringify({ analysis: "No pending feedback to analyze." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const feedbackText = feedback.map((f: any, i: number) =>
      `${i + 1}. [${f.category}] ${f.subject}: ${f.message}`
    ).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a feedback analyzer for SVIT college. Analyze student feedback and provide:
1. Group similar complaints together
2. Highlight the most critical/urgent issues
3. Identify recurring patterns
4. Suggest priority levels (High/Medium/Low) for each group
5. Provide actionable recommendations

Format your response in plain text with clear sections. Be concise and actionable.`
          },
          { role: "user", content: `Analyze these ${feedback.length} student feedback entries:\n\n${feedbackText}` }
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Could not analyze feedback.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Analyze feedback error:", error);
    const msg = error instanceof Error ? error.message : "An error occurred";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
