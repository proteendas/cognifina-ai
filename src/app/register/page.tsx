import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/layout/AuthForm";

export const metadata: Metadata = { title: "Create workspace" };

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
