"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, Clock3, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/shifts", label: "Shifts", icon: Clock3 },
  { href: "/attendance", label: "Attendance", icon: CalendarClock },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <p className="text-base font-semibold">EMS Admin</p>
          <p className="text-xs text-muted-foreground">Operations Console</p>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                active && "bg-secondary text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mx-3 mt-4 rounded-lg border bg-background p-4">
        <BarChart3 className="mb-3 h-5 w-5 text-accent" />
        <p className="text-sm font-medium">Phase 1</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Core auth, navigation, and employee records.</p>
      </div>
    </aside>
  );
}
