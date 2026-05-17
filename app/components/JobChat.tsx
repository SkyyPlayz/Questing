"use client";

import { useState, useEffect, useRef } from "react";

type Sender = { id: string; name: string | null };
type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: Sender;
};
type Thread = {
  id: string;
  threadType: string;
  lastMessageAt: string | null;
  messages: Message[];
};

export default function JobChat({
  jobId,
  userId,
  isPoster,
}: {
  jobId: string;
  userId?: string;
  isPoster: boolean;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll threads every 10s
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function fetchThreads() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/chat/threads`);
        if (res.ok) {
          const data = await res.json();
          setThreads(data.threads);
          if (!activeThreadId && data.threads.length > 0) {
            setActiveThreadId(data.threads[0].id);
          }
        }
      } catch {
        setError("Failed to load chat");
      } finally {
        setLoading(false);
      }
    }

    fetchThreads();
    interval = setInterval(fetchThreads, 10000);
    return () => clearInterval(interval);
  }, [jobId, activeThreadId]);

  // Poll messages when thread is active
  useEffect(() => {
    if (!activeThreadId) return;

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/chat/${activeThreadId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch {
        setError("Failed to load messages");
      }
    }

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [jobId, activeThreadId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending || !activeThreadId) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(
        `/api/jobs/${jobId}/chat/${activeThreadId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newMessage }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
        // Refresh threads to update lastMessageAt
        const threadsRes = await fetch(`/api/jobs/${jobId}/chat/threads`);
        if (threadsRes.ok) {
          const threadsData = await threadsRes.json();
          setThreads(threadsData.threads);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send");
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const isAllowedToSend =
    activeThread?.threadType === "PUBLIC_QA" ||
    (activeThread?.threadType === "PRIVATE" && (isPoster || userId !== undefined));

  if (loading) {
    return (
      <div className="border-t pt-4 mt-4">
        <p className="text-gray-500 text-sm">Loading chat...</p>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="border-t pt-4 mt-4">
        <p className="text-gray-500 text-sm">No chat threads yet.</p>
      </div>
    );
  }

  return (
    <div className="border-t pt-4 mt-4">
      <h2 className="font-semibold mb-3">Job Chat</h2>

      {/* Thread tabs */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveThreadId(t.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              t.id === activeThreadId
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t.threadType === "PUBLIC_QA" ? "Public Q&A" : "Private Chat"}
            {t.messages.length > 0 && (
              <span className="ml-1 opacity-70">({t.messages.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="bg-gray-50 border rounded-lg p-4 mb-3 max-h-80 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">
            No messages yet. Start the conversation!
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.senderId === userId ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.senderId === userId
                      ? "bg-blue-100 text-blue-900"
                      : "bg-white border text-gray-800"
                  }`}
                >
                  {msg.senderId !== userId && (
                    <p className="text-xs font-semibold text-gray-500 mb-1">
                      {msg.sender.name || "Anonymous"}
                    </p>
                  )}
                  <p>{msg.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      {isAllowedToSend && activeThreadId && (
        <form onSubmit={handleSend} className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              activeThread?.threadType === "PUBLIC_QA"
                ? "Ask a public question..."
                : "Send a private message..."
            }
            className="flex-1 border rounded px-3 py-2 text-sm h-20 resize-none"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 self-end"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      )}
      {!isAllowedToSend && activeThreadId && (
        <p className="text-gray-400 text-sm mt-2">
          You don't have permission to send messages in this thread.
        </p>
      )}
    </div>
  );
}
