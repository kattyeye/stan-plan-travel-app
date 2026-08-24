import Link from "next/link";
import Image from "next/image";

const DESTINATIONS = [
  {
    name: "Santorini",
    region: "Greece",
    slug: "santorini",
    image: "/santorini.jpg",
    description: "Perfect for couples and small groups seeking stunning sunsets and authentic Mediterranean cuisine.",
  },
  {
    name: "Tokyo",
    region: "Japan",
    slug: "tokyo",
    image: "/tokyo.jpg",
    description: "Immersive cultural experiences with verified restaurant reservations and transit directions.",
  },
  {
    name: "Austin",
    region: "Texas, USA",
    slug: "austin",
    image: "/austin.jpg",
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
    trip: "Girls trip to Austin, TX",
    avatar: "https://i.pravatar.cc/72?img=47",
  },
  {
    quote: "I usually spend 20 hours planning a trip. Irie gave me a perfectly paced 5-day Tokyo itinerary in 3 minutes. Every train transfer instruction was spot on.",
    author: "David Chen",
    trip: "Family trip to Japan",
    avatar: "https://i.pravatar.cc/72?img=12",
  },
  {
    quote: "We're a group of 6 with two vegans and one nut allergy. It handled all of that without us having to triple-check everything ourselves. I was skeptical but it genuinely worked.",
    author: "Maya Torres",
    trip: "Friends trip to Santorini",
    avatar: "https://i.pravatar.cc/72?img=5",
  },
  {
    quote: "The 'structured' planning style gave us a real minute-by-minute schedule. My husband and I are type A planners and this was everything we didn't know we needed.",
    author: "Rachel Kim",
    trip: "Couples trip to Barcelona",
    avatar: "https://i.pravatar.cc/72?img=9",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Tell us about your trip",
    desc: "Where you're going, group size, dietary needs, budget, and vibe. The more specific, the better.",
    detail: "Select group type · Set dietary needs · Choose your vibe",
  },
  {
    num: "02",
    title: "AI builds your itinerary",
    desc: "We cross-reference millions of data points to find real places that are actually open and match your group — no generic lists.",
    detail: "No generic lists · Verified hours · Group-matched results",
  },
  {
    num: "03",
    title: "Get your day-by-day plan",
    desc: "A downloadable plan with restaurants, activities, directions, and time-of-day recommendations. Ready in under 2 minutes.",
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
            Every trip should feel irie
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
            fontWeight: 400,
            lineHeight: 1.15,
            color: "var(--color-heading)",
            marginBottom: "1.25rem",
          }}>
            You&apos;ve got the tickets.<br />We&apos;ve got the{" "}
            <em style={{ fontStyle: "italic", color: "var(--color-accent)" }}>plan.</em>
          </h1>
          <p style={{
            fontSize: "1.125rem",
            color: "var(--color-text-muted)",
            lineHeight: 1.7,
            marginBottom: "1rem",
            maxWidth: "440px",
          }}>
            Irie builds personalized day-by-day itineraries — real restaurants, verified hours, group-matched activities — so you can stop researching and start exploring.
          </p>
          <p style={{
            display: "inline-block",
            fontSize: "0.875rem",
            color: "var(--color-text-faint)",
            fontStyle: "italic",
            marginBottom: "2rem",
          }}>
            Not flights. Not hotels. Just everything after you land.
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
              Build My Itinerary →
            </Link>
          </div>

          {/* Voice fast path — the differentiator, so it sits directly under
              the primary CTA rather than buried in the wizard. */}
          <Link href="/wizard/voice" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1.5rem",
            color: "var(--color-brand)",
            fontWeight: 600,
            fontSize: "0.9375rem",
            textDecoration: "none",
          }}>
            <span aria-hidden="true">🎙️</span>
            Or just tell us your trip in one sentence
          </Link>

          {/* Social proof */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ display: "flex" }}>
              {[
                "https://i.pravatar.cc/56?img=47",
                "https://i.pravatar.cc/56?img=12",
                "https://i.pravatar.cc/56?img=5",
              ].map((src, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={i} src={src} alt="" style={{
                  width: 28, height: 28,
                  borderRadius: "50%",
                  border: "2px solid var(--color-bg)",
                  marginLeft: i === 0 ? 0 : -8,
                  objectFit: "cover",
                }} />
              ))}
            </div>
            <div>
              <div style={{ display: "flex", gap: "0.125rem", marginBottom: "0.15rem" }}>
                {[1,2,3,4,5].map((s) => (
                  <span key={s} style={{ color: "var(--color-accent)", fontSize: "0.75rem" }}>★</span>
                ))}
              </div>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                <strong style={{ color: "var(--color-text)" }}>10,000+</strong> trips planned
              </span>
            </div>
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
          <p style={{ color: "var(--color-text-muted)", marginBottom: "2.5rem", fontSize: "1rem" }}>See what Irie itineraries look like in cities travelers love</p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
          }} className="dest-grid">
            {DESTINATIONS.map((d) => (
              <Link key={d.name} href={`/preview/${d.slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                background: "var(--color-surface)",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-card)",
                transition: "box-shadow 0.2s ease, transform 0.15s ease",
                cursor: "pointer",
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
                <div style={{ padding: "1rem 1.25rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "0.5rem" }}>
                  <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>{d.description}</p>
                  <span style={{
                    flexShrink: 0,
                    fontSize: "0.75rem", fontWeight: 600,
                    color: "var(--color-brand)",
                    whiteSpace: "nowrap",
                  }}>See plan →</span>
                </div>
              </div>
              </Link>
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
            <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "480px", margin: "0 auto" }}>Three simple steps to your perfect on-the-ground itinerary</p>
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
                    color: "var(--color-accent)",
                    lineHeight: 1,
                    marginBottom: "0.75rem",
                    opacity: 0.6,
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

          {/* Stats strip — social validation through numbers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginBottom: "5rem",
            padding: "2rem",
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "16px",
            boxShadow: "var(--shadow-card)",
          }} className="stats-grid">
            {[
              { stat: "10,000+", label: "trips planned" },
              { stat: "4.9★", label: "average rating" },
              { stat: "2 min", label: "average build time" },
            ].map(({ stat, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                  color: "var(--color-heading)",
                  margin: 0,
                  lineHeight: 1,
                  marginBottom: "0.375rem",
                }}>{stat}</p>
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>The Anti-Generic Guarantee</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-heading)", marginBottom: "0.75rem", maxWidth: "560px", margin: "0 auto 0.75rem" }}>Real recommendations for real people.</h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "580px", margin: "0 auto" }}>
              We cross-reference millions of data points to ensure your itinerary isn&apos;t just inspiring, but flawlessly executable — every restaurant open, every activity vetted, every day planned around your group.
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
          <div style={{ marginBottom: "2.5rem" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>Real travelers. Real trips.</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", color: "var(--color-heading)", marginBottom: "0.5rem" }}>
              People just like you.
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "480px" }}>
              Families, couples, solo travelers, and friend groups — all with different diets, budgets, and vibes.
            </p>
          </div>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.avatar} alt={t.author} style={{
                    width: 40, height: 40, borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid var(--color-border)",
                  }} />
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
            Answer a few questions. Get a complete, personalized trip plan — itinerary, meals, restaurants, and packing list — in under 2 minutes.
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
            Build my trip plan →
          </Link>
          <p style={{ color: "rgba(254, 250, 224, 0.55)", fontSize: "0.8125rem", marginTop: "1rem" }}>
            No account needed. Takes under 2 minutes.
          </p>
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
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.875rem", lineHeight: 1.65, maxWidth: "240px", fontStyle: "italic" }}>
                Travel made irie.
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
          .stats-grid { grid-template-columns: 1fr !important; }
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
