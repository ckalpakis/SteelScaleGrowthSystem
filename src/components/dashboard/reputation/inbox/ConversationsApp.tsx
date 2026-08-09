"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/components/ui";
import { SearchIcon, ChatIcon, SendIcon } from "@/components/dashboard/reputation/ui";
import {
  shortTime,
  type ConversationListItem,
  type ConversationMessage,
  type ConversationStatus,
} from "@/lib/reputation";
import {
  fetchMessages,
  sendReply,
  markConversationRead,
  setConversationStatus,
} from "@/app/dashboard/reputation/inbox/actions";

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export function ConversationsApp({ initialConversations }: { initialConversations: ConversationListItem[] }) {
  const [conversations, setConversations] = useState<ConversationListItem[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || (c.lastPreview ?? "").toLowerCase().includes(q);
  });

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Open a conversation: load its messages and clear the unread badge.
  async function openConversation(id: string) {
    setSelectedId(id);
    setError(null);
    setMessages([]);
    setLoadingMessages(true);
    const { messages: msgs, hasMore: more } = await fetchMessages(id);
    setMessages(msgs);
    setHasMore(more);
    setLoadingMessages(false);
    scrollToBottom();

    setConversations((list) => list.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    markConversationRead(id).catch(() => {});
  }

  // Infinite scroll: fetch older messages when the user scrolls to the top.
  async function onScroll() {
    const el = scrollRef.current;
    if (!el || loadingOlder || !hasMore || !selectedId || messages.length === 0) return;
    if (el.scrollTop > 48) return;

    setLoadingOlder(true);
    const prevHeight = el.scrollHeight;
    const { messages: older, hasMore: more } = await fetchMessages(selectedId, messages[0].createdAt);
    setMessages((cur) => [...older, ...cur]);
    setHasMore(more);
    setLoadingOlder(false);
    // Preserve the scroll position after prepending.
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
    });
  }

  async function send() {
    const text = reply.trim();
    if (!text || !selectedId || sending) return;
    setError(null);
    setSending(true);

    // Optimistic bubble.
    const tempId = `temp-${Date.now()}`;
    const optimistic: ConversationMessage = {
      id: tempId,
      direction: "outbound",
      body: text,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setReply("");
    scrollToBottom();

    const res = await sendReply(selectedId, text);
    setSending(false);

    if (!res.ok) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setReply(text);
      setError(res.error);
      return;
    }
    // Replace the optimistic bubble with the stored message + refresh the list row.
    setMessages((m) => m.map((x) => (x.id === tempId ? res.message : x)));
    setConversations((list) =>
      list.map((c) =>
        c.id === selectedId
          ? { ...c, lastPreview: text, lastMessageAt: res.message.createdAt, lastDirection: "outbound", unread: 0 }
          : c
      )
    );
  }

  async function changeStatus(status: ConversationStatus) {
    if (!selectedId) return;
    setConversations((list) => list.map((c) => (c.id === selectedId ? { ...c, status } : c)));
    setConversationStatus(selectedId, status).catch(() => {});
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[520px] overflow-hidden rounded-xl border border-[#ededec] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
      {/* Conversation list */}
      <aside
        className={cn(
          "flex w-full flex-col border-r border-[#f0f0ef] lg:w-[340px] lg:shrink-0",
          selectedId ? "hidden lg:flex" : "flex"
        )}
      >
        <div className="border-b border-[#f0f0ef] p-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]">
              <SearchIcon />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full rounded-md border border-[#e0e0de] bg-white py-2 pl-9 pr-3 text-sm text-[#37352f] placeholder-[#b9b9b7] focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[#9b9a97]">
              {conversations.length === 0 ? "No conversations yet." : "No matches."}
            </p>
          ) : (
            <ul className="divide-y divide-[#f0f0ef]">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => openConversation(c.id)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fafafa]",
                      selectedId === c.id && "bg-[#f4f6fb]"
                    )}
                  >
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm", c.unread > 0 ? "font-bold text-[#37352f]" : "font-semibold text-[#37352f]")}>
                          {c.name}
                        </span>
                        <span className="shrink-0 text-xs text-[#9b9a97]">{shortTime(c.lastMessageAt)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className={cn("truncate text-sm", c.unread > 0 ? "text-[#37352f]" : "text-[#787774]")}>
                          {c.lastDirection === "outbound" && <span className="text-[#9b9a97]">You: </span>}
                          {c.lastPreview ?? "No messages yet"}
                        </p>
                        {c.status !== "open" && (
                          <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-gray-500">
                            {c.status}
                          </span>
                        )}
                        {c.unread > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Message pane */}
      <section className={cn("min-w-0 flex-1 flex-col", selected ? "flex" : "hidden lg:flex")}>
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center">
            <div>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <ChatIcon />
              </span>
              <p className="mt-3 text-sm text-[#787774]">Select a conversation to view messages.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <header className="flex items-center gap-3 border-b border-[#f0f0ef] px-4 py-3">
              <button onClick={() => setSelectedId(null)} className="rounded-md p-1 text-[#787774] hover:bg-black/[0.04] lg:hidden" aria-label="Back">
                ‹
              </button>
              <Avatar name={selected.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#37352f]">{selected.name}</div>
                <div className="truncate text-xs text-[#9b9a97]">{selected.phone}</div>
              </div>
              <select
                value={selected.status}
                onChange={(e) => changeStatus(e.target.value as ConversationStatus)}
                className="rounded-md border border-[#e0e0de] bg-white px-2 py-1 text-xs font-medium text-[#5f5e5b] focus:border-brand/40 focus:outline-none"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </header>

            {/* Messages */}
            <div ref={scrollRef} onScroll={onScroll} className="flex-1 space-y-1 overflow-y-auto bg-[#fafafa] p-4">
              {loadingOlder && <p className="py-2 text-center text-xs text-[#9b9a97]">Loading earlier…</p>}
              {loadingMessages ? (
                <p className="py-10 text-center text-sm text-[#9b9a97]">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#9b9a97]">No messages yet. Say hello 👋</p>
              ) : (
                messages.map((m) => <Bubble key={m.id} message={m} />)
              )}
              {sending && <TypingIndicator />}
            </div>

            {/* Composer */}
            <div className="border-t border-[#f0f0ef] p-3">
              {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder={selected.status === "open" ? "Type a message…" : "Reopen to reply…"}
                  className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-[#e0e0de] bg-white px-3 py-2 text-sm text-[#37352f] placeholder-[#b9b9b7] focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
                <button
                  onClick={send}
                  disabled={sending || !reply.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
                  aria-label="Send"
                >
                  <SendIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- subcomponents
function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold uppercase text-brand">
      {name.charAt(0) || "?"}
    </span>
  );
}

function Bubble({ message }: { message: ConversationMessage }) {
  const out = message.direction === "outbound";
  return (
    <div className={cn("flex flex-col", out ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          out ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-[#ededec] bg-white text-[#37352f]"
        )}
      >
        {message.body}
      </div>
      <span className="mt-0.5 px-1 text-[11px] text-[#b9b9b7]">
        {timeFmt.format(new Date(message.createdAt))}
        {out && message.status === "failed" && <span className="ml-1 text-red-500">· failed</span>}
        {out && message.status === "queued" && <span className="ml-1">· sending…</span>}
      </span>
    </div>
  );
}

// Placeholder typing indicator (animated dots). Real presence isn't wired yet.
function TypingIndicator() {
  return (
    <div className="flex items-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-[#ededec] bg-white px-3 py-2.5">
        <Dot delay="0ms" />
        <Dot delay="150ms" />
        <Dot delay="300ms" />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c9c9c7]" style={{ animationDelay: delay }} />;
}
