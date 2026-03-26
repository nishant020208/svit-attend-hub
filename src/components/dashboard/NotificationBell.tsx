import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnreadNotifications } from "@/hooks/useAdminDashboardData";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useUnreadNotifications(userId);

  const markAsRead = async (notifId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", notifId);
    queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
  };

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 hover:bg-white/10">
          <Bell className="h-5 w-5 text-primary-foreground" />
          {(data?.count ?? 0) > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive text-destructive-foreground border-2 border-primary">
              {data!.count > 9 ? "9+" : data!.count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm text-foreground">Notifications</h4>
          {(data?.count ?? 0) > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {data?.notifications && data.notifications.length > 0 ? (
            data.notifications.map((notif: any) => (
              <div
                key={notif.id}
                className="p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  markAsRead(notif.id);
                  if (notif.action_url) navigate(notif.action_url);
                }}
              >
                <p className="text-sm font-medium text-foreground line-clamp-1">{notif.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
            ))
          ) : (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No new notifications</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => navigate("/notifications")}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
