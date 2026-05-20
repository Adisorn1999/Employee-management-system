"use client";

import { AxiosError } from "axios";
import { Check, Plus, X } from "lucide-react";
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
import { listEmployees } from "@/services/employee.service";
import { approveLeave, cancelLeave, createLeave, listLeaves, rejectLeave, type LeavePayload } from "@/services/leave.service";
import type { Employee, LeaveRequest, LeaveStatus, LeaveType } from "@/types/employee";

const LEAVE_TYPES: LeaveType[] = ["SICK", "PERSONAL", "VACATION", "UNPAID", "OTHER"];

function today() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function employeeLabel(employee?: Employee) {
  return employee ? `${employee.name} (${employee.prefix}-${employee.employeeNo})` : "-";
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof AxiosError && typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : fallback;
}

function statusClass(status: LeaveStatus) {
  const classes: Record<LeaveStatus, string> = {
    PENDING: "bg-amber-100 text-amber-900 hover:bg-amber-100",
    APPROVED: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
    REJECTED: "bg-rose-100 text-rose-900 hover:bg-rose-100",
    CANCELLED: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  };

  return classes[status];
}

function emptyForm(): LeavePayload {
  const date = today();
  return { employeeId: "", leaveType: "SICK", startDate: date, endDate: date, reason: "" };
}

export default function LeavesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState<LeavePayload>(emptyForm());
  const leavesQuery = useQuery({ queryKey: ["leaves"], queryFn: () => listLeaves() });
  const employeesQuery = useQuery({
    queryKey: ["employees", "leave-options"],
    queryFn: () => listEmployees({ page: 1, limit: 100, isActive: "true" }),
  });
  const leaves = leavesQuery.data ?? [];
  const employees = employeesQuery.data?.data ?? [];
  const employeeOptions = useMemo(() => employees.map((employee) => ({ id: employee.id, label: employeeLabel(employee) })), [employees]);

  const createMutation = useMutation({ mutationFn: createLeave, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaves"] }) });
  const approveMutation = useMutation({ mutationFn: approveLeave, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaves"] }) });
  const rejectMutation = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectLeave(id, reason), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaves"] }) });
  const cancelMutation = useMutation({ mutationFn: cancelLeave, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leaves"] }) });

  function openCreate() {
    setForm({ ...emptyForm(), employeeId: employeeOptions[0]?.id ?? "" });
    setDialogOpen(true);
  }

  async function submitForm() {
    if (!form.employeeId || !form.startDate || !form.endDate) {
      toast({ title: "Missing leave details", description: "Employee and date range are required.", variant: "destructive" });
      return;
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast({ title: "Invalid date range", description: "End date cannot be before start date.", variant: "destructive" });
      return;
    }

    try {
      await createMutation.mutateAsync({ ...form, reason: form.reason?.trim() || null });
      toast({ title: "Leave request created", description: "The request is pending approval." });
      setDialogOpen(false);
    } catch (error) {
      toast({ title: "Unable to create leave", description: errorMessage(error, "Check the leave details."), variant: "destructive" });
    }
  }

  async function approve(leave: LeaveRequest) {
    try {
      await approveMutation.mutateAsync(leave.id);
      toast({ title: "Leave approved", description: `${employeeLabel(leave.employee)} is marked on leave.` });
    } catch (error) {
      toast({ title: "Unable to approve leave", description: errorMessage(error, "Try again."), variant: "destructive" });
    }
  }

  async function cancel(leave: LeaveRequest) {
    try {
      await cancelMutation.mutateAsync(leave.id);
      toast({ title: "Leave cancelled", description: "The request was cancelled." });
    } catch (error) {
      toast({ title: "Unable to cancel leave", description: errorMessage(error, "Try again."), variant: "destructive" });
    }
  }

  async function confirmReject() {
    if (!selectedLeave) {
      return;
    }

    try {
      await rejectMutation.mutateAsync({ id: selectedLeave.id, reason: rejectReason.trim() });
      toast({ title: "Leave rejected", description: "The request was rejected." });
      setRejectOpen(false);
      setSelectedLeave(null);
      setRejectReason("");
    } catch (error) {
      toast({ title: "Unable to reject leave", description: errorMessage(error, "Reject reason is required."), variant: "destructive" });
    }
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Leave Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create leave and approve or reject pending requests.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New leave
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave queue</CardTitle>
          <CardDescription>{leaves.length} leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave type</TableHead>
                <TableHead>Start date</TableHead>
                <TableHead>End date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leavesQuery.isLoading && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading leave requests...</TableCell></TableRow>}
              {!leavesQuery.isLoading && leaves.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No leave requests found.</TableCell></TableRow>}
              {leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell className="font-medium">{employeeLabel(leave.employee)}</TableCell>
                  <TableCell>{leave.leaveType}</TableCell>
                  <TableCell>{formatDate(leave.startDate)}</TableCell>
                  <TableCell>{formatDate(leave.endDate)}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusClass(leave.status)}>{leave.status}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{leave.reason || leave.rejectReason || "-"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" aria-label="Approve leave" disabled={leave.status !== "PENDING" || approveMutation.isPending} onClick={() => approve(leave)}><Check className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" aria-label="Reject leave" disabled={leave.status !== "PENDING" || rejectMutation.isPending} onClick={() => { setSelectedLeave(leave); setRejectReason(""); setRejectOpen(true); }}><X className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" disabled={leave.status === "CANCELLED" || leave.status === "REJECTED" || cancelMutation.isPending} onClick={() => cancel(leave)}>Cancel</Button>
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
            <DialogTitle>Create leave request</DialogTitle>
            <DialogDescription>Approved leave blocks attendance punches and marks schedule rows.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div><Label htmlFor="leave-employee">Employee</Label><Select id="leave-employee" className="mt-2" value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}><option value="">Select employee</option>{employeeOptions.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><Label htmlFor="leave-type">Leave type</Label><Select id="leave-type" className="mt-2" value={form.leaveType} onChange={(event) => setForm({ ...form, leaveType: event.target.value as LeaveType })}>{LEAVE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</Select></div>
              <div><Label htmlFor="leave-start">Start date</Label><Input id="leave-start" className="mt-2" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></div>
              <div><Label htmlFor="leave-end">End date</Label><Input id="leave-end" className="mt-2" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></div>
            </div>
            <div><Label htmlFor="leave-reason">Reason</Label><Textarea id="leave-reason" className="mt-2" value={form.reason ?? ""} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="button" disabled={createMutation.isPending} onClick={submitForm}>Create request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject leave</DialogTitle>
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
