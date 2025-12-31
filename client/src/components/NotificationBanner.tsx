import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, X } from "lucide-react";

export function NotificationBanner() {
  const { isSupported, permission, requestPermission } = useNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("notification-banner-dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("notification-banner-dismissed", "true");
  };

  if (!isSupported || permission === "granted" || permission === "denied" || dismissed) {
    return null;
  }

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardContent className="py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Enable Reminder Notifications</p>
            <p className="text-xs text-muted-foreground">
              Get notified about upcoming homework and session reminders
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={isRequesting}
            data-testid="button-enable-notifications"
          >
            {isRequesting ? "Enabling..." : "Enable"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            data-testid="button-dismiss-notification-banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
