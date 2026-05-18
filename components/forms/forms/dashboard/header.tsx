"use client";

import { User as SessionUser } from "next-auth";
import { Bell, Sun, Moon, ChevronRight, Home, Calendar, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { useMemo, useEffect, useState } from "react";
import { getLabelForPath } from "@/lib/menu-utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./sidebar";

interface HeaderProps {
  user?: SessionUser;
  role: string;
}

interface FinancialYear {
  id: string;
  yearCode: string;
}

const pageNames: Record<string, string> = {
  "/dashboard/reports": "Reports & Analytics",
};

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Header({ user, role }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [currentFY, setCurrentFY] = useState<FinancialYear | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/financial-years?isCurrent=true")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setCurrentFY(data);
        }
      })
      .catch((err) => console.error("Error fetching current FY:", err));
  }, []);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");
      const label =
        pageNames[href] ||
        getLabelForPath(href) ||
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
      return { href, label };
    });
  }, [pathname]);

  return (
    <header className="bg-background border-b border-border px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Trigger */}
        <div className="lg:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-none">
              <Sidebar 
                role={role} 
                className="w-full h-full border-none shadow-none" 
                onItemClick={() => setIsOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {index === 0 ? (
              <Home className="w-4 h-4 text-muted-foreground" />
            ) : index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <span className="text-muted-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>

      <div className="flex items-center gap-3">
        {/* Financial Year Badge */}
        {currentFY && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-full">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              FY {currentFY.yearCode}
            </span>
          </div>
        )}

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-muted"
        >
          <Bell className="w-4.5 h-4.5" />
        </Button>

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-muted"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4.5 w-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4.5 w-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User info */}
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-semibold">
            {getInitials(user?.name)}
          </div>
        </div>
      </div>
    </header>
  );
}
