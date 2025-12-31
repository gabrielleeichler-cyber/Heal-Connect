import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Calendar, CheckCircle } from "lucide-react";
import type { Reminder } from "@shared/schema";

export default function RemindersPage() {
  const { data: reminders, isLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const upcomingReminders = reminders?.filter(r => !r.sent) || [];
  const pastReminders = reminders?.filter(r => r.sent) || [];

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Reminders</h2>
        <p className="text-muted-foreground">
          Scheduled reminders and notifications for your therapy journey.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : reminders && reminders.length > 0 ? (
        <div className="space-y-8">
          {upcomingReminders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Upcoming</h3>
                <Badge>{upcomingReminders.length}</Badge>
              </div>
              <div className="space-y-4">
                {upcomingReminders.map((reminder) => (
                  <Card key={reminder.id} data-testid={`reminder-upcoming-${reminder.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Bell className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{reminder.message}</p>
                          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDateTime(reminder.scheduledTime)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pastReminders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-medium">Sent</h3>
                <Badge variant="secondary">{pastReminders.length}</Badge>
              </div>
              <div className="space-y-4">
                {pastReminders.map((reminder) => (
                  <Card key={reminder.id} className="opacity-60" data-testid={`reminder-sent-${reminder.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-full bg-muted">
                          <CheckCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-muted-foreground">{reminder.message}</p>
                          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDateTime(reminder.scheduledTime)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No reminders set up yet. Your therapist can schedule reminders for you.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
