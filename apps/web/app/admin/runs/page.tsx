import { redirect } from "next/navigation";

export default function AdminRunsPage() {
  redirect("/admin/collection?tab=runs");
}
