import { redirect } from "next/navigation";

export default function AdminExceptionsPage() {
  redirect("/admin/pending?tab=exceptions");
}
