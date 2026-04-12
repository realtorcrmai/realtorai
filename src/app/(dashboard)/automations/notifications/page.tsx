import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Bell,
  GitBranch,
  Mail,
  Zap,
} from "lucide-react";
import { NotificationList } from "@/components/automations/NotificationList";


export default async function NotificationsPage() {
  const supabase = await getAuthenticatedTenantClient();

  // Fetch all notifications
  const { data: notifications } = await supabase
    .from("agent_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch template count + unread count for tabs
  const { data: templates } = await supabase
    .from("message_templates")
    .select("id");

  const notificationList = notifications ?? [];
  const templateCount = templates?.length ?? 0;
  const unreadCount = notificationList.filter((n: { is_read: boolean }) => !n.is_read).length;

  return (
    <div className="space-y-6 animate-float-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-indigo-500" />
            Automations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage workflow automations, message templates, and notifications
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b">
        <Link href="/automations">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-b-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
          >
            <GitBranch className="h-4 w-4 mr-1.5" />
            Workflows
          </Button>
        </Link>
        <Link href="/automations/templates">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-b-none border-b-2 border-transparent text-muted-foreground hover:text-foreground"
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Templates
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
              {templateCount}
            </Badge>
          </Button>
        </Link>
        <Link href="/automations/notifications">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-b-none border-b-2 border-indigo-500 text-indigo-600 font-medium"
          >
            <Bell className="h-4 w-4 mr-1.5" />
            Notifications
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-1.5 text-[10px] px-1.5"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </Link>
      </div>

      {/* Notification List */}
      {notificationList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              No Notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              Notifications from workflow actions will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <NotificationList notifications={notificationList} />
      )}
    </div>
  );
}
