import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShiftSwapRequestsPage() {
  return (
    <DashboardShell>
      <Card>
        <CardHeader>
          <CardTitle>Swap Requests</CardTitle>
          <CardDescription>Shift swap requests will be available soon.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Shift swap requests will be available soon.</p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
