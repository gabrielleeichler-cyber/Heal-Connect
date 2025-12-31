import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { ClipboardList, CheckCircle, Clock, Calendar } from "lucide-react";
import type { Homework } from "@shared/schema";

export default function HomeworkPage() {
  const { toast } = useToast();

  const { data: homework, isLoading } = useQuery<Homework[]>({
    queryKey: ["/api/homework"],
  });

  const updateHomework = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/homework/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homework"] });
      toast({
        title: "Updated",
        description: "Homework status updated successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const pendingHomework = homework?.filter(h => h.status === "pending") || [];
  const completedHomework = homework?.filter(h => h.status === "completed") || [];

  const toggleStatus = (hw: Homework) => {
    const newStatus = hw.status === "pending" ? "completed" : "pending";
    updateHomework.mutate({ id: hw.id, status: newStatus });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Homework</h2>
        <p className="text-muted-foreground">
          Tasks and exercises assigned by your therapist.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : homework && homework.length > 0 ? (
        <div className="space-y-8">
          {pendingHomework.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-medium">Pending Tasks</h3>
                <Badge variant="secondary">{pendingHomework.length}</Badge>
              </div>
              <div className="space-y-4">
                {pendingHomework.map((hw) => (
                  <Card key={hw.id} data-testid={`homework-pending-${hw.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium">{hw.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {hw.description}
                          </p>
                          {hw.dueDate && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Due: {formatDate(hw.dueDate)}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatus(hw)}
                          disabled={updateHomework.isPending}
                          data-testid={`button-complete-${hw.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Complete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completedHomework.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium">Completed</h3>
                <Badge variant="secondary">{completedHomework.length}</Badge>
              </div>
              <div className="space-y-4">
                {completedHomework.map((hw) => (
                  <Card key={hw.id} className="opacity-75" data-testid={`homework-completed-${hw.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium line-through">{hw.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {hw.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(hw)}
                          disabled={updateHomework.isPending}
                          data-testid={`button-uncomplete-${hw.id}`}
                        >
                          Undo
                        </Button>
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
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No homework assigned yet. Check back later!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
