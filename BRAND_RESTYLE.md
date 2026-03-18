# Irie Brand Restyling — Claude Code Prompt

> Copy this entire file as context into Claude Code when restyling your app.

---

## Mission

Restyle all pages across the Irie application to match the new brand guidelines defined below. This includes updating the color system, typography, component styles, spacing, and overall visual tone. Additionally, build a new marketing landing page following the layout and content structure described in the "Landing Page" section.

**Brand identity:** Irie is a travel planning app. The logo is a lavender/periwinkle flower emblem paired with the word "irie" in a warm gold serif typeface. The logo files are `irie-logo.png` (flower + text) and the flower icon standalone. Use these assets in the navigation bar and footer.

---

## 1. Design Tokens — Color System

Replace any existing color variables/tokens with the following palette. Use CSS custom properties (or your framework's theme system) so every component inherits from a single source of truth.

### Primary

| Token                  | Value      | Usage                                                   |
|------------------------|------------|---------------------------------------------------------|
| `--color-primary`      | `#8B7355`  | Primary buttons, key CTAs, active nav indicators        |
| `--color-primary-fg`   | `#FAF8F5`  | Text/icons on primary backgrounds                       |

### Secondary

| Token                    | Value      | Usage                                                  |
|--------------------------|------------|--------------------------------------------------------|
| `--color-secondary`      | `#474D19`  | Secondary buttons, nav bar, badges, tags               |
| `--color-secondary-fg`   | `#F9F2EB`  | Text/icons on secondary backgrounds                    |

### Accent

| Token                 | Value   | Usage                                                     |
|-----------------------|---------|-----------------------------------------------------------|
| `--color-accent`      | `#CCD`  | Accent highlights, hover states, decorative elements, pill tags, subtle borders |
| `--color-accent-fg`   | `#FFF`  | Text/icons on accent backgrounds (use sparingly)          |

### Neutrals & Surface

| Token                    | Value      | Usage                                                  |
|--------------------------|------------|--------------------------------------------------------|
| `--color-background`     | `#F7F9EC`  | Page background — warm off-white with a slight green/cream tint |
| `--color-foreground`     | `#191B09`  | Default body text                                      |
| `--color-surface`        | `#FFFFFF`  | Cards, modals, elevated containers                     |
| `--color-surface-muted`  | `#F0F2E4`  | Subtle section backgrounds, alternating rows, input fields |
| `--color-border`         | `#D6D8C8`  | Card borders, dividers, input outlines                 |
| `--color-text-muted`     | `#6E6A7A`  | Secondary/caption text, placeholders                   |

### Semantic (derive from palette above)

| Token               | Value                              | Usage            |
|----------------------|------------------------------------|------------------|
| `--color-success`    | `#474D19` (reuse secondary)        | Success states   |
| `--color-warning`    | `#8B7355` (reuse primary)          | Warning states   |
| `--color-error`      | `#A3342B`                          | Error states     |
| `--color-info`       | `#CCD` (reuse accent)             | Info states      |

---

## 2. Typography

The brand feel is **warm, grounded, and confident** — not techy or sterile. Use a serif or strong sans-serif for headings and a clean sans-serif for body.

| Element          | Font Stack (suggested)                        | Weight   | Size (desktop) |
|------------------|-----------------------------------------------|----------|----------------|
| H1 (hero)        | `'Playfair Display', 'Georgia', serif`        | 700      | 48–56px        |
| H2 (section)     | `'Playfair Display', 'Georgia', serif`        | 700      | 32–40px        |
| H3 (card/block)  | `'Inter', 'Helvetica Neue', sans-serif`       | 600      | 22–26px        |
| Body             | `'Inter', 'Helvetica Neue', sans-serif`       | 400      | 16px           |
| Small/Caption    | `'Inter', sans-serif`                         | 400      | 13–14px        |
| Nav links        | `'Inter', sans-serif`                         | 500      | 14–15px        |
| Buttons          | `'Inter', sans-serif`                         | 600      | 14–16px        |

**Key typographic notes:**

- Headings use a **serif** typeface to feel editorial and travel-magazine-like.
- The hero H1 in Design Variation 2 uses a **mixed weight** style: most words are bold serif, but one keyword (e.g. "make") is rendered in an italic or lighter serif to create visual contrast. Implement this with a `<em>` or `<span>` within the heading.
- Body text color is `--color-foreground` (`#191B09`), not pure black. This dark tone has a slight warm undertone that pairs with the earthy palette.
- Muted text uses `--color-text-muted` (`#6E6A7A`).

---

## 3. Component Styles

### Buttons

| Variant     | Background           | Text Color           | Border                | Border Radius | Hover                              |
|-------------|----------------------|----------------------|-----------------------|---------------|-------------------------------------|
| Primary     | `--color-primary`    | `--color-primary-fg` | none                  | 24px (pill)   | darken 10%, subtle lift shadow      |
| Secondary   | `--color-secondary`  | `--color-secondary-fg` | none               | 24px (pill)   | darken 10%                          |
| Outline     | transparent          | `--color-foreground` | 1px `--color-border`  | 24px (pill)   | fill `--color-surface-muted`        |
| Ghost/Link  | transparent          | `--color-primary`    | none                  | 4px           | underline                           |

- All buttons use **pill-shaped** border radius (`border-radius: 24px` or `9999px`).
- Primary CTA buttons (e.g. "Start Planning", "Plan Trip") use `--color-primary` with an optional right-arrow icon.
- Secondary/outline buttons for less prominent actions (e.g. "See how it works").

### Cards

- Background: `--color-surface` (`#FFF`)
- Border: `1px solid --color-border`
- Border radius: `12–16px`
- Shadow: `0 1px 3px rgba(25, 27, 9, 0.06)` (very subtle)
- Padding: `24px`
- On hover: slightly elevated shadow (`0 4px 12px rgba(25, 27, 9, 0.1)`)

### Destination Cards (image cards)

- Full-bleed image with rounded corners (`12px`)
- Text overlay at bottom with a semi-transparent dark gradient
- Location name in white, bold
- Category tag underneath in muted white

### Input Fields

- Background: `--color-surface-muted` or `#FFF`
- Border: `1px solid --color-border`
- Border radius: `8–12px`
- Focus ring: `2px solid --color-primary` with `2px` offset

### Tags / Pills

- Background: `--color-surface-muted` or light tint of relevant color
- Text: `--color-foreground` or `--color-secondary`
- Border radius: `9999px`
- Padding: `4px 12px`
- Dietary tags (Vegan, Gluten-Free, etc.) use a colored dot or small icon prefix

### Navigation Bar

- Background: `--color-surface` or `transparent` over hero
- Logo: Use the full Irie logo (flower emblem + "irie" wordmark) from `irie-logo.png`. On mobile/small screens, use just the flower emblem icon. The wordmark is a warm gold serif — do not restyle it, use the image asset.
- Nav links: `--color-foreground`, `weight 500`
- CTA button in nav: `--color-secondary` background with `--color-secondary-fg` text (pill shape)
- Sticky on scroll with subtle bottom border or shadow

### Feature/Icon Blocks (How It Works, Guarantees)

- Icon in a `48×48` circle or rounded square with `--color-surface-muted` background
- Icon color: `--color-secondary` or `--color-primary`
- Title: H3, `--color-foreground`
- Description: body text, `--color-text-muted`

---

## 4. Spacing & Layout

- Max content width: `1200–1280px`, centered
- Section vertical padding: `80–120px`
- Card grid gap: `24–32px`
- The overall feel should be **spacious and breathable** — generous whitespace between sections

---

## 5. Visual Tone & Atmosphere

- **Warm, organic, earthy** — not cold/corporate. Think boutique travel magazine, not SaaS dashboard.
- The background `#F7F9EC` gives everything a warm parchment-like feel. Lean into this.
- Avoid harsh contrasts; transitions between sections should feel soft.
- Use the `#CCD` accent color for **subtle decorative touches**: section dividers, highlighted keywords, icon tints, hover underlines.
- Step numbers (01, 02, 03 in "How it works") should be large, light-colored (`--color-accent` or `--color-border`), and decorative.
- Testimonial sections use warm-toned cards with star ratings in `--color-primary`.

---
6. Landing Page Structure
Build a new marketing landing page with these sections in order:
6a. Hero

Large serif heading: "You've got the tickets. We've got the plan." (emphasize "plan" with italic/lighter weight)
Subheading: "Irie builds personalized day-by-day itineraries — real restaurants, verified hours, group-matched activities — so you can stop researching and start exploring."
Small muted pill/tag line near the subheading: "Not flights. Not hotels. Just everything after you land." — this is critical for positioning clarity
Trip Wizard mini-form or search bar with: Destination input, Group Size selector, primary CTA "Build My Itinerary →"
Optional: dark card overlay showing a "Trip Wizard" preview (group type selector, dietary needs, vibe selector) as seen in Design 2
Social proof line below: avatars + "Joined by 10,000+ smart travelers"

6b. Popular Destinations

Section heading: "Popular destinations"
Subtitle: "See what Irie itineraries look like in cities travelers love"
3-column grid of destination image cards (Santorini, Tokyo, Austin — or your actual destinations)
Each card: full-bleed photo, location name overlay, short description below (e.g. "3-day itinerary · food, culture, nightlife")

6c. How It Works

Section heading: "How it works"
Subtitle: "Three simple steps to your perfect on-the-ground itinerary"
3-step layout with large decorative step numbers (01, 02, 03)
Each step: number, heading, description paragraph, and a small illustrative UI mockup or icon graphic to the side

Step 1: "Tell us about your trip" — where you're going, group size, dietary needs, budget, vibe
Step 2: "AI builds your itinerary" — cross-referencing millions of data points to find real places that are actually open and match your group
Step 3: "Get your day-by-day plan" — downloadable PDF with restaurants, activities, directions, and time-of-day recommendations



6d. The Anti-Generic Guarantee (Trust/Features)

Section heading: "Real recommendations for real people."
Subtitle: "We cross-reference millions of data points to ensure your itinerary isn't just inspiring, but flawlessly executable — every restaurant open, every activity vetted, every day planned around your group."
3-column feature grid:

Verified Operating Status — no more arriving at a "must-visit" spot only to find it permanently closed. We verify real-time hours for every suggestion.
Group-Dynamic Matching — a bachelorette party of 8 needs different dinner spots than a family of 4. We filter by what accommodates your specific group.
Hyper-Specific Dietary — "vegan options available" isn't good enough. We find places where dietary restrictions are celebrated, not just accommodated.


Each with an icon, title, and short description

6e. Testimonials

Section heading: "Trips that actually happened exactly as planned."
Carousel or 2-column grid of testimonial cards
Each card: 5-star rating, quote text, author name, trip type (e.g. "Solo Trip to Austin")
Author avatar beside name

6f. Final CTA Banner

Bold background block (use --color-secondary or a warm gradient)
Heading: "Stop researching. Start exploring."
Subtitle: "You already booked the trip. Let us handle what happens when you get there."
CTA button: "Build my itinerary — free" in primary style

6g. Footer

Irie logo (flower emblem + wordmark) + tagline: "Travel made irie."
Column links: Product, Resources, Legal
Social icons
Copyright line

---

## 7. Migration Checklist

When restyling existing pages, make sure to update:

- [ ] Global CSS variables / theme tokens to match Section 1
- [ ] Swap in Irie logo assets (flower emblem + wordmark) in nav and footer
- [ ] All button components to pill shape + new colors
- [ ] Navigation bar styles (background, CTA button, link colors)
- [ ] Card components (border radius, shadow, border color)
- [ ] Input fields (border, focus states)
- [ ] Tag/pill/badge components
- [ ] Page background color (`--color-background`)
- [ ] Typography: heading font to serif, body to Inter/sans-serif
- [ ] Icon/illustration colors to use secondary/primary/accent from palette
- [ ] Hover/focus/active states across all interactive elements
- [ ] Dark mode (if applicable): create dark variants of all tokens
- [ ] Remove any colors not in the new palette

---

## 8. What NOT to Change

- Preserve existing page routing/URL structure
- Preserve all functionality and business logic
- Preserve content/copy unless it conflicts with the new design
- Preserve responsive breakpoints (but update component styles at each breakpoint)

---

*Generated from Irie design references + brand color palette spec.*