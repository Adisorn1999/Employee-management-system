"use client";

import { AxiosError } from "axios";
import { Check, Pencil, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { listDepartments } from "@/services/department.service";
import { listEmployees } from "@/services/employee.service";
import { approveOffDay, cancelOffDay, createOffDay, listOffDays, rejectOffDay, updateOffDay, type OffDayPayload } from "@/services/off-day.service";
import type { Employee, MonthlyOffDay, OffDayStatus, OffDayType } from "@/types/employee";

const OFF_DAY_TYPES: OffDayType[] = ["MONTHLY_OFF", "EXTRA_OFF", "ROTATION_OFF", "SPECIAL_OFF"];
const OFF_DAY_STATUSES: OffDayStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const QUOTA = 6;

type MonthlyOffFilters = {
  startDate: string;
  endDate: string;
  departmentId: string;
  employeeSearch: string;
  status: "" | OffDayStatus;
  type: "" | OffDayType;
};

function today() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function toDateInputValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function firstDayOfMonth(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return toDateInputValue(new Date(date.getFullYear(), date.getMonth(), 1));
}

function lastDayOfMonth(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return toDateInputValue(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function employeeLabel(employee?: Employee) {
  return employee ? `${employee.name} (${employee.prefix}-${employee.employeeNo})` : "-";
}

function getDefaultFilters(): MonthlyOffFilters {
  const currentDate = today();

  return {
    startDate: firstDayOfMonth(currentDate),
    endDate: lastDayOfMonth(currentDate),
    departmentId: "",
    employeeSearch: "",
    status: "",
    type: "",
  };
}

function matchesEmployeeSearch(employee: Employee | undefined, search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  if (!employee) {
    return false;
  }

  const prefix = employee.prefix.toLowerCase();
  const employeeNo = employee.employeeNo.toLowerCase();
  const name = employee.name.toLowerCase();
  const prefixEmployeeNo = `${prefix}-${employeeNo}`;

  return (
    prefix.includes(normalizedSearch) ||
    employeeNo.includes(normalizedSearch) ||
    name.includes(normalizedSearch) ||
    prefixEmployeeNo.includes(normalizedSearch)
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof AxiosError && typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : fallback;
}

function statusClass(status: OffDayStatus) {
  const classes: Record<OffDayStatus, string> = {
    PENDING: "bg-amber-100 text-amber-900 hover:bg-amber-100",
    APPROVED: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
    REJECTED: "bg-rose-100 text-rose-900 hover:bg-rose-100",
    CANCELLED: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  };

  return classes[status];
}

function emptyForm(): OffDayPayload {
  return { employeeId: "", offDate: today(), type: "MONTHLY_OFF", reason: "" };
}

export default function MonthlyOffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<MonthlyOffFilters>(() => getDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<MonthlyOffFilters>(() => getDefaultFilters());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedOffDay, setSelectedOffDay] = useState<MonthlyOffDay | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState<OffDayPayload>(emptyForm());
  const offDaysQuery = useQuery({
    queryKey: ["off-days", "monthly-off", appliedFilters],
    queryFn: () =>
      listOffDays({
        fromDate: appliedFilters.startDate,
        toDate: appliedFilters.endDate,
        status: appliedFilters.status || undefined,
        type: appliedFilters.type || undefined,
      }),
  });
  const employeesQuery = useQuery({
    queryKey: ["employees", "off-day-options"],
    queryFn: () => listEmployees({ page: 1, limit: 100, isActive: "true" }),
  });
  const departmentsQuery = useQuery({
    queryKey: ["departments", "monthly-off-filter"],
    queryFn: () => listDepartments({ page: 1, limit: 100, isActive: "true" }),
  });
  const offDays = useMemo(
    () =>
      (offDaysQuery.data?.data ?? []).filter((offDay) => {
        const employee = offDay.employee;
        const matchesDepartment =
          !appliedFilters.departmentId || employee?.departmentId === appliedFilters.departmentId;

        return (
          matchesDepartment &&
          matchesEmployeeSearch(employee, appliedFilters.employeeSearch)
        );
      }),
    [appliedFilters.departmentId, appliedFilters.employeeSearch, offDaysQuery.data?.data],
  );
  const employees = employeesQuery.data?.data ?? [];
  const departments = departmentsQuery.data?.data ?? [];
  const employeeOptions = useMemo(() => employees.map((employee) => ({ id: employee.id, label: employeeLabel(employee) })), [employees]);
  const usedMonthlyOffCount = offDays.filter((offDay) => offDay.status === "APPROVED" && offDay.type === "MONTHLY_OFF").length;
  const quota = offDaysQuery.data?.meta?.quota ?? QUOTA;

  const createMutation = useMutation({ mutationFn: createOffDay, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["off-days"] }) });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: OffDayPayload }) => updateOffDay(id, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["off-days"] }) });
  const approveMutation = useMutation({ mutationFn: approveOffDay, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["off-days"] }) });
  const rejectMutation = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectOffDay(id, reason), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["off-days"] }) });
  const cancelMutation = useMutation({ mutationFn: cancelOffDay, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["off-days"] }) });

  function showWarning(warning?: string) {
    if (warning) {
      toast({ title: warning, description: "This off day is allowed and flagged as over quota." });
    }
  }

  function openCreate() {
    setSelectedOffDay(null);
    setForm({ ...emptyForm(), employeeId: employeeOptions[0]?.id || "", offDate: appliedFilters.startDate });
    setDialogOpen(true);
  }

  function updateFilter<K extends keyof MonthlyOffFilters>(key: K, value: MonthlyOffFilters[K]) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  }

  function applyFilters() {
    setAppliedFilters({
      ...filters,
      employeeSearch: filters.employeeSearch.trim(),
    });
  }

  function clearFilters() {
    const defaultFilters = getDefaultFilters();
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }

  function openEdit(offDay: MonthlyOffDay) {
    setSelectedOffDay(offDay);
    setForm({
      employeeId: offDay.employeeId,
      offDate: offDay.offDate.slice(0, 10),
      type: offDay.type,
      reason: offDay.reason ?? "",
    });
    setDialogOpen(true);
  }

  async function submitForm() {
    if (!form.employeeId || !form.offDate) {
      toast({ title: "Missing off day details", description: "Employee and date are required.", variant: "destructive" });
      return;
    }

    try {
      const payload = { ...form, reason: form.reason?.trim() || null };
      const result = selectedOffDay
        ? await updateMutation.mutateAsync({ id: selectedOffDay.id, payload })
        : await createMutation.mutateAsync(payload);
      showWarning(result.warning);
      toast({ title: selectedOffDay ? "Off day updated" : "Off day created", description: "The off day request was saved." });
      setDialogOpen(false);
    } catch (error) {
      toast({ title: "Unable to save off day", description: errorMessage(error, "Check the off day details."), variant: "destructive" });
    }
  }

  async function approve(offDay: MonthlyOffDay) {
    try {
      const result = await approveMutation.mutateAsync(offDay.id);
      showWarning(result.warning);
      toast({ title: "Off day approved", description: `${employeeLabel(offDay.employee)} is marked off.` });
    } catch (error) {
      toast({ title: "Unable to approve off day", description: errorMessage(error, "Try again."), variant: "destructive" });
    }
  }

  async function cancel(offDay: MonthlyOffDay) {
    try {
      await cancelMutation.mutateAsync(offDay.id);
      toast({ title: "Off day cancelled", description: "The request was cancelled." });
    } catch (error) {
      toast({ title: "Unable to cancel off day", description: errorMessage(error, "Try again."), variant: "destructive" });
    }
  }

  async function confirmReject() {
    if (!selectedOffDay) {
      return;
    }

    try {
      await rejectMutation.mutateAsync({ id: selectedOffDay.id, reason: rejectReason.trim() });
      toast({ title: "Off day rejected", description: "The request was rejected." });
      setRejectOpen(false);
      setSelectedOffDay(null);
      setRejectReason("");
    } catch (error) {
      toast({ title: "Unable to reject off day", description: errorMessage(error, "Reject reason is required."), variant: "destructive" });
    }
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Monthly Off</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage employee off days with a 6-day monthly quota.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />New off day</Button>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Off day requests</CardTitle>
              <CardDescription>
                {offDays.length} requests, {usedMonthlyOffCount} approved monthly off days
                {usedMonthlyOffCount > quota && <Badge className="ml-2 bg-rose-100 text-rose-900 hover:bg-rose-100">Over quota</Badge>}
              </CardDescription>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[180px_180px_auto]">
            <div>
              <Label htmlFor="monthly-off-start-date">Start date</Label>
              <Input
                id="monthly-off-start-date"
                className="mt-2"
                type="date"
                value={filters.startDate}
                onChange={(event) => updateFilter("startDate", event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="monthly-off-end-date">End date</Label>
              <Input
                id="monthly-off-end-date"
                className="mt-2"
                type="date"
                value={filters.endDate}
                onChange={(event) => updateFilter("endDate", event.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" className="mt-2" onClick={applyFilters}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button type="button" variant="outline" className="mt-2" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[220px_minmax(220px,1fr)_180px_180px]">
            <div>
              <Label htmlFor="monthly-off-department">Department</Label>
              <Select
                id="monthly-off-department"
                className="mt-2"
                value={filters.departmentId}
                onChange={(event) => updateFilter("departmentId", event.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="monthly-off-employee-search">Employee</Label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="monthly-off-employee-search"
                  className="pl-9"
                  placeholder="Prefix, employee no, name, or prefix-employeeNo"
                  value={filters.employeeSearch}
                  onChange={(event) => updateFilter("employeeSearch", event.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="monthly-off-status">Status</Label>
              <Select
                id="monthly-off-status"
                className="mt-2"
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value as MonthlyOffFilters["status"])}
              >
                <option value="">All statuses</option>
                {OFF_DAY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="monthly-off-type">Type</Label>
              <Select
                id="monthly-off-type"
                className="mt-2"
                value={filters.type}
                onChange={(event) => updateFilter("type", event.target.value as MonthlyOffFilters["type"])}
              >
                <option value="">All types</option>
                {OFF_DAY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Off date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quota</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-52 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offDaysQuery.isLoading && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading off days...</TableCell></TableRow>}
              {!offDaysQuery.isLoading && offDays.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No off days found.</TableCell></TableRow>}
              {offDays.map((offDay) => (
                <TableRow key={offDay.id}>
                  <TableCell className="font-medium">{employeeLabel(offDay.employee)}</TableCell>
                  <TableCell>{formatDate(offDay.offDate)}</TableCell>
                  <TableCell>{offDay.type}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusClass(offDay.status)}>{offDay.status}</Badge></TableCell>
                  <TableCell>{offDay.isOverQuota ? <Badge className="bg-rose-100 text-rose-900 hover:bg-rose-100">Over quota</Badge> : "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">{offDay.reason || offDay.rejectReason || "-"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" aria-label="Edit off day" disabled={offDay.status !== "PENDING"} onClick={() => openEdit(offDay)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" aria-label="Approve off day" disabled={offDay.status !== "PENDING" || approveMutation.isPending} onClick={() => approve(offDay)}><Check className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" aria-label="Reject off day" disabled={offDay.status !== "PENDING" || rejectMutation.isPending} onClick={() => { setSelectedOffDay(offDay); setRejectReason(""); setRejectOpen(true); }}><X className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" disabled={offDay.status === "CANCELLED" || offDay.status === "REJECTED" || cancelMutation.isPending} onClick={() => cancel(offDay)}>Cancel</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedOffDay ? "Edit off day" : "Create off day"}</DialogTitle>
            <DialogDescription>Monthly off counts toward the 6-day quota. Other off types do not.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div><Label htmlFor="off-employee">Employee</Label><Select id="off-employee" className="mt-2" value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}><option value="">Select employee</option>{employeeOptions.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="off-date">Off date</Label><Input id="off-date" className="mt-2" type="date" value={form.offDate} onChange={(event) => setForm({ ...form, offDate: event.target.value })} /></div>
              <div><Label htmlFor="off-type">Type</Label><Select id="off-type" className="mt-2" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as OffDayType })}>{OFF_DAY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</Select></div>
            </div>
            <div><Label htmlFor="off-reason">Reason</Label><Textarea id="off-reason" className="mt-2" value={form.reason ?? ""} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" disabled={createMutation.isPending || updateMutation.isPending} onClick={submitForm}>Save off day</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject off day</DialogTitle>
            <DialogDescription>Provide the reason for rejecting this request.</DialogDescription>
          </DialogHeader>
          <div><Label htmlFor="reject-reason">Reject reason</Label><Textarea id="reject-reason" className="mt-2" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={!rejectReason.trim() || rejectMutation.isPending} onClick={confirmReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
