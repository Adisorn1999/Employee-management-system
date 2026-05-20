import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShiftsPage() {
  return (
    <DashboardShell>
      <Card>
        <CardHeader>
          <CardTitle>Shifts</CardTitle>
          <CardDescription>Shift management navigation is ready for the next phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Payroll, leave, holidays, websocket, and realtime features are intentionally out of scope.</p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
