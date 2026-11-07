import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
export default async function Page() { const session = await getAuth(); if (session?.user) redirect("/dashboard"); return <AuthForm mode="register" />; }
