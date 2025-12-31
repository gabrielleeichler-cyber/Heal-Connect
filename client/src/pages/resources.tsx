import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, FolderOpen } from "lucide-react";
import type { Resource } from "@shared/schema";

export default function ResourcesPage() {
  const { data: resources, isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const groupedResources = resources?.reduce((acc, resource) => {
    const category = resource.category || "general";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>) || {};

  const categories = Object.keys(groupedResources);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Resources</h2>
        <p className="text-muted-foreground">
          Helpful materials and information shared by your therapist.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : resources && resources.length > 0 ? (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-medium capitalize">{category}</h3>
                <Badge variant="secondary" className="ml-2">
                  {groupedResources[category].length}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedResources[category].map((resource) => (
                  <Card key={resource.id} data-testid={`resource-card-${resource.id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-start gap-2 text-base">
                        <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{resource.title}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {resource.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No resources available yet. Your therapist will share materials here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
