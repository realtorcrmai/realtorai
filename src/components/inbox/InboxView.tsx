"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Inbox,
  MessageSquare,
  Phone,
  Mail,
  StickyNote,
  Send,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  User,
} from "lucide-react";
import { sendContactMessage } from "@/actions/contacts";

type Communication = {
  id: string;
  contact_id: string;
  direction: "inbound" | "outbound";
  channel: string;
  body: string;
  created_at: string;
  contacts: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    type: string;
  } | null;
};

type Conversation = {
  contactId: string;
  contactName: string;
  contactType: string;
  contactPhone: string;
  contactEmail: string | null;
  lastMessage: Communication;
  messages: Communication[];
  inboundCount: number;
};

const CHANNEL_FILTERS = ["all", "sms", "whatsapp", "email", "note"] as const;
type ChannelFilter = (typeof CHANNEL_FILTERS)[number];

const channelIcon = (channel: string) => {
  switch (channel) {
    case "sms":
      return <Phone className="h-3.5 w-3.5" />;
    case "whatsapp":
      return <MessageSquare className="h-3.5 w-3.5" />;
    case "email":
      return <Mail className="h-3.5 w-3.5" />;
    case "note":
      return <StickyNote className="h-3.5 w-3.5" />;
    default:
      return <MessageSquare className="h-3.5 w-3.5" />;
  }
};

const channelLabel = (channel: string) => {
  switch (channel) {
    case "sms":
      return "SMS";
    case "whatsapp":
      return "WhatsApp";
    case "email":
      return "Email";
    case "note":
      return "Note";
    default:
      return channel;
  }
};

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function InboxView({
  communications,
}: {
  communications: Communication[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sendChannel, setSendChannel] = useState<"sms" | "whatsapp">("sms");
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Group communications into conversations by contact
  const conversations = useMemo(() => {
    const map = new Map<string, Conversation>();

    for (const msg of communications) {
      if (!msg.contacts) continue;

      const existing = map.get(msg.contact_id);
      if (existing) {
        existing.messages.push(msg);
        if (msg.direction === "inbound") existing.inboundCount++;
        // lastMessage is already the most recent due to sort order
      } else {
        map.set(msg.contact_id, {
          contactId: msg.contact_id,
          contactName: msg.contacts.name,
          contactType: msg.contacts.type,
          contactPhone: msg.contacts.phone,
          contactEmail: msg.contacts.email,
          lastMessage: msg,
          messages: [msg],
          inboundCount: msg.direction === "inbound" ? 1 : 0,
        });
      }
    }

    return Array.from(map.values());
  }, [communications]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Channel filter
    if (channelFilter !== "all") {
      result = result.filter((c) =>
        c.messages.some((m) => m.channel === channelFilter)
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.contactName.toLowerCase().includes(q));
    }

    return result;
  }, [conversations, channelFilter, searchQuery]);

  // Channel counts
  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: conversations.length };
    for (const c of conversations) {
      const channels = new Set(c.messages.map((m) => m.channel));
      for (const ch of channels) {
        counts[ch] = (counts[ch] || 0) + 1;
      }
    }
    return counts;
  }, [conversations]);

  // Selected conversation
  const selectedConversation = selectedContactId
    ? conversations.find((c) => c.contactId === selectedContactId)
    : null;

  // Messages in chronological order for detail view
  const sortedMessages = useMemo(() => {
    if (!selectedConversation) return [];
    return [...selectedConversation.messages].reverse();
  }, [selectedConversation]);

  const handleSelectConversation = (contactId: string) => {
    setSelectedContactId(contactId);
    setMobileShowDetail(true);
    setMessageBody("");
  };

  const handleSendMessage = async () => {
    if (!selectedContactId || !messageBody.trim()) return;

    startTransition(async () => {
      const result = await sendContactMessage(
        selectedContactId,
        messageBody.trim()
      );
      if (result.success) {
        setMessageBody("");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-180px)]">
      {/* Left Panel - Conversation List */}
      <Card
        className={`w-full md:w-[360px] md:min-w-[360px] flex flex-col overflow-hidden ${
          mobileShowDetail ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Channel Filter Tabs */}
        <div className="flex gap-1 p-2 border-b overflow-x-auto">
          {CHANNEL_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setChannelFilter(filter)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                channelFilter === filter
                  ? "bg-[var(--lf-indigo)] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {filter === "all" ? "All" : channelLabel(filter)}
              <span className="ml-1 opacity-70">
                {channelCounts[filter] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.contactId}
                onClick={() => handleSelectConversation(conv.contactId)}
                className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/50 ${
                  selectedContactId === conv.contactId
                    ? "bg-[var(--lf-indigo)]/5 border-l-2 border-l-[var(--lf-indigo)]"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--lf-indigo)] to-[var(--lf-coral)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-semibold">
                      {conv.contactName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--lf-text)] truncate">
                        {conv.contactName}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {relativeTime(conv.lastMessage.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {conv.contactType}
                      </Badge>
                      <span className="text-muted-foreground">
                        {channelIcon(conv.lastMessage.channel)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {conv.lastMessage.direction === "outbound" && (
                        <span className="text-muted-foreground/60">You: </span>
                      )}
                      {conv.lastMessage.body}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Right Panel - Conversation Detail */}
      <Card
        className={`flex-1 flex flex-col overflow-hidden ${
          !mobileShowDetail ? "hidden md:flex" : "flex"
        }`}
      >
        {!selectedConversation ? (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs mt-1 opacity-70">
              Choose a contact from the list to view their messages
            </p>
          </div>
        ) : (
          <>
            {/* Detail Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              {/* Mobile back button */}
              <button
                onClick={() => setMobileShowDetail(false)}
                className="md:hidden text-muted-foreground hover:text-foreground"
              >
                <ArrowDownLeft className="h-4 w-4 rotate-45" />
              </button>

              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--lf-indigo)] to-[var(--lf-coral)] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">
                  {selectedConversation.contactName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--lf-text)] truncate">
                    {selectedConversation.contactName}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {selectedConversation.contactType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.contactPhone}
                  {selectedConversation.contactEmail &&
                    ` \u00B7 ${selectedConversation.contactEmail}`}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(
                    `/contacts/${selectedConversation.contactId}`
                  )
                }
                className="text-xs gap-1"
              >
                <User className="h-3.5 w-3.5" />
                Profile
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {sortedMessages.map((msg) => {
                const isOutbound = msg.direction === "outbound";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isOutbound
                          ? "bg-[var(--lf-indigo)] text-white rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.body}
                      </p>
                      <div
                        className={`flex items-center gap-1.5 mt-1.5 ${
                          isOutbound
                            ? "text-white/60"
                            : "text-muted-foreground"
                        }`}
                      >
                        {channelIcon(msg.channel)}
                        <span className="text-[10px]">
                          {formatTimestamp(msg.created_at)}
                        </span>
                        {isOutbound ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownLeft className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compose Bar */}
            <div className="border-t p-3">
              <div className="flex items-end gap-2">
                {/* Channel Selector */}
                <select
                  value={sendChannel}
                  onChange={(e) =>
                    setSendChannel(e.target.value as "sms" | "whatsapp")
                  }
                  className="lf-select h-9 text-xs w-[110px] flex-shrink-0"
                >
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>

                <Textarea
                  placeholder="Type a message..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[36px] max-h-[120px] resize-none text-sm"
                  rows={1}
                />

                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!messageBody.trim() || isPending}
                  className="h-9 px-3 flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
