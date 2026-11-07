import { getAuth } from "@/lib/auth";
import Dashboard from "@/components/dashboard/Dashboard";
// Guests can explore only the isolated demo workspace, with no write capabilities.
export default async function Page() {
  const session = await getAuth();
  if (!session?.user?.id) return <Dashboard userName="بازدیدکننده" demoMode />;
  return <Dashboard userName={session.user.name || "کاربر"} />;
}
