"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { usePositions } from "@/hooks/usePositions";
import { listDepartments } from "@/services/department.service";
import type { PositionPayload } from "@/services/position.service";
import type { Department, JobPosition } from "@/types/employee";

const positionSchema = z.object({
  name: z.string().trim().min(1, "Position name is required").max(100, "Position name must be 100 characters or fewer"),
  departmentId: z.string().optional(),
  isActive: z.boolean(),
});

type PositionFormValues = z.infer<typeof positionSchema>;

function toDefaultValues(position?: JobPosition | null): PositionFormValues {
  return {
    name: position?.name ?? "",
    departmentId: position?.departmentId ?? "",
    isActive: position?.isActive ?? true,
  };
}

export default function PositionsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search.trim() || undefined,
    }),
    [page, search]
  );

  const { positionsQuery, createMutation, updateMutation, deleteMutation } = usePositions(params);
  const positions = positionsQuery.data?.data ?? [];
  const meta = positionsQuery.data?.meta;

  function handleCreate() {
    setSelectedPosition(null);
    setFormOpen(true);
  }

  function handleEdit(position: JobPosition) {
    setSelectedPosition(position);
    setFormOpen(true);
  }

  function handleDelete(position: JobPosition) {
    setSelectedPosition(position);
    setDeleteOpen(true);
  }

  async function handleFormSubmit(payload: PositionPayload) {
    if (selectedPosition) {
      await updateMutation.mutateAsync({ id: selectedPosition.id, payload });
      toast({ title: "Position updated", description: `${payload.name} was saved.` });
      return;
    }

    await createMutation.mutateAsync(payload);
    toast({ title: "Position created", description: `${payload.name} is ready to use.` });
  }

  async function handleDeleteConfirm() {
    if (!selectedPosition) {
      return;
    }

    await deleteMutation.mutateAsync(selectedPosition.id);
    toast({ title: "Position deleted", description: `${selectedPosition.name} was deactivated.` });
    setDeleteOpen(false);
    setSelectedPosition(null);
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Positions</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, update, and manage employee positions.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          New position
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle>Position directory</CardTitle>
            <CardDescription>{meta ? `${meta.total} total positions` : "Records from the position API"}</CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search positions"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {positionsQuery.isError && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Unable to load positions. Check your session and backend API.
            </div>
          )}
          <PositionTable
            positions={positions}
            isLoading={positionsQuery.isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PositionFormDialog
        open={formOpen}
        position={selectedPosition}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
      />
      <DeletePositionDialog
        open={deleteOpen}
        position={selectedPosition}
        isDeleting={deleteMutation.isPending}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
      />
    </DashboardShell>
  );
}

function PositionTable({
  positions,
  isLoading,
  onEdit,
  onDelete,
}: {
  positions: JobPosition[];
  isLoading: boolean;
  onEdit: (position: JobPosition) => void;
  onDelete: (position: JobPosition) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Position</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-28 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
              Loading positions...
            </TableCell>
          </TableRow>
        )}
        {!isLoading && positions.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
              No positions found.
            </TableCell>
          </TableRow>
        )}
        {!isLoading &&
          positions.map((position) => (
            <TableRow key={position.id}>
              <TableCell className="font-medium">{position.name}</TableCell>
              <TableCell>{position.department?.name ?? "No department"}</TableCell>
              <TableCell>
                <Badge variant={position.isActive ? "secondary" : "outline"}>
                  {position.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" aria-label="Edit position" onClick={() => onEdit(position)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Delete position" onClick={() => onDelete(position)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

function PositionFormDialog({
  open,
  position,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  position: JobPosition | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: PositionPayload) => Promise<void>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(position);
  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: toDefaultValues(position),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "position-form"],
    queryFn: () => listDepartments({ limit: 100 }),
    enabled: open,
  });
  const departments = departmentsQuery.data?.data ?? [];

  useEffect(() => {
    if (open) {
      form.reset(toDefaultValues(position));
      setServerError(null);
    }
  }, [form, open, position]);

  async function handleSubmit(values: PositionFormValues) {
    setServerError(null);

    try {
      await onSubmit({
        name: values.name,
        departmentId: values.departmentId || undefined,
        isActive: values.isActive,
      });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || "Unable to save position."
          : "Unable to save position.";
      setServerError(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit position" : "Create position"}</DialogTitle>
          <DialogDescription>Maintain position names and their department assignments.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
          <Field label="Position name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </Field>
          <Field label="Department" error={form.formState.errors.departmentId?.message}>
            <Select {...form.register("departmentId")} disabled={departmentsQuery.isLoading}>
              <option value="">No department</option>
              {departments.map((department: Department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input className="h-4 w-4 rounded border-input" type="checkbox" {...form.register("isActive")} />
            Active position
          </label>
          {serverError && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePositionDialog({
  open,
  position,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  position: JobPosition | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete position</DialogTitle>
          <DialogDescription>
            {position
              ? `${position.name} will be deactivated and kept available for existing employee records.`
              : "This position will be deactivated."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
