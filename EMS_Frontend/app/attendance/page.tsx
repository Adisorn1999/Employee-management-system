import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AttendancePage() {
  return (
    <DashboardShell>
      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
          <CardDescription>Attendance navigation is ready for the next phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Phase 1 keeps this area as a protected route placeholder.</p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
