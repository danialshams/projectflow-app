import { redirect } from "next/navigation";
// Demo mode: no public account creation UI.
export default function RegisterPage() { redirect("/dashboard"); }
