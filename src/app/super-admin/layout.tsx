import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: { default: "Super Admin", template: "%s · Cognifina Super Admin" },
  robots: { index: false, follow: false },
};

/**
 * Server-side gate: this layout renders only for SUPER_ADMIN sessions.
 * Non-admins are bounced to their dashboard; anonymous users to login.
 * (Every /api/admin route independently re-checks role + permission.)
 */
export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/super-admin");
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <AdminShell user={{ name: user.name, email: user.email, role: user.role }}>{children}</AdminShell>;
}
