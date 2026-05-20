import { redirect } from "next/navigation";

export default function LegacyOffDayLeavesPage() {
  redirect("/shifts/leave-requests");
}
