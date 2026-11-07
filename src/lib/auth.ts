import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { z } from "zod";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  providers: [CredentialsProvider({
    id: "credentials", name: "ایمیل و رمز عبور",
    credentials: { email: { label: "ایمیل", type: "email" }, password: { label: "رمز عبور", type: "password" } },
    async authorize(credentials) {
      const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(credentials);
      if (!parsed.success) return null;
      const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() } });
      if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email };
    },
  })],
  callbacks: {
    async jwt({ token, user }) { if (user) token.uid = user.id; return token; },
    async session({ session, token }) { if (session.user) session.user.id = token.uid as string; return session; },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
export async function getAuth() { return getServerSession(authOptions); }
