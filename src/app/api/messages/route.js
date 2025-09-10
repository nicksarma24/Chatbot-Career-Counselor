import { NextResponse } from "next/server";

// Ensure Node.js runtime (not edge) so env vars and long fetch work reliably
export const runtime = "nodejs";
import { supabase } from "@/lib/supabaseClient";

async function getAiResponse(messages) { 
  const cohereKey = process.env.COHERE_API_KEY; 
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userContent = lastUser?.content ?? "";

  const defaultSystemPrompt =
    "You are a helpful, empathetic career counselor. Provide concrete, actionable advice, ask clarifying questions, and keep responses concise and structured.";

  const messagePayload = (baseMessages) => {
    // Ensure there is at least a system prompt at the beginning
    const hasSystem = baseMessages[0]?.role === "system";
    const withSystem = hasSystem
      ? baseMessages
      : [{ role: "system", content: defaultSystemPrompt }, ...baseMessages];
    return withSystem.map((m) => ({ role: m.role, content: m.content }));
  };

  // Use Cohere if available
  if (cohereKey) {
    try {
      // Map history to Cohere format
      let preamble = defaultSystemPrompt;
      const chatHistory = [];
      for (const m of messages) {
        if (m.role === "system" && preamble === defaultSystemPrompt) {
          preamble = m.content || defaultSystemPrompt;
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
          message: userContent,
          chat_history: chatHistory,
          preamble,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(err?.message || err?.error?.message || res.statusText);
      }

      const data = await res.json();
      const text = (data?.text || "").trim();
      if (text) return text;
      throw new Error("Empty response from Cohere");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Cohere error:", e?.message || e);
      // Fall through to local
      return (
        "[AI fallback: Cohere error] I'm your career counselor. " +
        (userContent ? `\n\nYou said: ${userContent}` : "")
      );
    }
  }

  // Local fallback
  return (
    "[AI fallback: no provider configured] I'm your career counselor. " +
    (userContent ? `\n\nYou said: ${userContent}` : "")
  );
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("messages")
    .select("id, session_id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req) {
  const body = await req.json();
  const { sessionId, content, systemPrompt } = body ?? {};
  if (!sessionId || !content) {
    return NextResponse.json(
      { error: "sessionId and content are required" },
      { status: 400 }
    );
  }

  const userMessage = {
    session_id: sessionId,
    role: "user",
    content,
  };
  const { data: insertedUser, error: insertUserErr } = await supabase
    .from("messages")
    .insert(userMessage)
    .select("id, session_id, role, content, created_at")
    .single();
  if (insertUserErr)
    return NextResponse.json({ error: insertUserErr.message }, { status: 500 });

  const { data: allMessages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  // If a custom system prompt is provided, prepend it as a system message
  const history = [...(allMessages ?? [])];
  if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim().length > 0) {
    history.unshift({ role: "system", content: systemPrompt.trim() });
  }

  const aiText = await getAiResponse(history);

  const { data: insertedAi, error: insertAiErr } = await supabase
    .from("messages")
    .insert({ session_id: sessionId, role: "assistant", content: aiText })
    .select("id, session_id, role, content, created_at")
    .single();
  if (insertAiErr)
    return NextResponse.json({ error: insertAiErr.message }, { status: 500 });

  return NextResponse.json({ user: insertedUser, assistant: insertedAi });
}


