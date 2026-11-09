import { afterEach, describe, expect, it, vi } from "vitest";
import { emailEnabled, layout, maskEmail, sendEmail } from "../notify";

const msg = { to: "guest@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi", tag: "test" };

describe("trip emails", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reports (instead of silently skipping) when email isn't configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(emailEnabled()).toBe(false);
    expect(await sendEmail(msg)).toEqual({ ok: false, error: "not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends through Resend from the verified sender and returns the id", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "");
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    expect(await sendEmail(msg)).toEqual({ ok: true, id: "em_1" });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(String(init.body));
    expect(body.from).toBe("Irie <trips@irietravel.app>");
    expect(body.to).toEqual(["guest@example.com"]);
  });

  it("surfaces Resend's rejection reason", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ name: "validation_error", message: "domain is not verified" }), { status: 403 })));
    const result = await sendEmail(msg);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("domain is not verified");
  });

  it("masks addresses in logs and escapes nothing it shouldn't", () => {
    expect(maskEmail("katherine@example.com")).toBe("ka*******@example.com");
    expect(layout("Hello", "<p>x</p>", { label: "Open", url: "https://irietravel.app/trip/abc" })).toContain("https://irietravel.app/trip/abc");
  });
});
