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
  const cohereKey = process.env.COHERE_API_KEY  || "vdcFzipj6WmsuMir75KhPiymKYKuBQa9Gh3HvUnL";
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

  // Insert user message first
  const { error: insertUserErr } = await supabase
    .from("messages")
    .insert({ session_id: sessionId, role: "user", content });
  if (insertUserErr) {
    return NextResponse.json({ error: insertUserErr.message }, { status: 500 });
  }

  // Build full history for context
  const { data: allMessages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const history = [...(allMessages ?? [])];
  if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim().length > 0) {
    history.unshift({ role: "system", content: systemPrompt.trim() });
  }

  // Create a streaming response (single-chunk using Cohere)
  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        let fullText = "";
        try {
          // Map to Cohere format
          let preamble = "You are a helpful, empathetic career counselor. Provide concrete, actionable advice, ask clarifying questions, and keep responses concise and structured.";
          const chatHistory = [];
          for (const m of history) {
            if (m.role === "system") {
              preamble = m.content || preamble;
              continue;
            }
            if (m.role === "user") chatHistory.push({ role: "USER", message: m.content });
            if (m.role === "assistant") chatHistory.push({ role: "CHATBOT", message: m.content });
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
              chat_history: chatHistory,
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

          // Persist assistant message
          if (fullText.trim().length > 0) {
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


