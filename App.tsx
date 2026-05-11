import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import List from "@/pages/list";
import Stats from "@/pages/stats";
import ListingDetail from "@/pages/listing-detail";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, shetkariOnly }: { component: React.ComponentType; shetkariOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (shetkariOnly && user.role !== "shetkari") return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">लोड होत आहे...</div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route path="/" component={Home} />
      <Route path="/list">
        <ProtectedRoute component={List} shetkariOnly />
      </Route>
      <Route path="/stats" component={Stats} />
      <Route path="/listings/:id" component={ListingDetail} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
