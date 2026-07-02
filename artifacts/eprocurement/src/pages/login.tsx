import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isChecking } = useGetMe();
  const login = useLogin();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user && !isChecking) {
      setLocation("/dashboard");
    }
  }, [user, isChecking, setLocation]);

  const onSubmit = form.handleSubmit((data) => {
    login.mutate({ data }, {
      onSuccess: () => {
        setLocation("/dashboard");
      },
      onError: () => {
        toast({
          title: "Authentication Failed",
          description: "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
    });
  });

  if (isChecking) return null;

  return (
    <div className="min-h-screen bg-sidebar flex">
      <div className="flex-1 hidden lg:flex flex-col justify-between p-12 text-sidebar-foreground relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 font-bold text-2xl tracking-tight">
            <Briefcase className="w-8 h-8 text-amber-500" />
            <span>E-Procure</span>
          </div>
          <h1 className="mt-24 text-5xl font-bold leading-tight max-w-2xl">
            Enterprise Spend Management.<br/>
            <span className="text-sidebar-foreground/60">Controlled, transparent, and fast.</span>
          </h1>
          <p className="mt-6 text-xl text-sidebar-foreground/70 max-w-xl">
            The central nervous system for all internal purchasing, approvals, and budget compliance.
          </p>
        </div>
        <div className="relative z-10 text-sm font-medium text-sidebar-foreground/40 uppercase tracking-wider">
          Internal Systems // Level 4 Access Required
        </div>
        
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-background p-8">
        <Card className="w-full max-w-md shadow-2xl border-none">
          <CardHeader className="space-y-2 pb-8">
            <CardTitle className="text-3xl font-bold">Secure Login</CardTitle>
            <CardDescription className="text-base">
              Enter your credentials to access the terminal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs uppercase tracking-wider font-semibold">Username</Label>
                <Input
                  id="username"
                  {...form.register("username")}
                  placeholder="Enter your AD username"
                  className="h-11 font-mono text-sm"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password")}
                  placeholder="••••••••"
                  className="h-11 font-mono text-sm"
                  autoComplete="current-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold"
                disabled={login.isPending}
              >
                {login.isPending ? "Authenticating..." : "Authorize Access"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
