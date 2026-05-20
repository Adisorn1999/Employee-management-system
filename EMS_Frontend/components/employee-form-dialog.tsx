"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { forwardRef, type ReactNode, type SelectHTMLAttributes, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { listDepartments, listPositions } from "@/services/employee.service";
import { listShifts } from "@/services/shift.service";
import type { Employee, EmployeePayload, Shift } from "@/types/employee";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const MONEY_MAX = 99_999_999.99;
const optionalMoney = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce
    .number()
    .min(0)
    .max(MONEY_MAX, `Must be ${MONEY_MAX.toLocaleString()} or less`)
    .optional()
);

const employeeSchema = z.object({
  prefix: z.string().trim().min(1, "Prefix is required").max(20),
  employeeNo: z.string().trim().min(1, "Employee number is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(100),
  telegramUsername: optionalText,
  phone: optionalText,
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  defaultShiftId: z.string().optional(),
  baseSalary: optionalMoney,
  mealAllowance: optionalMoney,
  allowance: optionalMoney,
  lateRatePerMin: optionalMoney,
  isActive: z.boolean(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

type EmployeeFormDialogProps = {
  open: boolean;
  employee?: Employee | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: EmployeePayload) => Promise<void>;
};

function toDefaultValues(employee?: Employee | null): EmployeeFormValues {
  return {
    prefix: employee?.prefix ?? "EMP",
    employeeNo: employee?.employeeNo ?? "",
    name: employee?.name ?? "",
    telegramUsername: employee?.telegramUsername ?? "",
    phone: employee?.phone ?? "",
    departmentId: employee?.departmentId ?? "",
    positionId: employee?.positionId ?? "",
    defaultShiftId: employee?.defaultShiftId ?? "",
    baseSalary: employee?.baseSalary ? Number(employee.baseSalary) : undefined,
    mealAllowance: employee?.mealAllowance ? Number(employee.mealAllowance) : undefined,
    allowance: employee?.allowance ? Number(employee.allowance) : undefined,
    lateRatePerMin: employee?.lateRatePerMin ? Number(employee.lateRatePerMin) : undefined,
    isActive: employee?.isActive ?? true,
  };
}

export function EmployeeFormDialog({ open, employee, onOpenChange, onSubmit }: EmployeeFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(employee);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: toDefaultValues(employee),
  });
  const selectedDepartmentId = form.watch("departmentId");
  const selectedPositionId = form.watch("positionId");

  const departmentsQuery = useQuery({
    queryKey: ["departments", "employee-form"],
    queryFn: () => listDepartments({ limit: 100 }),
    enabled: open,
  });

  const positionsQuery = useQuery({
    queryKey: ["positions", "employee-form"],
    queryFn: () => listPositions({ limit: 100 }),
    enabled: open,
  });

  const shiftsQuery = useQuery({
    queryKey: ["shifts", "employee-form"],
    queryFn: () => listShifts({ isActive: "true" }),
    enabled: open,
  });

  const departments = departmentsQuery.data?.data ?? [];
  const positions = positionsQuery.data?.data ?? [];
  const shifts = shiftsQuery.data ?? [];
  const positionOptions = selectedDepartmentId
    ? positions.filter(
        (position) =>
          position.id === selectedPositionId || !position.departmentId || position.departmentId === selectedDepartmentId
      )
    : positions;

  useEffect(() => {
    if (open) {
      form.reset(toDefaultValues(employee));
      setServerError(null);
    }
  }, [employee, form, open]);

  useEffect(() => {
    if (!selectedDepartmentId || !selectedPositionId) {
      return;
    }

    const selectedPosition = positions.find((position) => position.id === selectedPositionId);
    if (selectedPosition?.departmentId && selectedPosition.departmentId !== selectedDepartmentId) {
      form.setValue("positionId", "");
    }
  }, [form, positions, selectedDepartmentId, selectedPositionId]);

  async function handleSubmit(values: EmployeeFormValues) {
    setServerError(null);

    try {
      await onSubmit({
        ...values,
        departmentId: values.departmentId || null,
        positionId: values.positionId || null,
        defaultShiftId: values.defaultShiftId || null,
      });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message || "Unable to save employee."
          : "Unable to save employee.";
      setServerError(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "Create employee"}</DialogTitle>
          <DialogDescription>Maintain the employee identity and compensation fields used by the backend.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Prefix" error={form.formState.errors.prefix?.message}>
              <Input {...form.register("prefix")} />
            </Field>
            <Field label="Employee No." error={form.formState.errors.employeeNo?.message} className="sm:col-span-2">
              <Input {...form.register("employeeNo")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} />
            </Field>
            <Field label="Department" error={form.formState.errors.departmentId?.message}>
              <SelectField {...form.register("departmentId")} disabled={departmentsQuery.isLoading}>
                <option value="">No department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </SelectField>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Position" error={form.formState.errors.positionId?.message}>
              <SelectField {...form.register("positionId")} disabled={positionsQuery.isLoading}>
                <option value="">No position</option>
                {positionOptions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </SelectField>
            </Field>
            <Field label="Default Shift" error={form.formState.errors.defaultShiftId?.message}>
              <SelectField {...form.register("defaultShiftId")} disabled={shiftsQuery.isLoading}>
                <option value="">No default shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {formatShiftOption(shift)}
                  </option>
                ))}
              </SelectField>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telegram" error={form.formState.errors.telegramUsername?.message}>
              <Input placeholder="@username" {...form.register("telegramUsername")} />
            </Field>
            <Field label="Phone" error={form.formState.errors.phone?.message}>
              <Input {...form.register("phone")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Base salary" error={form.formState.errors.baseSalary?.message}>
              <Input type="number" min="0" max={MONEY_MAX} step="0.01" {...form.register("baseSalary")} />
            </Field>
            <Field label="Meal allowance" error={form.formState.errors.mealAllowance?.message}>
              <Input type="number" min="0" max={MONEY_MAX} step="0.01" {...form.register("mealAllowance")} />
            </Field>
            <Field label="Allowance" error={form.formState.errors.allowance?.message}>
              <Input type="number" min="0" max={MONEY_MAX} step="0.01" {...form.register("allowance")} />
            </Field>
            <Field label="Late rate / min" error={form.formState.errors.lateRatePerMin?.message}>
              <Input type="number" min="0" max={MONEY_MAX} step="0.01" {...form.register("lateRatePerMin")} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input className="h-4 w-4 rounded border-input" type="checkbox" {...form.register("isActive")} />
            Active employee
          </label>
          {serverError && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatShiftOption(shift: Shift) {
  return `${shift.code} - ${shift.name} (${shift.startTime}-${shift.endTime})`;
}

const SelectField = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      className={[
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      {...props}
    />
  )
);
SelectField.displayName = "SelectField";

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
