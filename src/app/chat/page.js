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
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0 && !!activeSession, [
    input,
    activeSession,
  ]);

  useEffect(() => {
    setIsMounted(true);
    (async () => {
      try {
        const { session } = await fetchJSON("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Career Counseling Chat" }),
        });
        setActiveSession(session);
        setSessions([session]);
        setMessages([
          {
            id: `assistant-greeting-${Date.now()}`,
            session_id: session.id,
            role: "assistant",
            content: "Hello, how are you doing? How can I help you with your career guidence",
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Removed effect that cleared messages on activeSession change

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function onNewSession() {
    const title = "Career Counseling Chat";
    const { session } = await fetchJSON("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setSessions([session]); // Clear all previous sessions
    setActiveSession(session);
    setMessages([
      {
        id: `assistant-greeting-${Date.now()}`,
        session_id: session.id,
        role: "assistant",
        content: "How can I help you with career guidance today?",
        created_at: new Date().toISOString(),
      },
    ]); // Clear all previous messages
    setInput("");
    setLoading(false);
    setStreamingText("");
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

      // Do not refetch from server; keep current view minimal
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex bg-[var(--background)] text-[var(--foreground)]">
      {/* Hide sessions UI */}
      <aside className="hidden" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
      </aside>
      <main className="flex-1 flex flex-col min-h-dvh">
        <header className="p-4 border-b flex items-center justify-between gap-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="font-semibold">
            {activeSession ? activeSession.title : "Preparing session..."}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onNewSession}
              className="text-sm border rounded px-2 py-1 hover:bg-[var(--muted)]"
            >
              New
            </button>
          </div>
        </header>
        <section className="flex-1 overflow-y-auto p-4 space-y-3 pb-24" style={{ background: "var(--background)" }}>
          {!activeSession && (
            <div className="text-neutral-500">Preparing a new session…</div>
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
        <footer className="p-4 border-t fixed bottom-0 left-0 right-0 z-10" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
          <div className="mx-auto w-full max-w-screen-xl">
            <div className="flex gap-2 w-full items-end px-4 md:px-0">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeSession ? "Type your message..." : "Preparing session..."}
                className="flex-1 min-w-0 border rounded px-3 py-2"
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
          </div>
        </footer>
      </main>
    </div>
  );
}


