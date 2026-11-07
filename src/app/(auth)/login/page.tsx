import { redirect } from "next/navigation";
// Login UI is temporarily hidden; public visitors see the read-only demo.
export default function LoginPage() { redirect("/dashboard"); }
