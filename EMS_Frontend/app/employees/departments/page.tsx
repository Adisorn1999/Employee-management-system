import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DepartmentsPage() {
  return (
    <DashboardShell>
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>Department management navigation is ready for the next phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Use this workspace to manage employee departments.</p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
