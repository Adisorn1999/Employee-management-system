"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { useEffect, useState } from "react";
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
import type { Employee, EmployeePayload } from "@/types/employee";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const optionalMoney = z.preprocess((value) => (value === "" || value === null ? undefined : value), z.coerce.number().min(0).optional());

const employeeSchema = z.object({
  prefix: z.string().trim().min(1, "Prefix is required").max(20),
  employeeNo: z.string().trim().min(1, "Employee number is required").max(50),
  name: z.string().trim().min(1, "Name is required").max(100),
  email: optionalText.pipe(z.string().email("Enter a valid email").optional()),
  phone: optionalText,
  position: optionalText,
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
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    position: employee?.position ?? "",
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

  useEffect(() => {
    if (open) {
      form.reset(toDefaultValues(employee));
      setServerError(null);
    }
  }, [employee, form, open]);

  async function handleSubmit(values: EmployeeFormValues) {
    setServerError(null);

    try {
      await onSubmit(values);
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
            <Field label="Position" error={form.formState.errors.position?.message}>
              <Input {...form.register("position")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" {...form.register("email")} />
            </Field>
            <Field label="Phone" error={form.formState.errors.phone?.message}>
              <Input {...form.register("phone")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Base salary" error={form.formState.errors.baseSalary?.message}>
              <Input type="number" min="0" step="0.01" {...form.register("baseSalary")} />
            </Field>
            <Field label="Meal allowance" error={form.formState.errors.mealAllowance?.message}>
              <Input type="number" min="0" step="0.01" {...form.register("mealAllowance")} />
            </Field>
            <Field label="Allowance" error={form.formState.errors.allowance?.message}>
              <Input type="number" min="0" step="0.01" {...form.register("allowance")} />
            </Field>
            <Field label="Late rate / min" error={form.formState.errors.lateRatePerMin?.message}>
              <Input type="number" min="0" step="0.01" {...form.register("lateRatePerMin")} />
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

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
