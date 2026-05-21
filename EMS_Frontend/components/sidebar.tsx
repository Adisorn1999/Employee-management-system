"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock3,
  CreditCard,
  LayoutDashboard,
  List,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const employeeItems = [
  { href: "/employees", labelKey: "nav.employeeList" as const, icon: List },
];

const departmentPositionItems = [
  { href: "/employees/departments", labelKey: "nav.departments" as const, icon: Building2 },
  { href: "/employees/positions", labelKey: "nav.positions" as const, icon: BriefcaseBusiness },
];

const workItems = [
  { href: "/shifts", labelKey: "nav.shiftList" as const, icon: List },
  { href: "/shifts/schedule", labelKey: "nav.scheduleAttendance" as const, icon: CalendarDays },
  { href: "/shifts/monthly-off", labelKey: "nav.monthlyOff" as const, icon: CalendarDays },
  { href: "/shifts/leave-requests", labelKey: "nav.leaveRequests" as const, icon: List },
];

const reportItems = [
  { href: "/reports/attendance", labelKey: "nav.attendanceReport" as const, icon: CalendarDays },
  { href: "/reports/late-overtime", labelKey: "nav.lateOtReport" as const, icon: Clock3 },
  { href: "/reports/monthly-off", labelKey: "nav.offDayReport" as const, icon: CalendarDays },
  { href: "/reports/employee-summary", labelKey: "nav.employeeSummary" as const, icon: Users },
];

const financeItems = [
  { href: "/finance/accounts", labelKey: "nav.financeAccountList" as const, icon: List },
  { href: "/finance/templates", labelKey: "nav.financeTemplates" as const, icon: Settings },
  { href: "/finance/field-definitions", labelKey: "nav.financeFieldDefinitions" as const, icon: List },
];

const settingsItems = [
  { href: "/settings/account-lines", labelKey: "nav.accountLines" as const, icon: List },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const isEmployeeRoute = pathname.startsWith("/employees");
  const isDepartmentPositionRoute = pathname.startsWith("/employees/departments") || pathname.startsWith("/employees/positions");
  const isWorkRoute = pathname.startsWith("/shifts");
  const isReportRoute = pathname.startsWith("/reports");
  const isFinanceRoute = pathname.startsWith("/finance");
  const isSettingsRoute = pathname.startsWith("/settings");
  const [employeesOpen, setEmployeesOpen] = useState(isEmployeeRoute);
  const [departmentsOpen, setDepartmentsOpen] = useState(isDepartmentPositionRoute);
  const [workOpen, setWorkOpen] = useState(isWorkRoute);
  const [reportsOpen, setReportsOpen] = useState(isReportRoute);
  const [financeOpen, setFinanceOpen] = useState(isFinanceRoute);
  const [settingsOpen, setSettingsOpen] = useState(isSettingsRoute);

  useEffect(() => {
    if (isEmployeeRoute) {
      setEmployeesOpen(true);
    }
  }, [isEmployeeRoute]);

  useEffect(() => {
    if (isDepartmentPositionRoute) {
      setDepartmentsOpen(true);
    }
  }, [isDepartmentPositionRoute]);

  useEffect(() => {
    if (isWorkRoute) {
      setWorkOpen(true);
    }
  }, [isWorkRoute]);

  useEffect(() => {
    if (isReportRoute) {
      setReportsOpen(true);
    }
  }, [isReportRoute]);

  useEffect(() => {
    if (isFinanceRoute) {
      setFinanceOpen(true);
    }
  }, [isFinanceRoute]);

  useEffect(() => {
    if (isSettingsRoute) {
      setSettingsOpen(true);
    }
  }, [isSettingsRoute]);

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <p className="text-base font-semibold">EMS Admin</p>
          <p className="text-xs text-muted-foreground">{t("app.subtitle")}</p>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        <Link
          href="/dashboard"
          className={cn(
            "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            pathname === "/dashboard" && "bg-secondary text-foreground"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          {t("nav.dashboard")}
        </Link>

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
            <span className="flex-1 text-left">{t("nav.employees")}</span>
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
                      {t(item.labelKey)}
                    </Link>
                  );
                })}

                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-9 w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                      isDepartmentPositionRoute && "bg-secondary text-foreground"
                    )}
                    onClick={() => setDepartmentsOpen((open) => !open)}
                    aria-expanded={departmentsOpen}
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="flex-1 text-left">{t("nav.departmentsAndPositions")}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform duration-200", departmentsOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </Button>
                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-in-out",
                      departmentsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-1 space-y-1 pl-5">
                        {departmentPositionItems.map((item) => {
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
                              {t(item.labelKey)}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-10 w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              isWorkRoute && "bg-secondary text-foreground"
            )}
            onClick={() => setWorkOpen((open) => !open)}
            aria-expanded={workOpen}
          >
            <Clock3 className="h-4 w-4" />
            <span className="flex-1 text-left">{t("nav.workManagement")}</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", workOpen && "rotate-180")}
              aria-hidden="true"
            />
          </Button>
          <div
            className={cn(
              "grid transition-all duration-200 ease-in-out",
              workOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-1 space-y-1 pl-6">
                {workItems.map((item) => {
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
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-10 w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              isReportRoute && "bg-secondary text-foreground"
            )}
            onClick={() => setReportsOpen((open) => !open)}
            aria-expanded={reportsOpen}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="flex-1 text-left">{t("nav.reports")}</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", reportsOpen && "rotate-180")}
              aria-hidden="true"
            />
          </Button>
          <div
            className={cn(
              "grid transition-all duration-200 ease-in-out",
              reportsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-1 space-y-1 pl-6">
                {reportItems.map((item) => {
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
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-10 w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              isFinanceRoute && "bg-secondary text-foreground"
            )}
            onClick={() => setFinanceOpen((open) => !open)}
            aria-expanded={financeOpen}
          >
            <CreditCard className="h-4 w-4" />
            <span className="flex-1 text-left">{t("nav.financeAccounts")}</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", financeOpen && "rotate-180")}
              aria-hidden="true"
            />
          </Button>
          <div
            className={cn(
              "grid transition-all duration-200 ease-in-out",
              financeOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-1 space-y-1 pl-6">
                {financeItems.map((item) => {
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
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "h-10 w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              isSettingsRoute && "bg-secondary text-foreground"
            )}
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
          >
            <Settings className="h-4 w-4" />
            <span className="flex-1 text-left">{t("nav.settings")}</span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", settingsOpen && "rotate-180")}
              aria-hidden="true"
            />
          </Button>
          <div
            className={cn(
              "grid transition-all duration-200 ease-in-out",
              settingsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-1 space-y-1 pl-6">
                {settingsItems.map((item) => {
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
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <div className="mx-3 mt-4 rounded-lg border bg-background p-4">
        <BarChart3 className="mb-3 h-5 w-5 text-accent" />
        <p className="text-sm font-medium">{t("app.phaseTitle")}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("app.phaseDescription")}</p>
      </div>
    </aside>
  );
}
