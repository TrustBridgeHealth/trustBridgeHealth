"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type MessageThread = {
  id: string;
  providerName: string;
  subject: string;
  lastMessagePreview: string;
  lastUpdated: string; // display string
  unreadCount: number;
};

type Message = {
  id: string;
  from: "PATIENT" | "PROVIDER";
  body: string;
  timestamp: string;
};

const mockThreads: MessageThread[] = [
  {
    id: "t1",
    providerName: "Dr. Roberts",
    subject: "Follow-up on lab results",
    lastMessagePreview: "Everything looks stable, let me know if...",
    lastUpdated: "2024-11-05 2:14 PM",
    unreadCount: 1,
  },
  {
    id: "t2",
    providerName: "Dr. Kim",
    subject: "Blood pressure check-in",
    lastMessagePreview: "Remember to track your readings twice a day.",
    lastUpdated: "2024-10-21 9:02 AM",
    unreadCount: 0,
  },
];

const mockMessagesByThread: Record<string, Message[]> = {
  t1: [
    {
      id: "m1",
      from: "PATIENT",
      body: "Hi Dr. Roberts, I saw my lab results and had a question.",
      timestamp: "2024-11-05 1:58 PM",
    },
    {
      id: "m2",
      from: "PROVIDER",
      body: "Everything looks stable, but keep an eye on your symptoms.",
      timestamp: "2024-11-05 2:14 PM",
    },
  ],
  t2: [
    {
      id: "m3",
      from: "PROVIDER",
      body: "Remember to track your blood pressure twice a day.",
      timestamp: "2024-10-21 9:02 AM",
    },
  ],
};

const MessagesSection: React.FC = () => {
  const [threads, setThreads] = React.useState<MessageThread[]>(mockThreads);
  const [selectedThreadId, setSelectedThreadId] = React.useState<string>("t1");
  const [messagesByThread, setMessagesByThread] =
    React.useState<Record<string, Message[]>>(mockMessagesByThread);
  const [search, setSearch] = React.useState("");
  const [draft, setDraft] = React.useState("");

  const filteredThreads = threads.filter((t) => {
    const needle = search.toLowerCase();
    return (
      t.providerName.toLowerCase().includes(needle) ||
      t.subject.toLowerCase().includes(needle)
    );
  });

  const selectedThread = threads.find((t) => t.id === selectedThreadId);
  const selectedMessages = messagesByThread[selectedThreadId] ?? [];

  function handleSelectThread(id: string) {
    setSelectedThreadId(id);
    // Mark as read
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, unreadCount: 0 } : t
      )
    );
  }

  function handleSend() {
    if (!draft.trim() || !selectedThread) return;

    const newMessage: Message = {
      id: `m-${Date.now()}`,
      from: "PATIENT",
      body: draft.trim(),
      timestamp: new Date().toLocaleString(),
    };

    setMessagesByThread((prev) => ({
      ...prev,
      [selectedThread.id]: [...(prev[selectedThread.id] ?? []), newMessage],
    }));

    setDraft("");

    // In a real app, this is where you'd POST to /api/messages
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Messages</h2>
          <p className="text-sm text-muted-foreground">
            Secure conversations with your care team.
          </p>
        </div>
        <Input
          placeholder="Search messages…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        {/* Thread list */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
            Conversations
          </div>
          <div className="max-h-80 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                No conversations found.
              </div>
            ) : (
              filteredThreads.map((t) => {
                const isActive = t.id === selectedThreadId;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectThread(t.id)}
                    className={`w-full text-left px-4 py-3 text-sm border-b last:border-b-0 hover:bg-slate-50 ${
                      isActive ? "bg-slate-100" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{t.providerName}</p>
                      {t.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-xs px-2 py-0.5">
                          {t.unreadCount} new
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.subject}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                      {t.lastMessagePreview}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {t.lastUpdated}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message detail */}
        <div className="rounded-2xl border bg-white flex flex-col">
          <div className="border-b px-4 py-2">
            {selectedThread ? (
              <>
                <p className="text-sm font-medium">
                  {selectedThread.subject}
                </p>
                <p className="text-xs text-muted-foreground">
                  With {selectedThread.providerName}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a conversation to view details.
              </p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
            {selectedMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No messages yet in this conversation.
              </p>
            ) : (
              selectedMessages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    m.from === "PATIENT"
                      ? "ml-auto bg-slate-900 text-white"
                      : "mr-auto bg-slate-100 text-slate-900"
                  }`}
                >
                  <p>{m.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">
                    {m.timestamp}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          {selectedThread && (
            <div className="border-t px-4 py-3 space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message…"
                className="w-full min-h-[60px] text-sm rounded-md border px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MessagesSection;
