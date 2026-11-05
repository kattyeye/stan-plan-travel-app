import { afterEach, describe, expect, it } from "vitest";
import { createSessionToken, isAdminEmail, newLoginToken, readSessionToken, safeNextPath, sessionFromCookieHeader, SESSION_COOKIE } from "../auth";
import { requireAdmin } from "../security";

afterEach(() => {
  delete process.env.ADMIN_EMAILS;
  delete process.env.ADMIN_TOKEN;
});

describe("session tokens", () => {
  it("round-trips and normalises the email", () => {
    const t = createSessionToken("  Kat@Example.com ");
    expect(readSessionToken(t)?.email).toBe("kat@example.com");
  });
  it("rejects tampering, garbage and expiry", () => {
    const t = createSessionToken("a@x.com");
    const [payload, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ e: "admin@x.com", exp: 9_999_999_999, v: 1 })).toString("base64url");
    expect(readSessionToken(`${forged}.${sig}`)).toBeNull();
    expect(readSessionToken(`${payload}.${sig}x`)).toBeNull();
    expect(readSessionToken("nope")).toBeNull();
    expect(readSessionToken(t, Date.now() + 31 * 86_400_000)).toBeNull();
  });
  it("reads the cookie header", () => {
    const t = createSessionToken("a@x.com");
    expect(sessionFromCookieHeader(`theme=dark; ${SESSION_COOKIE}=${encodeURIComponent(t)}; x=1`)?.email).toBe("a@x.com");
    expect(sessionFromCookieHeader("theme=dark")).toBeNull();
    expect(sessionFromCookieHeader(null)).toBeNull();
  });
});

describe("login links", () => {
  it("makes unguessable tokens with a separate stored hash", () => {
    const a = newLoginToken();
    const b = newLoginToken();
    expect(a.token).toMatch(/^[a-f0-9]{64}$/);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toContain(a.token);
  });
  it("only redirects within the site", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("/trip/abc?x=1#days-2")).toBe("/trip/abc?x=1#days-2");
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/a\r\nb", 42, undefined]) expect(safeNextPath(bad)).toBe("/account");
  });
});

describe("admins", () => {
  it("come from ADMIN_EMAILS", () => {
    process.env.ADMIN_EMAILS = "Kat@Example.com, ops@example.com";
    expect(isAdminEmail("kat@example.com")).toBe(true);
    expect(isAdminEmail("someone@example.com")).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  const req = (opts: { cookieEmail?: string; bearer?: string; method?: string; origin?: string }) =>
    new Request("https://irietravel.app/api/admin/beta", {
      method: opts.method ?? "GET",
      headers: {
        ...(opts.cookieEmail ? { cookie: `${SESSION_COOKIE}=${createSessionToken(opts.cookieEmail)}` } : {}),
        ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
        ...(opts.origin ? { origin: opts.origin } : {}),
      },
    });

  it("accept the admin token or an admin's session; block cross-site changes", async () => {
    process.env.ADMIN_EMAILS = "kat@example.com";
    process.env.ADMIN_TOKEN = "t0ken";
    expect(await requireAdmin(req({ bearer: "t0ken", method: "POST" }))).toBeNull();
    expect(await requireAdmin(req({ cookieEmail: "kat@example.com" }))).toBeNull();
    expect(await requireAdmin(req({ cookieEmail: "kat@example.com", method: "POST", origin: "https://irietravel.app" }))).toBeNull();
    expect((await requireAdmin(req({ cookieEmail: "kat@example.com", method: "POST", origin: "https://evil.com" })))?.status).toBe(403);
    expect((await requireAdmin(req({ cookieEmail: "kat@example.com", method: "POST" })))?.status).toBe(403);
    expect((await requireAdmin(req({ cookieEmail: "guest@example.com" })))?.status).toBe(401);
    expect((await requireAdmin(req({ bearer: "wrong" })))?.status).toBe(401);
  });

  it("are disabled when nothing is configured", async () => {
    expect((await requireAdmin(req({})))?.status).toBe(503);
  });
});
