"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Gift,
  Wallet,
  FileText,
  Users,
  Building2,
  Settings,
  LogOut,
  CreditCard,
  TrendingDown,
  BookOpen,
  ShoppingCart,
  Bell,
  ListChecks,
  Calendar,
  Building,
  Archive,
  Landmark,
  Package,
  Gem,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { getVisibleMenuItems } from "@/lib/menu-utils";

interface SidebarProps {
  role: string;
  className?: string;
  onItemClick?: () => void;
}

export default function Sidebar({ role, className, onItemClick }: SidebarProps) {
  const pathname = usePathname();
  const visibleMenuGroups = getVisibleMenuItems(role);

  return (
    <aside className={cn("w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border", className)}>
      {/* Branding */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">
              Temple Trust
            </h1>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest font-semibold">
              Management System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
        {visibleMenuGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            <h3 className="px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
              {group.group}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group relative",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-400 rounded-r-full" />
                    )}
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-colors",
                        isActive
                          ? "text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/80",
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-red-400 hover:bg-red-500/10 gap-3 px-3"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Logout</span>
        </Button>
      </div>
    </aside>
  );
}
