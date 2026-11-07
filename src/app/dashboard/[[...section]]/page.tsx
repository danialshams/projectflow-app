import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard/Dashboard";
export default async function Page() {
  const session = await getAuth();
  if (!session?.user?.id) redirect("/login");
  return <Dashboard userName={session.user.name || "کاربر"} />;
}
