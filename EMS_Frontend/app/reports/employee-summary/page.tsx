import { ReportPlaceholderPage } from "@/app/reports/_components/report-placeholder-page";

export default function EmployeeSummaryReportPage() {
  return (
    <ReportPlaceholderPage
      title="Employee Summary"
      description="View employee headcount, department assignment, position coverage, and employment status summaries."
      tableTitle="Employee summary records"
      tableColumns={["Employee", "Department", "Position", "Employment status", "Shift", "Last updated"]}
    />
  );
}
