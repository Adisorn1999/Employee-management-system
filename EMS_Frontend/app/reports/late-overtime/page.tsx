import { ReportPlaceholderPage } from "@/app/reports/_components/report-placeholder-page";

export default function LateOvertimeReportPage() {
  return (
    <ReportPlaceholderPage
      title="Late / Overtime Report"
      description="Track late arrivals, early departures, overtime totals, and exception patterns for payroll review."
      tableTitle="Late and overtime records"
      tableColumns={["Employee", "Department", "Work date", "Late minutes", "Overtime hours", "Status"]}
    />
  );
}
