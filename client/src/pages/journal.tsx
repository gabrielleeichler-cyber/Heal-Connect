import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/auth-utils";
import { PenLine, Lightbulb } from "lucide-react";
import type { Journal, Prompt } from "@shared/schema";

export default function JournalPage() {
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const { data: journals, isLoading: journalsLoading } = useQuery<Journal[]>({
    queryKey: ["/api/journals"],
  });

  const { data: prompts, isLoading: promptsLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
  });

  const createJournal = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("/api/journals", {
        method: "POST",
        body: JSON.stringify({ content, userId: "", isShared: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journals"] });
      setContent("");
      toast({
        title: "Entry saved",
        description: "Your journal entry has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to save entry.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      createJournal.mutate(content);
    }
  };

  const usePrompt = (promptContent: string) => {
    setContent(promptContent + "\n\n");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Your Journal</h2>
        <p className="text-muted-foreground">
          A safe space to reflect and share your thoughts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card data-testid="card-new-entry">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="h-5 w-5" />
                New Entry
              </CardTitle>
              <CardDescription>Write about your thoughts, feelings, or experiences.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  placeholder="Start writing here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px] resize-none"
                  data-testid="input-journal-content"
                />
                <Button 
                  type="submit" 
                  disabled={createJournal.isPending || !content.trim()}
                  data-testid="button-save-entry"
                >
                  {createJournal.isPending ? "Saving..." : "Save Entry"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card data-testid="card-past-entries">
            <CardHeader>
              <CardTitle>Past Entries</CardTitle>
              <CardDescription>Your journal history</CardDescription>
            </CardHeader>
            <CardContent>
              {journalsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : journals && journals.length > 0 ? (
                <div className="space-y-4">
                  {journals.map((journal) => (
                    <div 
                      key={journal.id} 
                      className="p-4 rounded-md border bg-card"
                      data-testid={`journal-entry-${journal.id}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{journal.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {journal.date ? new Date(journal.date).toLocaleString() : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No entries yet. Start writing your first entry above!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card data-testid="card-prompts">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Writing Prompts
              </CardTitle>
              <CardDescription>Need inspiration? Try one of these prompts.</CardDescription>
            </CardHeader>
            <CardContent>
              {promptsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : prompts && prompts.length > 0 ? (
                <div className="space-y-3">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => usePrompt(prompt.content)}
                      className="w-full text-left p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors text-sm"
                      data-testid={`prompt-${prompt.id}`}
                    >
                      {prompt.content}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No prompts available yet. Your therapist will add some soon.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
