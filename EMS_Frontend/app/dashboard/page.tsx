import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Employee Records", value: "Live", description: "Connected to /api/employees" },
  { label: "Shift Planning", value: "Ready", description: "Phase 1 navigation shell" },
  { label: "Attendance", value: "Ready", description: "Phase 1 navigation shell" },
];

export default function DashboardPage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operational overview for the employee management workspace.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle>{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
