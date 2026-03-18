import Link from "next/link";
import Image from "next/image";

const DESTINATIONS = [
  {
    name: "Santorini",
    region: "Greece",
    image: "https://images.unsplash.com/photo-1507501336603-6260faf6a579?w=600&q=80",
    description: "Perfect for couples and small groups seeking stunning sunsets and authentic Mediterranean cuisine.",
  },
  {
    name: "Tokyo",
    region: "Japan",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80",
    description: "Immersive cultural experiences with verified restaurant reservations and transit directions.",
  },
  {
    name: "Austin",
    region: "Texas, USA",
    image: "https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=600&q=80",
    description: "Live music, food trucks, and outdoor adventures tailored to your group's energy level.",
  },
];

const FEATURES = [
  {
    icon: "✓",
    title: "Verified Operating Status",
    description: "No more arriving at a 'must-visit' café only to find it permanently closed. We verify real-time operating hours for every suggestion.",
  },
  {
    icon: "⇄",
    title: "Group-Dynamic Matching",
    description: "A bachelorette party of 8 needs different dinner spots than a family of 4. We filter strictly by what accommodates your specific group makeup.",
  },
  {
    icon: "◈",
    title: "Hyper-Specific Dietary",
    description: '"Vegan options available" isn\'t good enough. We find places where dietary restrictions are celebrated, not just accommodated.',
  },
];

const TESTIMONIALS = [
  {
    quote: "It asked me if my group was 'early risers' or 'sleep in' types, and customized the morning activities accordingly. It even found a gluten-free bakery open at 7 AM near our Airbnb. Unbelievable.",
    author: "Sarah Jenkins",
    trip: "Solo Trip to Austin, TX",
    initials: "SJ",
  },
  {
    quote: "I usually spend 20 hours planning a trip. Irie gave me a perfectly paced 5-day Tokyo itinerary in 3 minutes. Every train transfer instruction was spot on.",
    author: "David Chen",
    trip: "Solo Trip to Japan",
    initials: "DC",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Tell us about your group",
    desc: "Group size, dietary needs, budget preferences, and the vibe you're going for. The more specific, the better.",
    detail: "Select group type · Set dietary needs · Choose your vibe",
  },
  {
    num: "02",
    title: "AI builds your plan",
    desc: "We cross-reference millions of data points to verify every restaurant is open, every activity fits your group, and every recommendation is genuinely useful.",
    detail: "No generic lists · Verified hours · Group-matched results",
  },
  {
    num: "03",
    title: "Get your perfect itinerary",
    desc: "Download your complete, printable plan with all restaurant reservations, transit directions, and activity details.",
    detail: "Printable PDF · Group collaboration · Direct Maps links",
  },
];

export default function Home() {
  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100vh" }}>

      {/* ── HERO ── */}
      <section style={{
        maxWidth: "1240px",
        margin: "0 auto",
        padding: "80px 2rem 100px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "4rem",
        alignItems: "center",
      }} className="hero-grid">
        {/* Left */}
        <div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "var(--color-brand-light)",
            color: "var(--color-brand)",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "0.35rem 0.875rem",
            borderRadius: "999px",
            marginBottom: "1.75rem",
          }}>
            AI-Powered Travel Intelligence
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
            fontWeight: 400,
            lineHeight: 1.15,
            color: "var(--color-heading)",
            marginBottom: "1.25rem",
          }}>
            Travel plans that actually{" "}
            <em style={{ fontStyle: "italic", color: "var(--color-accent)" }}>make</em>
            {" "}sense.
          </h1>
          <p style={{
            fontSize: "1.125rem",
            color: "var(--color-text-muted)",
            lineHeight: 1.7,
            marginBottom: "2.5rem",
            maxWidth: "440px",
          }}>
            No generic lists. Real restaurants, verified hours, perfectly matched to your group&apos;s exact needs and vibe. We build hyper-personalized itineraries where every recommendation is genuinely executable.
          </p>

          {/* Mini form */}
          <div style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginBottom: "2rem",
          }}>
            <input
              type="text"
              placeholder="Where to?"
              style={{
                flex: "1 1 160px",
                padding: "0.75rem 1rem",
                background: "var(--color-bg-input)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-input)",
                fontSize: "0.9375rem",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
            <select
              defaultValue=""
              style={{
                flex: "0 1 140px",
                padding: "0.75rem 1rem",
                background: "var(--color-bg-input)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-input)",
                fontSize: "0.9375rem",
                color: "var(--color-text-muted)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="" disabled>Group Size</option>
              <option>Solo</option>
              <option>2 people</option>
              <option>3–5 people</option>
              <option>6+ people</option>
            </select>
            <Link href="/wizard" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.75rem 1.5rem",
              background: "var(--color-brand)",
              color: "var(--color-text-inverse)",
              borderRadius: "999px",
              fontWeight: 600,
              fontSize: "0.9375rem",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}>
              Plan trip →
            </Link>
          </div>

          {/* Social proof */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ display: "flex" }}>
              {["A","B","C"].map((l, i) => (
                <div key={l} style={{
                  width: 28, height: 28,
                  borderRadius: "50%",
                  background: "var(--color-brand-light)",
                  border: "2px solid var(--color-bg)",
                  marginLeft: i === 0 ? 0 : -8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.625rem", fontWeight: 700,
                  color: "var(--color-brand)",
                }}>{l}</div>
              ))}
            </div>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
              Joined by <strong style={{ color: "var(--color-text)" }}>10,000+</strong> smart travelers
            </span>
          </div>
        </div>

        {/* Right — wizard preview card */}
        <div style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "20px",
          padding: "1.75rem",
          boxShadow: "var(--shadow-float)",
        }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>Trip Wizard</p>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1.375rem", color: "var(--color-heading)", marginBottom: "1.25rem" }}>What&apos;s the vibe?</p>
          <div style={{ height: "4px", background: "var(--color-border)", borderRadius: "999px", marginBottom: "1.5rem", overflow: "hidden" }}>
            <div style={{ width: "40%", height: "100%", background: "var(--color-brand)", borderRadius: "999px" }} />
          </div>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Select Group Type</p>
          <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {["Friends Trip","Couples","Family","Solo"].map((t, i) => (
              <span key={t} style={{
                padding: "0.5rem 1rem",
                borderRadius: "999px",
                fontSize: "0.8125rem",
                fontWeight: 500,
                background: i === 0 ? "var(--color-brand)" : "var(--color-bg-selected)",
                color: i === 0 ? "var(--color-text-inverse)" : "var(--color-text-muted)",
                border: i === 0 ? "none" : "1px solid var(--color-border)",
              }}>{t}</span>
            ))}
          </div>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Dietary Needs</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["Vegan ✕","Gluten-Free ✕","+ Add"].map((tag) => (
              <span key={tag} style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "999px",
                fontSize: "0.8125rem",
                background: "var(--color-brand-light)",
                color: "var(--color-brand)",
                border: "1px solid var(--color-brand-light)",
              }}>{tag}</span>
            ))}
          </div>
          <div style={{ marginTop: "1.5rem" }}>
            <Link href="/wizard" style={{
              display: "block",
              textAlign: "center",
              padding: "0.75rem",
              background: "var(--color-brand)",
              color: "var(--color-text-inverse)",
              borderRadius: "999px",
              fontWeight: 600,
              fontSize: "0.9375rem",
              textDecoration: "none",
            }}>
              Continue Building →
            </Link>
          </div>
        </div>
      </section>

      {/* ── POPULAR DESTINATIONS ── */}
      <section style={{
        background: "var(--color-bg-subtle)",
        padding: "80px 2rem",
      }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>Explore</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-heading)", marginBottom: "0.5rem" }}>Popular destinations</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "2.5rem", fontSize: "1rem" }}>Curated experiences for every type of traveler</p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
          }} className="dest-grid">
            {DESTINATIONS.map((d) => (
              <div key={d.name} style={{
                background: "var(--color-surface)",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-card)",
              }}>
                <div style={{ position: "relative", height: "200px", overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.image}
                    alt={d.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
                    padding: "1.5rem 1rem 0.75rem",
                  }}>
                    <p style={{ color: "#fff", fontWeight: 700, fontSize: "1.125rem", margin: 0 }}>{d.name}</p>
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8125rem", margin: 0 }}>{d.region}</p>
                  </div>
                </div>
                <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
                  <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "100px 2rem" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>Simple process</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-heading)", marginBottom: "0.75rem" }}>How it works</h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "480px", margin: "0 auto" }}>Three simple steps to a perfectly personalized itinerary</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4rem" }}>
            {STEPS.map((step, i) => (
              <div key={step.num} style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4rem",
                alignItems: "center",
                ...(i % 2 === 1 ? { direction: "rtl" } : {}),
              }} className="step-grid">
                <div style={{ direction: "ltr" }}>
                  <span style={{
                    display: "block",
                    fontFamily: "var(--font-display)",
                    fontSize: "4rem",
                    fontWeight: 400,
                    color: "var(--color-border)",
                    lineHeight: 1,
                    marginBottom: "0.75rem",
                  }}>{step.num}</span>
                  <h3 style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.625rem",
                    color: "var(--color-heading)",
                    marginBottom: "0.75rem",
                  }}>{step.title}</h3>
                  <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", lineHeight: 1.7, marginBottom: "1rem" }}>{step.desc}</p>
                </div>
                <div style={{ direction: "ltr" }}>
                  <div style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "16px",
                    padding: "1.75rem",
                    boxShadow: "var(--shadow-card)",
                  }}>
                    {step.detail.split(" · ").map((item) => (
                      <div key={item} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.625rem 0",
                        borderBottom: "1px solid var(--color-border)",
                      }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: "50%",
                          background: "var(--color-brand-light)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.625rem", color: "var(--color-brand)", fontWeight: 700,
                          flexShrink: 0,
                        }}>✓</span>
                        <span style={{ fontSize: "0.875rem", color: "var(--color-text)" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANTI-GENERIC GUARANTEE ── */}
      <section style={{ background: "var(--color-bg-subtle)", padding: "100px 2rem" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>The Anti-Generic Guarantee</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-heading)", marginBottom: "0.75rem", maxWidth: "560px", margin: "0 auto 0.75rem" }}>Real recommendations for real people.</h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "520px", margin: "0 auto" }}>
              We cross-reference millions of data points to ensure your itinerary is not just inspiring, but flawlessly executable.
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
          }} className="features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                padding: "2rem",
                boxShadow: "var(--shadow-card)",
              }}>
                <div style={{
                  width: 44, height: 44,
                  borderRadius: "12px",
                  background: "var(--color-brand-light)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.125rem",
                  marginBottom: "1.25rem",
                }}>{f.icon}</div>
                <h3 style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.25rem",
                  color: "var(--color-heading)",
                  marginBottom: "0.625rem",
                }}>{f.title}</h3>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", lineHeight: 1.65 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "100px 2rem" }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-heading)", marginBottom: "2.5rem" }}>
            Trips that actually happened exactly as planned.
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1.5rem",
          }} className="testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "16px",
                padding: "2rem",
                boxShadow: "var(--shadow-card)",
              }}>
                <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} style={{ color: "var(--color-accent)", fontSize: "1rem" }}>★</span>
                  ))}
                </div>
                <p style={{
                  color: "var(--color-text)",
                  fontSize: "0.9375rem",
                  lineHeight: 1.7,
                  marginBottom: "1.5rem",
                  fontStyle: "italic",
                }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "var(--color-brand-light)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "0.75rem", color: "var(--color-brand)",
                  }}>{t.initials}</div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text)", margin: 0 }}>{t.author}</p>
                    <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: 0 }}>{t.trip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{
        background: "var(--color-brand)",
        padding: "80px 2rem",
      }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            color: "var(--color-text-inverse)",
            marginBottom: "1rem",
            lineHeight: 1.2,
          }}>
            Stop researching.<br />Start packing.
          </h2>
          <p style={{
            color: "rgba(254, 250, 224, 0.8)",
            fontSize: "1.0625rem",
            marginBottom: "2rem",
            lineHeight: 1.65,
          }}>
            Your next perfectly planned vacation is just a few questions away.
          </p>
          <Link href="/wizard" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.875rem 2rem",
            background: "var(--color-text-inverse)",
            color: "var(--color-brand)",
            borderRadius: "999px",
            fontWeight: 700,
            fontSize: "1rem",
            textDecoration: "none",
          }}>
            Try the wizard for free →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        background: "var(--color-heading)",
        padding: "3rem 2rem 2rem",
      }}>
        <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "3rem",
            marginBottom: "3rem",
            paddingBottom: "2rem",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }} className="footer-grid">
            <div>
              <Image src="/irie-logo.png" alt="Irie" height={28} width={96} style={{ objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: "0.875rem" }} />
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.875rem", lineHeight: 1.65, maxWidth: "240px" }}>
                Personalized trip plans built for your group, your vibe, and your budget.
              </p>
            </div>
            {[
              { label: "Product", links: ["The Wizard", "Group Collaboration", "Sample Itinerary", "Pricing"] },
              { label: "Resources", links: ["Travel Guide", "Blog", "Help Center"] },
              { label: "Legal", links: ["Privacy Policy", "Terms of Service"] },
            ].map((col) => (
              <div key={col.label}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: "0.875rem" }}>{col.label}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {col.links.map((l) => (
                    <li key={l}><a href="#" style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", textDecoration: "none" }}>{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8125rem", textAlign: "center" }}>
            © 2026 Irie. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .dest-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .testimonials-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .step-grid { grid-template-columns: 1fr !important; direction: ltr !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
