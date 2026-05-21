"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Clock3, LayoutDashboard, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard" as const, icon: LayoutDashboard },
  { href: "/employees", labelKey: "nav.employees" as const, icon: Users },
  { href: "/shifts", labelKey: "nav.workManagement" as const, icon: Clock3 },
  { href: "/reports/attendance", labelKey: "nav.reports" as const, icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="grid grid-cols-4 gap-1 border-b bg-card p-2 md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/employees"
            ? pathname.startsWith("/employees")
            : item.href === "/shifts"
              ? pathname.startsWith("/shifts")
              : item.href.startsWith("/reports")
                ? pathname.startsWith("/reports")
              : pathname === item.href;

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
            <span className="max-w-full truncate">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
