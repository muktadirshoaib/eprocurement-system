import React from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  Users, 
  LogOut, 
  Bell,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { data: user, isLoading, error } = useGetMe();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isLoading && (error || !user)) {
      setLocation("/login");
    }
  }, [user, isLoading, error, setLocation]);

  if (isLoading || !user) {
    return <div className="h-screen w-full flex items-center justify-center bg-background text-muted-foreground">Loading interface...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary selection:text-white">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ user }: { user: any }) {
  const [location] = useLocation();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/requisitions", label: "Requisitions", icon: FileText },
    { href: "/requisitions/new", label: "New Request", icon: PlusCircle },
  ];

  if (user?.role === "admin") {
    links.push({ href: "/admin/users", label: "User Management", icon: Users });
  }

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border font-bold text-lg tracking-tight gap-2">
        <Briefcase className="w-5 h-5 text-amber-500" />
        <span>E-Procure</span>
      </div>
      <div className="flex-1 py-6 px-4 space-y-1">
        {links.map((link) => {
          const isActive = location === link.href || (location.startsWith(link.href) && link.href !== "/dashboard" && link.href !== "/requisitions");
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </div>
      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60">
        E-Procurement System v1.0
      </div>
    </aside>
  );
}

function TopBar({ user }: { user: any }) {
  const logout = useLogout();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => setLocation("/login"),
    });
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center text-sm text-muted-foreground font-medium">
        {user?.department} Department
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          {/* Notification badge mock */}
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <div className="flex items-center gap-3">
          <div className="text-right flex flex-col">
            <span className="text-sm font-semibold leading-none">{user?.fullName}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{user?.role.replace('_', ' ')} {user?.approvalStage ? `(Stage ${user.approvalStage})` : ''}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {user?.fullName.charAt(0)}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="ml-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
