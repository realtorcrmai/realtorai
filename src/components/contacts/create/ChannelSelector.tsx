"use client";

import { MessageSquare, Phone, Mail, Smartphone } from "lucide-react";

const CHANNELS = [
  {
    value: "sms",
    label: "SMS",
    icon: Smartphone,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    ring: "ring-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: MessageSquare,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    ring: "ring-green-400",
    border: "border-green-200 dark:border-green-800",
  },
  {
    value: "email",
    label: "Email",
    icon: Mail,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    ring: "ring-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    value: "phone",
    label: "Phone",
    icon: Phone,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    ring: "ring-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
];

interface ChannelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ChannelSelector({ value, onChange }: ChannelSelectorProps) {
  return (
    <div className="flex gap-2">
      {CHANNELS.map((channel) => {
        const selected = value === channel.value;
        const Icon = channel.icon;
        return (
          <button
            key={channel.value}
            type="button"
            onClick={() => onChange(channel.value)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-200
              ${selected
                ? `${channel.bg} ${channel.border} ring-2 ${channel.ring} ring-offset-1 shadow-sm`
                : "border-border/30 hover:border-border hover:shadow-sm bg-white/50 dark:bg-white/5"
              }
            `}
          >
            <Icon className={`h-4 w-4 ${selected ? channel.color : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${selected ? "text-foreground" : "text-muted-foreground"}`}>
              {channel.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
