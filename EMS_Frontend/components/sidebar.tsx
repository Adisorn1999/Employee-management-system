"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronDown,
  Clock3,
  LayoutDashboard,
  List,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/shifts", label: "Shifts", icon: Clock3 },
  { href: "/attendance", label: "Attendance", icon: CalendarClock },
];

const employeeItems = [
  { href: "/employees", label: "Employee List", icon: List },
  { href: "/employees/departments", label: "Departments", icon: Building2 },
  { href: "/employees/positions", label: "Positions", icon: BriefcaseBusiness },
];

export function Sidebar() {
  const pathname = usePathname();
  const isEmployeeRoute = pathname.startsWith("/employees");
  const [employeesOpen, setEmployeesOpen] = useState(isEmployeeRoute);

  useEffect(() => {
    if (isEmployeeRoute) {
      setEmployeesOpen(true);
    }
  }, [isEmployeeRoute]);

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <p className="text-base font-semibold">EMS Admin</p>
          <p className="text-xs text-muted-foreground">Operations Console</p>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {navItems.slice(0, 1).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                active && "bg-secondary text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <div>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-10 w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              isEmployeeRoute && "bg-secondary text-foreground"
            )}
            onClick={() => setEmployeesOpen((open) => !open)}
            aria-expanded={employeesOpen}
          >
            <Users className="h-4 w-4" />
            <span className="flex-1 text-left">Employees</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", employeesOpen && "rotate-180")}
              aria-hidden="true"
            />
          </Button>
          <div
            className={cn(
              "grid transition-all duration-200 ease-in-out",
              employeesOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-1 space-y-1 pl-6">
                {employeeItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                        active && "bg-secondary text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {navItems.slice(1).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
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
