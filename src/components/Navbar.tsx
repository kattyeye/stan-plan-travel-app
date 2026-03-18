"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const NAV_LINKS = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Stories", href: "/#testimonials" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "var(--color-bg-card)",
      borderBottom: "1px solid var(--color-border)",
      padding: "0 2rem",
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
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
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

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
