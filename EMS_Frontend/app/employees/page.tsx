"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DeleteEmployeeDialog } from "@/components/delete-employee-dialog";
import { EmployeeFormDialog } from "@/components/employee-form-dialog";
import { EmployeeTable } from "@/components/employee-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from "@/services/employee.service";
import type { Employee, EmployeePayload } from "@/types/employee";

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search.trim() || undefined,
    }),
    [page, search]
  );

  const employeesQuery = useQuery({
    queryKey: ["employees", params],
    queryFn: () => listEmployees(params),
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EmployeePayload }) => updateEmployee(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const employees = employeesQuery.data?.data ?? [];
  const meta = employeesQuery.data?.meta;

  function handleCreate() {
    setSelectedEmployee(null);
    setFormOpen(true);
  }

  function handleEdit(employee: Employee) {
    setSelectedEmployee(employee);
    setFormOpen(true);
  }

  function handleDelete(employee: Employee) {
    setSelectedEmployee(employee);
    setDeleteOpen(true);
  }

  async function handleFormSubmit(payload: EmployeePayload) {
    if (selectedEmployee) {
      await updateMutation.mutateAsync({ id: selectedEmployee.id, payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  }

  async function handleDeleteConfirm() {
    if (!selectedEmployee) {
      return;
    }

    await deleteMutation.mutateAsync(selectedEmployee.id);
    setDeleteOpen(false);
    setSelectedEmployee(null);
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, update, and deactivate employee records.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          New employee
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle>Employee directory</CardTitle>
            <CardDescription>
              {meta ? `${meta.total} total records` : "Records from the employee API"}
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search employees"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {employeesQuery.isError && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Unable to load employees. Check your session and backend API.
            </div>
          )}
          <EmployeeTable
            employees={employees}
            isLoading={employeesQuery.isLoading}
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

      <EmployeeFormDialog
        open={formOpen}
        employee={selectedEmployee}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
      />
      <DeleteEmployeeDialog
        open={deleteOpen}
        employee={selectedEmployee}
        isDeleting={deleteMutation.isPending}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
      />
    </DashboardShell>
  );
}
