import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, CheckCircle, Circle, Trash2, Edit } from "lucide-react";
import type { TreatmentPlan, TreatmentGoal, TreatmentObjective } from "@shared/schema";

function GoalCard({ 
  goal, 
  isTherapist, 
  onEdit, 
  onDelete 
}: { 
  goal: TreatmentGoal; 
  isTherapist: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: objectives = [] } = useQuery<TreatmentObjective[]>({
    queryKey: ["/api/treatment-objectives", goal.id],
    queryFn: () => fetch(`/api/treatment-objectives/${goal.id}`).then(r => r.json()),
  });

  const completedCount = objectives.filter(o => o.status === "completed").length;
  const progress = objectives.length > 0 ? (completedCount / objectives.length) * 100 : 0;

  const statusColors: Record<string, string> = {
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    achieved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    discontinued: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  return (
    <AccordionItem value={`goal-${goal.id}`} className="border rounded-md px-4">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-3 flex-1 text-left">
          <Target className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{goal.title}</span>
              <Badge className={statusColors[goal.status || "in_progress"]} variant="secondary">
                {goal.status?.replace("_", " ") || "In Progress"}
              </Badge>
            </div>
            {goal.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{goal.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 mr-4">
            <Progress value={progress} className="w-24 h-2" />
            <span className="text-xs text-muted-foreground">{completedCount}/{objectives.length}</span>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="space-y-3 pl-8">
          {objectives.length === 0 ? (
            <p className="text-sm text-muted-foreground">No objectives defined yet.</p>
          ) : (
            objectives.map((obj) => (
              <ObjectiveItem key={obj.id} objective={obj} isTherapist={isTherapist} />
            ))
          )}
          {isTherapist && (
            <AddObjectiveButton goalId={goal.id} />
          )}
        </div>
        {isTherapist && (
          <div className="flex gap-2 mt-4 pl-8">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Edit Goal
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function ObjectiveItem({ objective, isTherapist }: { objective: TreatmentObjective; isTherapist: boolean }) {
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: (status: string) => 
      apiRequest(`/api/treatment-objectives/${objective.id}`, { 
        method: "PATCH", 
        body: JSON.stringify({ status }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-objectives", objective.goalId] });
      toast({ title: "Objective updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/api/treatment-objectives/${objective.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-objectives", objective.goalId] });
      toast({ title: "Objective deleted" });
    },
  });

  const statusIcons: Record<string, typeof CheckCircle> = {
    not_started: Circle,
    in_progress: Circle,
    completed: CheckCircle,
  };
  const Icon = statusIcons[objective.status || "not_started"] || Circle;
  const isCompleted = objective.status === "completed";

  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid={`objective-${objective.id}`}>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 mt-0.5"
        onClick={() => updateMutation.mutate(isCompleted ? "in_progress" : "completed")}
        disabled={!isTherapist}
      >
        <Icon className={`h-4 w-4 ${isCompleted ? "text-green-600" : "text-muted-foreground"}`} />
      </Button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
          {objective.title}
        </p>
        {objective.measurableCriteria && (
          <p className="text-xs text-muted-foreground mt-1">{objective.measurableCriteria}</p>
        )}
      </div>
      {isTherapist && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={() => deleteMutation.mutate()}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function AddObjectiveButton({ goalId }: { goalId: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => 
      apiRequest("/api/treatment-objectives", { 
        method: "POST", 
        body: JSON.stringify({ goalId, title, measurableCriteria: criteria }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-objectives", goalId] });
      toast({ title: "Objective added" });
      setTitle("");
      setCriteria("");
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Objective
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Objective</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Objective</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What should the client achieve?"
              data-testid="input-objective-title"
            />
          </div>
          <div className="space-y-2">
            <Label>Measurable Criteria (optional)</Label>
            <Textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="How will progress be measured?"
              rows={2}
            />
          </div>
          <Button type="submit" disabled={mutation.isPending || !title}>
            Add Objective
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddGoalDialog({ planId, onSuccess }: { planId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => 
      apiRequest("/api/treatment-goals", { 
        method: "POST", 
        body: JSON.stringify({ planId, title, description }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-goals", planId] });
      toast({ title: "Goal added" });
      setTitle("");
      setDescription("");
      setOpen(false);
      onSuccess();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-goal">
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Treatment Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Goal Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Reduce anxiety symptoms"
              data-testid="input-goal-title"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the goal..."
              rows={3}
            />
          </div>
          <Button type="submit" disabled={mutation.isPending || !title}>
            Add Goal
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TreatmentPlanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isTherapist = user?.role === "therapist";
  const clientId = user?.id;

  const { data: plans = [], isLoading } = useQuery<TreatmentPlan[]>({
    queryKey: ["/api/treatment-plans"],
  });

  const plan = plans[0]; // Client sees only their own plan

  const { data: goals = [], isLoading: goalsLoading } = useQuery<TreatmentGoal[]>({
    queryKey: ["/api/treatment-goals", plan?.id],
    queryFn: () => plan ? fetch(`/api/treatment-goals/${plan.id}`).then(r => r.json()) : Promise.resolve([]),
    enabled: !!plan,
  });

  const createPlanMutation = useMutation({
    mutationFn: () => 
      apiRequest("/api/treatment-plans", { 
        method: "POST", 
        body: JSON.stringify({ clientId }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-plans"] });
      toast({ title: "Treatment plan created" });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/treatment-goals/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatment-goals", plan?.id] });
      toast({ title: "Goal deleted" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-2xl font-semibold" data-testid="text-treatment-plan-title">
            Treatment Plan
          </h2>
          <p className="text-muted-foreground">
            {isTherapist 
              ? "Create a treatment plan to track goals and objectives."
              : "Your treatment plan will appear here once your therapist creates it."}
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No treatment plan yet.</p>
            {isTherapist && (
              <Button onClick={() => createPlanMutation.mutate()} disabled={createPlanMutation.isPending}>
                Create Treatment Plan
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold" data-testid="text-treatment-plan-title">
            Treatment Plan
          </h2>
          <p className="text-muted-foreground">
            {isTherapist 
              ? "Manage treatment goals and track progress."
              : "View your treatment goals and progress."}
          </p>
        </div>
        {isTherapist && plan && (
          <AddGoalDialog planId={plan.id} onSuccess={() => {}} />
        )}
      </div>

      {plan.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{plan.summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Goals</h3>
        {goalsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No goals defined yet.
              {isTherapist && " Click 'Add Goal' to get started."}
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isTherapist={isTherapist}
                onEdit={() => {}}
                onDelete={() => deleteGoalMutation.mutate(goal.id)}
              />
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
