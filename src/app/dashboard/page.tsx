import BeatBook from "@/components/BeatBook";
import { requireRole } from "@/lib/auth";

export default async function DashboardPage() {
  await requireRole("ARTIST");
  return <BeatBook initialView="dashboard" />;
}
