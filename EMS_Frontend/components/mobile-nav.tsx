"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Clock3, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/shifts", label: "Shifts", icon: Clock3 },
  { href: "/attendance", label: "Attendance", icon: CalendarClock },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-4 gap-1 border-b bg-card p-2 md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/employees" ? pathname.startsWith("/employees") : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs font-medium text-muted-foreground",
              active && "bg-secondary text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
