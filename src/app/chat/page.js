"use client";

import { useEffect, useMemo, useRef, useState } from "react";

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = "Request failed";
    try {
      const data = await res.json();
      if (data && typeof data.error === "string") message = data.error;
    } catch {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch {}
    }
    throw new Error(message);
  }
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export default function ChatPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0 && !!activeSession, [
    input,
    activeSession,
  ]);

  useEffect(() => {
    // Ensure locale-sensitive rendering only happens on the client after mount
    setIsMounted(true);
    fetchJSON("/api/sessions").then((data) => setSessions(data.sessions));
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    fetchJSON(`/api/messages?sessionId=${activeSession.id}`).then((data) =>
      setMessages(data.messages)
    );
  }, [activeSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onNewSession() {
    const title = prompt("Session title", "Career Counseling Chat");
    const { session } = await fetchJSON("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setSessions((s) => [session, ...s]);
    setActiveSession(session);
    setMessages([]);
  }

  async function onSend() {
    if (!canSend) return;
    setLoading(true);
    try {
      const streamRes = await fetch("/api/messages/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          content: input,
          systemPrompt: customSystemPrompt,
        }),
      });
      if (!streamRes.ok || !streamRes.body) {
        let errMsg = "Streaming response failed";
        try {
          const text = await streamRes.text();
          if (text) errMsg = text;
        } catch {}
        throw new Error(errMsg);
      }

      const optimisticUser = {
        id: `local-${Date.now()}`,
        session_id: activeSession.id,
        role: "user",
        content: input,
        created_at: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimisticUser]);
      setInput("");

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder("utf-8");
      setStreamingText("");
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setStreamingText((t) => t + chunk);
      }

      const refetched = await fetchJSON(`/api/messages?sessionId=${activeSession.id}`);
      setMessages(refetched.messages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex bg-[var(--background)] text-[var(--foreground)]">
      <aside className="w-64 border-r p-4 hidden md:block" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Sessions</h2>
          <button
            onClick={onNewSession}
            className="text-sm border rounded px-2 py-1 hover:bg-[var(--muted)]"
          >
            New
          </button>
        </div>
        <ul className="space-y-1">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                className={`text-left w-full px-2 py-1 rounded ${
                  activeSession?.id === s.id ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"
                }`}
                onClick={() => setActiveSession(s)}
              >
                <div className="text-sm font-medium truncate">{s.title}</div>
                <div className="text-xs text-neutral-500" suppressHydrationWarning>
                  {isMounted ? new Date(s.created_at).toLocaleString() : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="font-semibold">
            {activeSession ? activeSession.title : "No session selected"}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={customSystemPrompt}
              onChange={(e) => setCustomSystemPrompt(e.target.value)}
              placeholder="Optional: custom system prompt"
              className="hidden md:block border rounded px-2 py-1 w-[320px]"
            />
            <button
              onClick={onNewSession}
              className="text-sm border rounded px-2 py-1 hover:bg-[var(--muted)] md:hidden"
            >
              New
            </button>
          </div>
        </header>
        <section className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "var(--background)" }}>
          {!activeSession && (
            <div className="text-neutral-500">Create or select a session to start.</div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="max-w-[80ch]">
              <div className="text-xs text-neutral-500 mb-1">
                {m.role === "user" ? "You" : "Assistant"}
              </div>
              <div
                className={`whitespace-pre-wrap rounded p-3 ${
                  m.role === "user"
                    ? "bg-blue-50 border border-blue-100"
                    : "bg-[var(--muted)] border"
                }`}
                style={{ borderColor: m.role === "user" ? "#bfdbfe" : "var(--border)" }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {streamingText && (
            <div className="max-w-[80ch]">
              <div className="text-xs text-neutral-500 mb-1">Assistant</div>
              <div className="whitespace-pre-wrap rounded p-3 bg-[var(--muted)] border" style={{ borderColor: "var(--border)" }}>
                {streamingText}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </section>
        <footer className="p-4 border-t" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeSession ? "Type your message..." : "Create/select a session first"}
              className="flex-1 border rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <button
              disabled={!canSend || loading}
              onClick={onSend}
              className="border rounded px-4 py-2 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)", borderColor: "var(--accent)" }}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}


