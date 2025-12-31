import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import {
  SidebarProvider,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Home, 
  BookOpen, 
  FileText, 
  ClipboardList, 
  Bell, 
  LogOut,
  Heart,
  Settings
} from "lucide-react";
import Dashboard from "@/pages/dashboard";
import JournalPage from "@/pages/journal";
import ResourcesPage from "@/pages/resources";
import HomeworkPage from "@/pages/homework";
import RemindersPage from "@/pages/reminders";
import TreatmentPlanPage from "@/pages/treatment-plan";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { ReminderNotifier } from "@/components/ReminderNotifier";
import { Target } from "lucide-react";

const clientNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Treatment Plan", url: "/treatment-plan", icon: Target },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Resources", url: "/resources", icon: FileText },
  { title: "Homework", url: "/homework", icon: ClipboardList },
  { title: "Reminders", url: "/reminders", icon: Bell },
];

const officeAdminNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Resources", url: "/resources", icon: FileText },
  { title: "Homework", url: "/homework", icon: ClipboardList },
  { title: "Reminders", url: "/reminders", icon: Bell },
];

const therapistNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Admin", url: "/admin", icon: Settings },
  { title: "Treatment Plan", url: "/treatment-plan", icon: Target },
  { title: "Resources", url: "/resources", icon: FileText },
  { title: "Homework", url: "/homework", icon: ClipboardList },
  { title: "Reminders", url: "/reminders", icon: Bell },
];

function AppSidebar() {
  const [location] = useLocation();
  const { user, logout, isLoggingOut } = useAuth();
  
  const getNavItems = () => {
    if (user?.role === "therapist") return therapistNavItems;
    if (user?.role === "office_admin") return officeAdminNavItems;
    return clientNavItems;
  };
  const navItems = getNavItems();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">Therapy Portal</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                  >
                    <a href={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback>
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-username">
              {user?.firstName || user?.email || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.role === "therapist" ? "Therapist" : user?.role === "office_admin" ? "Office Admin" : "Client"}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => logout()}
            disabled={isLoggingOut}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <ReminderNotifier />
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center gap-2 p-3 border-b bg-card">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="text-lg font-medium">Welcome to Your Portal</h1>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/journal" component={JournalPage} />
              <Route path="/resources" component={ResourcesPage} />
              <Route path="/homework" component={HomeworkPage} />
              <Route path="/reminders" component={RemindersPage} />
              <Route path="/treatment-plan" component={TreatmentPlanPage} />
              <Route path="/admin" component={AdminPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <Heart className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-3xl font-semibold mb-4 text-foreground">
          Therapy Client Portal
        </h1>
        <p className="text-muted-foreground mb-8 text-lg">
          A secure space to connect with your therapist, track your progress, and access your resources.
        </p>
        <Button 
          size="lg" 
          onClick={() => window.location.href = "/api/login"}
          data-testid="button-login"
        >
          Sign In to Your Account
        </Button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Heart className="h-12 w-12 text-primary mx-auto animate-pulse" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
