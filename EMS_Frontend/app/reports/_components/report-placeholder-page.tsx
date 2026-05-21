import { CalendarDays, FileSpreadsheet, Search } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ReportPlaceholderPageProps = {
  title: string;
  description: string;
  tableTitle: string;
  tableColumns: string[];
};

const placeholderRows = Array.from({ length: 5 }, (_, index) => index);

export function ReportPlaceholderPage({
  title,
  description,
  tableTitle,
  tableColumns,
}: ReportPlaceholderPageProps) {
  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between md:space-y-0">
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Reporting filters will be connected after API support is ready.</CardDescription>
            </div>
            <Button variant="outline" disabled>
              <Search className="h-4 w-4" />
              Generate
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="report-from-date">From date</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="report-from-date" className="pl-9" type="date" disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-to-date">To date</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="report-to-date" className="pl-9" type="date" disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-department">Department</Label>
                <Input id="report-department" placeholder="All departments" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-employee">Employee</Label>
                <Input id="report-employee" placeholder="Search employee" disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <CardTitle>{tableTitle}</CardTitle>
              <CardDescription>No report data is loaded until reporting APIs are connected.</CardDescription>
            </div>
            <Button variant="outline" disabled>
              <FileSpreadsheet className="h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {tableColumns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {placeholderRows.map((row) => (
                  <TableRow key={row}>
                    {tableColumns.map((column, columnIndex) => (
                      <TableCell key={column}>
                        <div
                          className="h-4 rounded bg-muted"
                          style={{ width: `${columnIndex === 0 ? 72 : 48 + columnIndex * 8}%` }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
