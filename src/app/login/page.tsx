import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/account/LoginForm";

export const metadata: Metadata = { title: "Sign in — Irie", robots: { index: false } };

export default function LoginPage() {
  return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: "var(--color-bg)", padding: "3rem 1rem" }}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
