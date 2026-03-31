"use server";

import {
  createVoiceNotification,
  getUnreadNotifications,
  markNotificationRead,
  markNotificationSpoken,
} from "@/lib/voice-notifications";
import type { NotificationType, NotificationPriority } from "@/types/voice-agent";

export async function sendVoiceNotification(opts: {
  agentEmail: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: Record<string, string | number | boolean | null>;
  priority?: NotificationPriority;
}) {
  return createVoiceNotification(opts);
}

export async function fetchUnreadNotifications(agentEmail: string) {
  const notifications = await getUnreadNotifications(agentEmail);
  return { notifications };
}

export async function dismissNotification(notificationId: string) {
  await markNotificationRead(notificationId);
  return { success: true };
}

export async function markAsSpoken(notificationId: string) {
  await markNotificationSpoken(notificationId);
  return { success: true };
}
