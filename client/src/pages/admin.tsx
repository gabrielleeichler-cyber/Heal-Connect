import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Edit, FileText, Lightbulb, Users, Download, ShieldAlert } from "lucide-react";
import type { Prompt, Resource, User } from "@shared/schema";

function PromptForm({ prompt, onSuccess }: { prompt?: Prompt; onSuccess: () => void }) {
  const [content, setContent] = useState(prompt?.content || "");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: () => apiRequest("/api/prompts", { method: "POST", body: JSON.stringify({ content, isActive: true }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      toast({ title: "Prompt created" });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => apiRequest(`/api/prompts/${prompt?.id}`, { method: "PATCH", body: JSON.stringify({ content }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      toast({ title: "Prompt updated" });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prompt-content">Journal Prompt</Label>
        <Textarea
          id="prompt-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter a reflective question for your clients..."
          rows={3}
          data-testid="input-prompt-content"
        />
      </div>
      <Button 
        type="submit" 
        disabled={createMutation.isPending || updateMutation.isPending}
        data-testid="button-save-prompt"
      >
        {prompt ? "Update" : "Create"} Prompt
      </Button>
    </form>
  );
}

function ResourceForm({ resource, clients, onSuccess }: { resource?: Resource; clients: User[]; onSuccess: () => void }) {
  const [title, setTitle] = useState(resource?.title || "");
  const [content, setContent] = useState(resource?.content || "");
  const [category, setCategory] = useState(resource?.category || "general");
  const [clientId, setClientId] = useState<string>(resource?.clientId || "");
  const { toast } = useToast();

  const getPayload = () => {
    const payload: Record<string, unknown> = { title, content, category };
    if (clientId) {
      payload.clientId = clientId;
    }
    return payload;
  };

  const createMutation = useMutation({
    mutationFn: () => apiRequest("/api/resources", { 
      method: "POST", 
      body: JSON.stringify(getPayload()) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: "Resource created" });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => apiRequest(`/api/resources/${resource?.id}`, { 
      method: "PATCH", 
      body: JSON.stringify(getPayload()) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: "Resource updated" });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resource) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="resource-title">Title</Label>
        <Input
          id="resource-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resource title..."
          data-testid="input-resource-title"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="resource-content">Content</Label>
        <Textarea
          id="resource-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Resource content..."
          rows={5}
          data-testid="input-resource-content"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="resource-category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="select-resource-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="relaxation">Relaxation</SelectItem>
              <SelectItem value="anxiety">Anxiety</SelectItem>
              <SelectItem value="wellness">Wellness</SelectItem>
              <SelectItem value="mindfulness">Mindfulness</SelectItem>
              <SelectItem value="coping">Coping Skills</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="resource-client">Assign to Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger data-testid="select-resource-client">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.firstName || client.email || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button 
        type="submit" 
        disabled={createMutation.isPending || updateMutation.isPending}
        data-testid="button-save-resource"
      >
        {resource ? "Update" : "Create"} Resource
      </Button>
    </form>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | undefined>();
  const [editingResource, setEditingResource] = useState<Resource | undefined>();
  const { toast } = useToast();

  const isTherapist = user?.role === "therapist" || user?.isTherapist === true;

  const { data: prompts = [], isLoading: promptsLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
    enabled: isTherapist,
  });

  const { data: resources = [], isLoading: resourcesLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
    enabled: isTherapist,
  });

  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
    enabled: isTherapist,
  });

  if (!isTherapist) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground max-w-md">
          This area is only accessible to therapists. If you believe this is an error, please contact your administrator.
        </p>
      </div>
    );
  }

  const deletePromptMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/prompts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      toast({ title: "Prompt deleted" });
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/resources/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: "Resource deleted" });
    },
  });

  const openEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setPromptDialogOpen(true);
  };

  const openEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setResourceDialogOpen(true);
  };

  const closePromptDialog = () => {
    setPromptDialogOpen(false);
    setEditingPrompt(undefined);
  };

  const closeResourceDialog = () => {
    setResourceDialogOpen(false);
    setEditingResource(undefined);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold" data-testid="text-admin-title">Therapist Admin</h2>
        <p className="text-muted-foreground">Manage prompts, resources, and client content</p>
      </div>

      <Tabs defaultValue="prompts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="prompts" data-testid="tab-prompts">
            <Lightbulb className="h-4 w-4 mr-2" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="resources" data-testid="tab-resources">
            <FileText className="h-4 w-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="clients" data-testid="tab-clients">
            <Users className="h-4 w-4 mr-2" />
            Clients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Journal prompts help guide client reflection. Active prompts appear randomly in the journal.
            </p>
            <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-prompt" onClick={() => setEditingPrompt(undefined)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prompt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPrompt ? "Edit" : "New"} Prompt</DialogTitle>
                </DialogHeader>
                <PromptForm prompt={editingPrompt} onSuccess={closePromptDialog} />
              </DialogContent>
            </Dialog>
          </div>

          {promptsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No prompts yet. Add your first prompt to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {prompts.map((prompt) => (
                <Card key={prompt.id} data-testid={`card-prompt-${prompt.id}`}>
                  <CardContent className="py-4 flex items-start justify-between gap-4">
                    <p className="flex-1">{prompt.content}</p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditPrompt(prompt)}
                        data-testid={`button-edit-prompt-${prompt.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePromptMutation.mutate(prompt.id)}
                        data-testid={`button-delete-prompt-${prompt.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Resources are available to all clients or can be assigned to specific clients.
            </p>
            <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-resource" onClick={() => setEditingResource(undefined)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingResource ? "Edit" : "New"} Resource</DialogTitle>
                </DialogHeader>
                <ResourceForm resource={editingResource} clients={clients} onSuccess={closeResourceDialog} />
              </DialogContent>
            </Dialog>
          </div>

          {resourcesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : resources.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No resources yet. Add your first resource to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <Card key={resource.id} data-testid={`card-resource-${resource.id}`}>
                  <CardHeader className="py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{resource.title}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {resource.category}
                          </Badge>
                          {resource.clientId ? (
                            <Badge variant="outline" className="text-xs">
                              Assigned to: {clients.find(c => c.id === resource.clientId)?.firstName || "Client"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">All Clients</Badge>
                          )}
                          {resource.fileUrl && (
                            <Badge variant="outline" className="text-xs">
                              <Download className="h-3 w-3 mr-1" />
                              {resource.fileName || "Attachment"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditResource(resource)}
                          data-testid={`button-edit-resource-${resource.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteResourceMutation.mutate(resource.id)}
                          data-testid={`button-delete-resource-${resource.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{resource.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            View all registered clients in your practice.
          </p>
          {clients.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No clients have signed up yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {clients.map((client) => (
                <Card key={client.id} data-testid={`card-client-${client.id}`}>
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                    <Badge variant="outline">
                      Joined {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : "Recently"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
