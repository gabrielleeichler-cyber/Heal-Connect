import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface SessionStatus {
  valid: boolean;
  remainingMinutes: number;
  timeoutMinutes: number;
}

export function SessionTimeoutWarning() {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const WARNING_THRESHOLD_MINUTES = 5;

  const { data: sessionStatus } = useQuery<SessionStatus>({
    queryKey: ["/api/session-status"],
    enabled: !!user,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (sessionStatus) {
      if (!sessionStatus.valid) {
        logout();
      } else if (sessionStatus.remainingMinutes <= WARNING_THRESHOLD_MINUTES) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }
  }, [sessionStatus, logout]);

  const handleExtendSession = async () => {
    try {
      await fetch("/api/session-status");
      setShowWarning(false);
    } catch (error) {
      console.error("Failed to extend session:", error);
    }
  };

  const handleLogout = () => {
    setShowWarning(false);
    logout();
  };

  if (!user || !showWarning) return null;

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription>
            For your security, your session will expire in approximately{" "}
            <strong>{sessionStatus?.remainingMinutes || WARNING_THRESHOLD_MINUTES} minutes</strong>{" "}
            due to inactivity. Would you like to stay logged in?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleLogout}>
            Log Out Now
          </Button>
          <Button onClick={handleExtendSession}>
            Stay Logged In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
