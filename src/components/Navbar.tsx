"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserRound } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Stories", href: "/#testimonials" },
];

interface Viewer {
  signedIn: boolean;
  isAdmin?: boolean;
}

export default function Navbar() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((v: Viewer) => setViewer(v))
      .catch(() => setViewer({ signedIn: false }));
  }, [pathname]);

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "var(--color-bg-card)",
      borderBottom: "1px solid var(--color-border)",
      padding: "0 1rem",
      height: "60px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backdropFilter: "blur(8px)",
    }}>
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Image src="/irie-logo.png" alt="Irie" height={30} width={110} style={{ objectFit: "contain" }} priority />
      </Link>

      {isLanding && (
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} style={{
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--color-text-muted)",
            }}>
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <style>{`
          .nav-account { display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem; height: 36px; min-width: 36px; padding: 0 0.625rem; border-radius: 999px; border: 1px solid var(--color-border); color: var(--color-text); font-size: 0.875rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
          .nav-account-label { display: none; }
          @media (min-width: 640px) { .nav-account-label { display: inline; } }
          /* Phones: admins reach the dashboard from My trips; keep the bar uncrowded. */
          @media (max-width: 479px) { .nav-admin { display: none; } }
        `}</style>
        {viewer?.isAdmin && (
          <Link href="/admin" className="nav-account nav-admin" aria-label="Admin dashboard" title="Admin dashboard">
            <LayoutDashboard size={16} aria-hidden="true" />
            <span className="nav-account-label">Admin</span>
          </Link>
        )}
        {viewer && (
          <Link href={viewer.signedIn ? "/account" : "/login"} className="nav-account" aria-label={viewer.signedIn ? "My trips" : "Sign in"}>
            <UserRound size={16} aria-hidden="true" />
            <span className="nav-account-label">{viewer.signedIn ? "My trips" : "Sign in"}</span>
          </Link>
        )}
        <Link href="/wizard" style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.5rem 1.25rem",
          background: "var(--color-brand)",
          color: "var(--color-text-inverse)",
          borderRadius: "999px",
          fontWeight: 600,
          fontSize: "0.875rem",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}>
          Start Planning
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
