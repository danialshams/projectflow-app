import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
export default async function Home() { const session = await getAuth(); redirect(session?.user ? "/dashboard" : "/login"); }
