import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNotifications } from "@/hooks/use-notifications";
import type { Reminder } from "@shared/schema";

const CHECK_INTERVAL = 60000; // Check every minute
const NOTIFICATION_WINDOW = 5 * 60000; // Notify 5 minutes before

export function ReminderNotifier() {
  const { isGranted, sendNotification } = useNotifications();
  const notifiedIds = useRef<Set<number>>(new Set());

  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
    refetchInterval: CHECK_INTERVAL,
    enabled: isGranted,
  });

  useEffect(() => {
    if (!isGranted || reminders.length === 0) return;

    const now = Date.now();

    reminders.forEach((reminder) => {
      if (notifiedIds.current.has(reminder.id)) return;
      if (reminder.sent) return;

      const scheduledTime = new Date(reminder.scheduledTime).getTime();
      const timeUntil = scheduledTime - now;

      // Notify if within the notification window (upcoming in next 5 minutes)
      if (timeUntil > 0 && timeUntil <= NOTIFICATION_WINDOW) {
        // Privacy-safe notification - don't expose message content on lock screens
        sendNotification("Therapy Portal", {
          body: "You have an upcoming reminder. Tap to view.",
          tag: `reminder-${reminder.id}`,
          requireInteraction: true,
        });
        notifiedIds.current.add(reminder.id);
      }
      
      // Also notify if the reminder time just passed (within last minute)
      if (timeUntil <= 0 && timeUntil > -60000) {
        sendNotification("Therapy Portal", {
          body: "You have a reminder waiting. Tap to view.",
          tag: `reminder-${reminder.id}`,
          requireInteraction: true,
        });
        notifiedIds.current.add(reminder.id);
      }
    });
  }, [reminders, isGranted, sendNotification]);

  return null;
}
