"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getEmployee,
  listEmployeeAttendance,
  listEmployeeShiftSchedules,
} from "@/services/employee.service";
import type { AttendanceRecord, Employee, ShiftSchedule } from "@/types/employee";

function getEmployeeCode(employee: Employee) {
  return `${employee.prefix}-${employee.employeeNo}`;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "-",
    lastName: parts.slice(1).join(" ") || "-",
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLabel(value?: string | null) {
  if (!value) {
    return "-";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getTelegramLink(telegramUsername?: string | null) {
  const username = telegramUsername?.replace(/^@/, "");

  return username ? `https://t.me/${encodeURIComponent(username)}` : null;
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value || "-"}</div>
    </div>
  );
}

function TableMessage({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

function ProfileTab({ employee }: { employee: Employee }) {
  const { firstName, lastName } = splitName(employee.name);
  const telegramLink = getTelegramLink(employee.telegramUsername);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Core employee information from the employee record.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailField label="Employee code" value={getEmployeeCode(employee)} />
        <DetailField label="First name" value={firstName} />
        <DetailField label="Last name" value={lastName} />
        <DetailField label="Phone" value={employee.phone || "-"} />
        <DetailField
          label="Telegram username"
          value={
            telegramLink ? (
              <a
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                href={telegramLink}
                target="_blank"
                rel="noreferrer"
              >
                {employee.telegramUsername}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              "-"
            )
          }
        />
        <DetailField label="Department" value={employee.department?.name || "-"} />
        <DetailField label="Position" value={employee.jobPosition?.name || employee.position || "-"} />
        <DetailField label="Employment type" value={employee.employmentType || "-"} />
        <DetailField
          label="Status"
          value={<Badge variant={employee.isActive ? "secondary" : "outline"}>{employee.isActive ? "Active" : "Inactive"}</Badge>}
        />
        <DetailField label="Hired date" value={formatDate(employee.hiredDate ?? employee.createdAt)} />
      </CardContent>
    </Card>
  );
}

function AttendanceTab({
  attendance,
  isLoading,
  isError,
}: {
  attendance: AttendanceRecord[];
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
        <CardDescription>Recent attendance records for this employee.</CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Unable to load attendance records.
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Check in</TableHead>
              <TableHead>Check out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Late min</TableHead>
              <TableHead>Overtime min</TableHead>
              <TableHead>Work min</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableMessage colSpan={7} message="Loading attendance records..." />}
            {!isLoading && attendance.length === 0 && <TableMessage colSpan={7} message="No attendance records found." />}
            {!isLoading &&
              attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{formatDate(record.shiftSchedule?.workDate ?? record.checkInAt)}</TableCell>
                  <TableCell>{formatTime(record.checkInAt)}</TableCell>
                  <TableCell>{formatTime(record.checkOutAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatLabel(record.status)}</Badge>
                  </TableCell>
                  <TableCell>{record.lateMinutes}</TableCell>
                  <TableCell>{record.overtimeMinutes}</TableCell>
                  <TableCell>{record.workMinutes}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ShiftTab({
  schedules,
  isLoading,
  isError,
}: {
  schedules: ShiftSchedule[];
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift</CardTitle>
        <CardDescription>Assigned shift schedules for this employee.</CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Unable to load shift schedules.
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Work date</TableHead>
              <TableHead>Shift name</TableHead>
              <TableHead>Start time</TableHead>
              <TableHead>End time</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableMessage colSpan={5} message="Loading shift schedules..." />}
            {!isLoading && schedules.length === 0 && <TableMessage colSpan={5} message="No shift schedules found." />}
            {!isLoading &&
              schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>{formatDate(schedule.workDate)}</TableCell>
                  <TableCell>{schedule.shift?.name || "-"}</TableCell>
                  <TableCell>{schedule.shift?.startTime || "-"}</TableCell>
                  <TableCell>{schedule.shift?.endTime || "-"}</TableCell>
                  <TableCell>{schedule.note || "-"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TelegramTab({ employee }: { employee: Employee }) {
  const telegramLink = getTelegramLink(employee.telegramUsername);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram</CardTitle>
        <CardDescription>Telegram contact information for this employee.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <DetailField label="Telegram username" value={employee.telegramUsername || "-"} />
        {telegramLink ? (
          <Button asChild>
            <a href={telegramLink} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              Open chat
            </a>
          </Button>
        ) : (
          <Button disabled>
            <MessageCircle className="h-4 w-4" />
            Open chat
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EmergencyContactTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Emergency Contact</CardTitle>
        <CardDescription>Emergency contact fields are ready for backend support.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailField label="Emergency contact name" value="-" />
        <DetailField label="Emergency phone" value="-" />
        <DetailField label="Relationship" value="-" />
        <DetailField label="Note" value="-" />
      </CardContent>
    </Card>
  );
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const employeeId = params.id;

  const employeeQuery = useQuery({
    queryKey: ["employees", employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: Boolean(employeeId),
  });

  const attendanceQuery = useQuery({
    queryKey: ["employee-attendance", employeeId],
    queryFn: () => listEmployeeAttendance(employeeId),
    enabled: Boolean(employeeId),
  });

  const schedulesQuery = useQuery({
    queryKey: ["employee-shift-schedules", employeeId],
    queryFn: () => listEmployeeShiftSchedules(employeeId),
    enabled: Boolean(employeeId),
  });

  const employee = employeeQuery.data;

  return (
    <DashboardShell>
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/employees")}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {employeeQuery.isLoading && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading employee profile...</CardContent>
          </Card>
        )}

        {employeeQuery.isError && (
          <Card>
            <CardHeader>
              <CardTitle>Employee not available</CardTitle>
              <CardDescription>Unable to load this employee. Check your session and backend API.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/employees">Return to employees</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {employee && (
          <>
            <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-normal">{employee.name}</h1>
                  <Badge variant={employee.isActive ? "secondary" : "outline"}>
                    {employee.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                  <span>{getEmployeeCode(employee)}</span>
                  <span>{employee.department?.name || "No department"}</span>
                  <span>{employee.jobPosition?.name || employee.position || "No position"}</span>
                </div>
              </div>
            </div>

            <Tabs defaultValue="profile" className="mt-6">
              <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="shift">Shift</TabsTrigger>
                <TabsTrigger value="telegram">Telegram</TabsTrigger>
                <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <ProfileTab employee={employee} />
              </TabsContent>
              <TabsContent value="attendance">
                <AttendanceTab
                  attendance={attendanceQuery.data ?? []}
                  isLoading={attendanceQuery.isLoading}
                  isError={attendanceQuery.isError}
                />
              </TabsContent>
              <TabsContent value="shift">
                <ShiftTab
                  schedules={schedulesQuery.data ?? []}
                  isLoading={schedulesQuery.isLoading}
                  isError={schedulesQuery.isError}
                />
              </TabsContent>
              <TabsContent value="telegram">
                <TelegramTab employee={employee} />
              </TabsContent>
              <TabsContent value="emergency">
                <EmergencyContactTab />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
