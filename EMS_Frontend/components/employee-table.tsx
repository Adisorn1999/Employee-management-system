"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Employee } from "@/types/employee";

type EmployeeTableProps = {
  employees: Employee[];
  isLoading: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
};

function getTelegramLink(telegramUsername?: string | null): string | null {
  const username = telegramUsername?.replace(/^@/, "");
  return username ? `https://t.me/${encodeURIComponent(username)}` : null;
}

export function EmployeeTable({ employees, isLoading, onEdit, onDelete }: EmployeeTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-28 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              Loading employees...
            </TableCell>
          </TableRow>
        )}
        {!isLoading && employees.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
              No employee records found.
            </TableCell>
          </TableRow>
        )}
        {!isLoading &&
          employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>
                <div className="font-medium">{employee.name}</div>
                <div className="text-xs text-muted-foreground">
                  {employee.prefix}-{employee.employeeNo}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  {getTelegramLink(employee.telegramUsername) ? (
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={getTelegramLink(employee.telegramUsername) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {employee.telegramUsername}
                    </a>
                  ) : (
                    "-"
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{employee.phone || "-"}</div>
              </TableCell>
              <TableCell>
                <div>{employee.jobPosition?.name || employee.position || "-"}</div>
                <div className="text-xs text-muted-foreground">
                  {employee.departmentId === null ? "No department" : employee.department?.name || "-"}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={employee.isActive ? "secondary" : "outline"}>{employee.isActive ? "Active" : "Inactive"}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="icon" aria-label="Edit employee" onClick={() => onEdit(employee)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Deactivate employee" onClick={() => onDelete(employee)}>
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
