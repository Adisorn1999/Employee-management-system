import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PositionsPage() {
  return (
    <DashboardShell>
      <Card>
        <CardHeader>
          <CardTitle>Positions</CardTitle>
          <CardDescription>Position management navigation is ready for the next phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Use this workspace to manage employee positions.</p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
