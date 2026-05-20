"use client";

import { AxiosError } from "axios";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { createShift, deleteShift, listShifts, updateShift, type ShiftPayload } from "@/services/shift.service";
import type { Shift } from "@/types/employee";

type ShiftFormState = ShiftPayload;

const emptyForm: ShiftFormState = {
  code: "DAY",
  name: "",
  startTime: "09:00",
  endTime: "18:00",
  color: "",
  isActive: true,
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    return typeof message === "string" ? message : fallback;
  }

  return fallback;
}

export default function ShiftsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const shiftsQuery = useQuery({
    queryKey: ["shifts"],
    queryFn: () => listShifts(),
  });

  const createMutation = useMutation({
    mutationFn: createShift,
    onSuccess: (shift) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast({ title: "Shift created", description: `${shift.code} is ready to schedule.` });
    },
    onError: (error) => {
      toast({ title: "Unable to create shift", description: getErrorMessage(error, "Try again."), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ShiftPayload> }) => updateShift(id, payload),
    onSuccess: (shift) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast({ title: "Shift updated", description: `${shift.code} was saved.` });
    },
    onError: (error) => {
      toast({ title: "Unable to update shift", description: getErrorMessage(error, "Try again."), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShift,
    onSuccess: (shift) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast({ title: "Shift deactivated", description: `${shift.code} is no longer active.` });
    },
    onError: (error) => {
      toast({ title: "Unable to deactivate shift", description: getErrorMessage(error, "Try again."), variant: "destructive" });
    },
  });

  useEffect(() => {
    if (shiftsQuery.isError) {
      toast({ title: "Unable to load shifts", description: "Check your session and backend API.", variant: "destructive" });
    }
  }, [shiftsQuery.isError, toast]);

  function handleCreate() {
    setSelectedShift(null);
    setFormOpen(true);
  }

  function handleEdit(shift: Shift) {
    setSelectedShift(shift);
    setFormOpen(true);
  }

  async function handleSubmit(payload: ShiftPayload) {
    if (selectedShift) {
      await updateMutation.mutateAsync({ id: selectedShift.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Shift List</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage shifts used by employee schedules.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          New shift
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shifts</CardTitle>
          <CardDescription>{shiftsQuery.data ? `${shiftsQuery.data.length} shifts configured` : "Records from the shift API"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading shifts...
                  </TableCell>
                </TableRow>
              )}
              {!shiftsQuery.isLoading && shiftsQuery.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No shifts found.
                  </TableCell>
                </TableRow>
              )}
              {!shiftsQuery.isLoading &&
                shiftsQuery.data?.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <Badge variant={shift.code === "NIGHT" ? "default" : "secondary"}>{shift.code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{shift.name}</TableCell>
                    <TableCell>
                      {shift.startTime}-{shift.endTime}
                    </TableCell>
                    <TableCell>
                      <Badge variant={shift.isActive ? "secondary" : "outline"}>
                        {shift.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" aria-label="Edit shift" onClick={() => handleEdit(shift)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Deactivate shift"
                          disabled={!shift.isActive || deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(shift.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ShiftFormDialog
        open={formOpen}
        shift={selectedShift}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
      />
    </DashboardShell>
  );
}

function ShiftFormDialog({
  open,
  shift,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  shift: Shift | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ShiftPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<ShiftFormState>(emptyForm);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(
        shift
          ? {
              code: shift.code,
              name: shift.name,
              startTime: shift.startTime,
              endTime: shift.endTime,
              color: shift.color ?? "",
              isActive: shift.isActive,
            }
          : emptyForm
      );
      setServerError(null);
    }
  }, [open, shift]);

  async function handleSubmit() {
    setServerError(null);

    if (!form.name.trim()) {
      setServerError("Name is required.");
      return;
    }

    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        color: form.color?.trim() || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(getErrorMessage(error, "Unable to save shift."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{shift ? "Edit shift" : "Create shift"}</DialogTitle>
          <DialogDescription>Maintain the DAY and NIGHT shifts used by schedules.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="shift-code">Code</Label>
              <Select
                id="shift-code"
                className="mt-2"
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value as "DAY" | "NIGHT" }))}
              >
                <option value="DAY">DAY</option>
                <option value="NIGHT">NIGHT</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="shift-name">Name</Label>
              <Input
                id="shift-name"
                className="mt-2"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="shift-start">Start time</Label>
              <Input
                id="shift-start"
                className="mt-2"
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="shift-end">End time</Label>
              <Input
                id="shift-end"
                className="mt-2"
                type="time"
                value={form.endTime}
                onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="shift-color">Color</Label>
            <Input
              id="shift-color"
              className="mt-2"
              placeholder="Optional color token"
              value={form.color}
              onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              className="h-4 w-4 rounded border-input"
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Active shift
          </label>
          {serverError && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving} onClick={handleSubmit}>
            {isSaving ? "Saving..." : "Save shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
