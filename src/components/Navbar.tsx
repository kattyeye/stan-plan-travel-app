"use client";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";

export default function Navbar() {
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "var(--color-bg-card)",
      borderBottom: "1px solid var(--color-border)",
      padding: "0 1.5rem",
      height: "52px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
        <Image src="/irie-logo.png" alt="Irie" height={32} width={120} style={{ objectFit: "contain" }} priority />
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <ThemeToggle />
      </div>
    </nav>
  );
}
