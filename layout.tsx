import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Sprout, LineChart, PlusCircle, Home, LogIn, LogOut, User, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const allNavItems = [
    { href: "/", label: "बाजार", sublabel: "Market", icon: Home, roles: ["shetkari", "buyer", null] },
    { href: "/list", label: "माल टाका", sublabel: "Add Produce", icon: PlusCircle, roles: ["shetkari"] },
    { href: "/dashboard", label: "माझ्या याद्या", sublabel: "My Dashboard", icon: LayoutDashboard, roles: ["shetkari", "buyer"] },
    { href: "/stats", label: "बाजारभाव", sublabel: "Market Stats", icon: LineChart, roles: ["shetkari", "buyer", null] },
  ];

  const visibleNavItems = allNavItems.filter((item) =>
    item.roles.includes(user?.role ?? null)
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-primary text-primary-foreground flex-shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto flex md:flex-col">
        {/* Brand */}
        <div className="p-4 md:p-6 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Sprout className="w-8 h-8 text-secondary flex-shrink-0" />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold font-serif leading-tight">शेतकरी बाजार</h1>
              <p className="text-primary-foreground/70 text-xs">Direct from Farms</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex md:flex-col gap-1 px-2 md:px-4 pb-2 md:pb-4 flex-1 overflow-x-auto md:overflow-x-visible">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors whitespace-nowrap font-medium",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "hover:bg-primary-foreground/10 text-primary-foreground/90"
                )}
                data-testid={`nav-${item.sublabel.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div className="hidden md:block">
                  <span className="block text-sm">{item.label}</span>
                  <span className="block text-xs opacity-70">{item.sublabel}</span>
                </div>
                <span className="md:hidden text-sm">{item.sublabel}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="px-4 py-4 border-t border-primary-foreground/10 hidden md:block mt-auto">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary-foreground truncate">
                    {user.name || `+91 ${user.phone}`}
                  </p>
                  <Badge
                    variant="outline"
                    className="text-xs border-primary-foreground/30 text-primary-foreground/80 px-1.5 py-0"
                  >
                    {user.role === "shetkari" ? "शेतकरी" : "खरेदीदार"}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-2"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-2"
                data-testid="button-login"
              >
                <LogIn className="w-4 h-4" />
                Login करा
              </Button>
            </Link>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  );
}
