import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';

import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Requisitions from '@/pages/requisitions/index';
import NewRequisition from '@/pages/requisitions/new';
import RequisitionDetail from '@/pages/requisitions/detail';
import AdminUsers from '@/pages/admin/users';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        // Don't retry on 401/403 — these are auth errors, not transient failures
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

function NotFound() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background">
      <h1 className="text-4xl font-bold font-mono">404</h1>
      <p className="text-muted-foreground mt-2">Resource not found</p>
      <a href="/" className="mt-4 text-primary hover:underline">Return to Dashboard</a>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/requisitions" component={Requisitions} />
      <Route path="/requisitions/new" component={NewRequisition} />
      <Route path="/requisitions/:id" component={RequisitionDetail} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
    </QueryClientProvider>
  );
}

export default App;
