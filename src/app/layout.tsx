import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "ProjectFlow | مدیریت پروژه", description: "پنل مدیریت پروژه، تیم و وظایف — فارسی، سریع و مستقل" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl"><body>{children}</body></html>;
}
