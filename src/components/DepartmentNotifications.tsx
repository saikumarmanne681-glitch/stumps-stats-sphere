import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DepartmentNotification } from "@/lib/v2types";

interface DepartmentNotificationsProps {
  notifications: DepartmentNotification[];
}

export function DepartmentNotifications({ notifications }: DepartmentNotificationsProps) {
  const unread = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Department notifications</p>
        <Badge variant="secondary">{unread} new</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">🔔 {unread} new department updates</p>
    </div>
  );
}
