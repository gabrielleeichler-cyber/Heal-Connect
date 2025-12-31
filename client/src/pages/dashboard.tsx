import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, FileText, ClipboardList, Bell, CheckCircle, Clock } from "lucide-react";
import type { Journal, Resource, Homework, Reminder } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: journals, isLoading: journalsLoading } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
  });

  const { data: resources, isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const { data: homework, isLoading: homeworkLoading } = useQuery<Homework[]>({
    queryKey: ["/api/homework"],
  });

  const { data: reminders, isLoading: remindersLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const pendingHomework = homework?.filter(h => h.status === "pending") || [];
  const completedHomework = homework?.filter(h => h.status === "completed") || [];
  const upcomingReminders = reminders?.filter(r => !r.sent) || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold" data-testid="text-welcome">
          Welcome back, {user?.firstName || "there"}
        </h2>
        <p className="text-muted-foreground">
          Here's an overview of your therapy journey.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-journals-summary">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Journal Entries</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {journalsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-journal-count">
                {journals?.length || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Total entries written</p>
          </CardContent>
        </Card>

        <Card data-testid="card-resources-summary">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {resourcesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-resource-count">
                {resources?.length || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Available to you</p>
          </CardContent>
        </Card>

        <Card data-testid="card-homework-summary">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Homework</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {homeworkLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-homework-pending">
                {pendingHomework.length}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Tasks pending</p>
          </CardContent>
        </Card>

        <Card data-testid="card-reminders-summary">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {remindersLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-reminder-count">
                {upcomingReminders.length}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-recent-homework">
          <CardHeader>
            <CardTitle>Recent Homework</CardTitle>
            <CardDescription>Your assigned tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {homeworkLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : homework && homework.length > 0 ? (
              <div className="space-y-3">
                {homework.slice(0, 3).map((hw) => (
                  <div 
                    key={hw.id} 
                    className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                    data-testid={`homework-item-${hw.id}`}
                  >
                    {hw.status === "completed" ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{hw.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {hw.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No homework assigned yet.</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-journals">
          <CardHeader>
            <CardTitle>Recent Journal Entries</CardTitle>
            <CardDescription>Your latest reflections</CardDescription>
          </CardHeader>
          <CardContent>
            {journalsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : journals && journals.length > 0 ? (
              <div className="space-y-3">
                {journals.slice(0, 3).map((journal) => (
                  <div 
                    key={journal.id} 
                    className="p-3 rounded-md bg-muted/50"
                    data-testid={`journal-preview-${journal.id}`}
                  >
                    <p className="text-sm line-clamp-2">{journal.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {journal.date ? new Date(journal.date).toLocaleDateString() : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No journal entries yet. Start writing!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
