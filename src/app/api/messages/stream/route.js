import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";

function messagePayload(baseMessages) {
  const defaultSystemPrompt =
    "You are a helpful, empathetic career counselor. Provide concrete, actionable advice, ask clarifying questions, and keep responses concise and structured.";
  const hasSystem = baseMessages[0]?.role === "system";
  const withSystem = hasSystem
    ? baseMessages
    : [{ role: "system", content: defaultSystemPrompt }, ...baseMessages];
  return withSystem.map((m) => ({ role: m.role, content: m.content }));
}

export async function POST(req) {
  const cohereKey = process.env.COHERE_API_KEY || "vdcFzipj6WmsuMir75KhPiymKYKuBQa9Gh3HvUnL";
  if (!cohereKey) {
    return new NextResponse("Missing COHERE_API_KEY", { status: 500 });
  }
  
  const body = await req.json();
  const { sessionId, content, systemPrompt } = body ?? {};
  if (!sessionId || !content) {
    return NextResponse.json(
      { error: "sessionId and content are required" },
      { status: 400 }
    );
  }

  // Insert user message first (only if Supabase is configured)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const { error: insertUserErr } = await supabase
      .from("messages")
      .insert({ session_id: sessionId, role: "user", content });
    if (insertUserErr) {
      return NextResponse.json({ error: insertUserErr.message }, { status: 500 });
    }
  }

  // Build minimal context: only system + current user message (no prior history)
  const history = [];
  if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim().length > 0) {
    history.push({ role: "system", content: systemPrompt.trim() });
  }

  // Create a streaming response (single-chunk using Cohere)
  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        let fullText = "";
        try {
          // Map to Cohere format
          let preamble = "You are a helpful, empathetic career counselor. Provide concrete, actionable advice, ask clarifying questions, and keep responses concise and structured.";
          for (const m of history) {
            if (m.role === "system") {
              preamble = m.content || preamble;
            }
          }

          const res = await fetch("https://api.cohere.ai/v1/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cohereKey}`,
            },
            body: JSON.stringify({
              model: "command-r",
              message: content,
              chat_history: [], // no previous messages
              preamble,
              temperature: 0.4,
            }),
            signal: AbortSignal.timeout(60000),
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || res.statusText);
          }

          const data = await res.json();
          fullText = (data?.text || "").trim();
          if (fullText.length === 0) throw new Error("Empty response from Cohere");

          // Send as one chunk
          controller.enqueue(new TextEncoder().encode(fullText));

          // Persist assistant message (only if Supabase is configured)
          if (fullText.trim().length > 0 && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            await supabase
              .from("messages")
              .insert({ session_id: sessionId, role: "assistant", content: fullText });
          }

          controller.close();
        } catch (e) {
          const msg = typeof e?.message === "string" ? e.message : "Stream error";
          controller.enqueue(new TextEncoder().encode(`[stream-error] ${msg}`));
          controller.close();
        }
      })();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}


