import { ReportPlaceholderPage } from "@/app/reports/_components/report-placeholder-page";

export default function AttendanceReportPage() {
  return (
    <ReportPlaceholderPage
      title="Attendance Report"
      description="Review attendance status, daily check-ins, and missing records across employees and departments."
      tableTitle="Attendance records"
      tableColumns={["Employee", "Department", "Work date", "Check in", "Check out", "Status"]}
    />
  );
}
