"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useDepartments } from "@/hooks/useDepartments";
import type { DepartmentPayload } from "@/services/department.service";
import type { Department } from "@/types/employee";

const departmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
  description: z.string().trim().max(500, "Description must be 500 characters or fewer").optional(),
  isActive: z.boolean(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

function toDefaultValues(department?: Department | null): DepartmentFormValues {
  return {
    name: department?.name ?? "",
    description: department?.description ?? "",
    isActive: department?.isActive ?? true,
  };
}

function getEmployeeCount(department: Department) {
  return department._count?.employees ?? 0;
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function DepartmentsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search.trim() || undefined,
    }),
    [page, search]
  );

  const { departmentsQuery, createMutation, updateMutation, deleteMutation } = useDepartments(params);
  const departments = departmentsQuery.data?.data ?? [];
  const meta = departmentsQuery.data?.meta;

  function handleCreate() {
    setSelectedDepartment(null);
    setFormOpen(true);
  }

  function handleEdit(department: Department) {
    setSelectedDepartment(department);
    setFormOpen(true);
  }

  function handleDelete(department: Department) {
    if (getEmployeeCount(department) > 0) {
      toast({
        title: "Department has employees",
        description: "Move employees to another department before deleting it.",
        variant: "destructive",
      });
      return;
    }

    setSelectedDepartment(department);
    setDeleteOpen(true);
  }

  async function handleFormSubmit(payload: DepartmentPayload) {
    if (selectedDepartment) {
      await updateMutation.mutateAsync({ id: selectedDepartment.id, payload });
      toast({ title: "Department updated", description: `${payload.name} was saved.` });
      return;
    }

    await createMutation.mutateAsync(payload);
    toast({ title: "Department created", description: `${payload.name} is ready to use.` });
  }

  async function handleDeleteConfirm() {
    if (!selectedDepartment) {
      return;
    }

    if (getEmployeeCount(selectedDepartment) > 0) {
      setDeleteOpen(false);
      toast({
        title: "Delete blocked",
        description: "This department still has employees assigned.",
        variant: "destructive",
      });
      return;
    }

    await deleteMutation.mutateAsync(selectedDepartment.id);
    toast({ title: "Department deleted", description: `${selectedDepartment.name} was deactivated.` });
    setDeleteOpen(false);
    setSelectedDepartment(null);
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Departments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, update, and manage employee departments.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          New department
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle>Department directory</CardTitle>
            <CardDescription>{meta ? `${meta.total} total departments` : "Records from the department API"}</CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search departments"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {departmentsQuery.isError && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Unable to load departments. Check your session and backend API.
            </div>
          )}
          <DepartmentTable
            departments={departments}
            isLoading={departmentsQuery.isLoading}
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

      <DepartmentFormDialog
        open={formOpen}
        department={selectedDepartment}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
      />
      <DeleteDepartmentDialog
        open={deleteOpen}
        department={selectedDepartment}
        isDeleting={deleteMutation.isPending}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
      />
    </DashboardShell>
  );
}

function DepartmentTable({
  departments,
  isLoading,
  onEdit,
  onDelete,
}: {
  departments: Department[];
  isLoading: boolean;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Employee count</TableHead>
          <TableHead>Active status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-28 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              Loading departments...
            </TableCell>
          </TableRow>
        )}
        {!isLoading && departments.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              No departments found.
            </TableCell>
          </TableRow>
        )}
        {!isLoading &&
          departments.map((department) => (
            <TableRow key={department.id}>
              <TableCell>
                <div className="font-medium">{department.name}</div>
                {department.description && (
                  <div className="max-w-md truncate text-xs text-muted-foreground">{department.description}</div>
                )}
              </TableCell>
              <TableCell>{getEmployeeCount(department)}</TableCell>
              <TableCell>
                <Badge variant={department.isActive ? "secondary" : "outline"}>
                  {department.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(department.createdAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" aria-label="Edit department" onClick={() => onEdit(department)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Delete department"
                    onClick={() => onDelete(department)}
                  >
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

function DepartmentFormDialog({
  open,
  department,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  department: Department | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: DepartmentPayload) => Promise<void>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(department);
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: toDefaultValues(department),
  });

  useEffect(() => {
    if (open) {
      form.reset(toDefaultValues(department));
      setServerError(null);
    }
  }, [department, form, open]);

  async function handleSubmit(values: DepartmentFormValues) {
    setServerError(null);

    try {
      await onSubmit({
        name: values.name,
        description: values.description || undefined,
        isActive: values.isActive,
      });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || "Unable to save department."
          : "Unable to save department.";
      setServerError(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit department" : "Create department"}</DialogTitle>
          <DialogDescription>Maintain the department details used by employee records.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
          <Field label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </Field>
          <Field label="Description" error={form.formState.errors.description?.message}>
            <Textarea {...form.register("description")} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input className="h-4 w-4 rounded border-input" type="checkbox" {...form.register("isActive")} />
            Active department
          </label>
          {serverError && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDepartmentDialog({
  open,
  department,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  department: Department | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete department</DialogTitle>
          <DialogDescription>
            {department
              ? `${department.name} will be deactivated and hidden from active department workflows.`
              : "This department will be deactivated."}
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
