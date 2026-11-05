import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyLogin from "@/components/account/VerifyLogin";

export const metadata: Metadata = { title: "Signing in — Irie", robots: { index: false } };

export default function VerifyPage() {
  return (
    <div style={{ minHeight: "calc(100vh - 60px)", background: "var(--color-bg)", padding: "3rem 1rem" }}>
      <Suspense fallback={null}>
        <VerifyLogin />
      </Suspense>
    </div>
  );
}
