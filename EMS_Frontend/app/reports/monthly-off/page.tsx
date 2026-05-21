import { ReportPlaceholderPage } from "@/app/reports/_components/report-placeholder-page";

export default function MonthlyOffReportPage() {
  return (
    <ReportPlaceholderPage
      title="Monthly Off Report"
      description="Summarize monthly off allocations, usage, remaining balances, and approval outcomes."
      tableTitle="Monthly off records"
      tableColumns={["Employee", "Department", "Off date", "Off type", "Approval status", "Quota impact"]}
    />
  );
}
