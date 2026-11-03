import type { GeneratedTrip, Meal, Recipe, Restaurant, Verification } from "@/types/trip";
import { shortDate } from "./pipeline/days";
import { aggregateIngredients } from "./utils";

/**
 * Renders a trip as one self-contained, offline HTML file (inline CSS/JS, no
 * network requests). Deterministic: the download always matches the JSON the
 * live page shows. Every model-written string is HTML-escaped.
 */

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const safeUrl = (u: string | undefined) => (u && /^https?:\/\//i.test(u) ? esc(u) : "");

function badge(v?: Verification) {
  if (!v) return "";
  if (v.status === "verified") return `<span class="badge ok" title="Confirmed open on Google">✓ Verified</span>`;
  if (v.status === "web-sourced") return `<span class="badge">Web source</span>`;
  return `<span class="badge warn">Call ahead</span>`;
}

function mealRow(label: string, m: Meal, restaurants: Map<string, Restaurant>, recipes: Map<string, Recipe>) {
  const r = m.restaurantId ? restaurants.get(m.restaurantId) : undefined;
  const recipe = m.recipeId ? recipes.get(m.recipeId) : undefined;
  const alts = (m.alternativeIds ?? []).map((id) => restaurants.get(id)?.name).filter(Boolean);
  return `<div class="meal">
  <div class="meal-head"><span class="label">${esc(label)}</span>${m.time ? `<span class="time">${esc(m.time)}</span>` : ""}<strong>${esc(m.name)}</strong>
  ${m.type === "eat-out" ? `<span class="chip">eat out</span>` : `<span class="chip green">cook in</span>`}</div>
  ${r ? `<div class="sub">${esc(r.name)} · ${esc(r.address)} ${badge(r.verification)}</div>` : ""}
  ${m.note ? `<div class="sub">${esc(m.note)}</div>` : ""}
  ${alts.length ? `<div class="sub">Also good: ${alts.map(esc).join(", ")}</div>` : ""}
  ${(m.warnings ?? []).map((w) => `<div class="warn-line">⚠ ${esc(w)}</div>`).join("")}
  ${recipe ? recipeBlock(recipe) : ""}
</div>`;
}

function recipeBlock(r: Recipe) {
  return `<details class="recipe"><summary>${esc(r.name)} — prep ${esc(r.prepTime)}, cook ${esc(r.cookTime)}, serves ${esc(r.servings)}</summary>
  ${r.tip ? `<p class="tip">💡 ${esc(r.tip)}</p>` : ""}
  ${(r.dietaryNotes ?? []).map((n) => `<p class="sub">${esc(n)}</p>`).join("")}
  <h4>Ingredients</h4><ul>${r.ingredients.map((i) => `<li>${esc(i.amount)} ${esc(i.unit)} ${esc(i.item)}</li>`).join("")}</ul>
  <h4>Steps</h4><ol>${r.steps.map((s) => `<li>${esc(s.instruction)}</li>`).join("")}</ol>
</details>`;
}

function checklist(id: string, items: { label: string; checked?: boolean; aside?: string }[]) {
  return `<ul class="check">${items
    .map(
      (it, i) =>
        `<li><label><input type="checkbox" data-key="${esc(id)}-${i}"${it.checked ? " checked" : ""}> <span>${esc(it.label)}</span>${it.aside ? ` <em>${esc(it.aside)}</em>` : ""}</label></li>`
    )
    .join("")}</ul>`;
}

export function renderTripHtml(trip: GeneratedTrip, opts: { slug: string; url?: string }): string {
  const restaurants = new Map(trip.restaurants.map((r) => [r.id, r]));
  const recipes = new Map(trip.recipes.map((r) => [r.id, r]));
  const { meta, preferences } = trip;
  const master =
    trip.groceryList.master ??
    aggregateIngredients([...trip.groceryList.byMeal.map((m) => ({ recipeId: m.recipeId, ingredients: m.ingredients })), { ingredients: trip.groceryList.staples }]);

  const itinerary = trip.itinerary
    .map(
      (d) => `<section class="card day">
  <h3>Day ${d.day} <span class="muted">${esc(shortDate(d.date))}</span>${d.theme ? ` <span class="theme">— ${esc(d.theme)}</span>` : ""}</h3>
  ${(d.warnings ?? []).map((w) => `<div class="warn-line">⚠ ${esc(w)}</div>`).join("")}
  <ul class="schedule">${d.activities.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
  ${mealRow("Breakfast", d.meals.breakfast, restaurants, recipes)}
  ${mealRow("Lunch", d.meals.lunch, restaurants, recipes)}
  ${mealRow("Dinner", d.meals.dinner, restaurants, recipes)}
</section>`
    )
    .join("");

  const eat = trip.restaurants
    .map(
      (r) => `<section class="card">
  <div class="row"><strong>${esc(r.name)}</strong> ${badge(r.verification)}<span class="price">${esc(r.priceRange)}</span></div>
  ${r.rating ? `<div class="sub">★ ${esc(r.rating)}${r.verification?.reviewCount ? ` (${esc(r.verification.reviewCount)} reviews)` : ""}</div>` : ""}
  <p>${esc(r.description)}</p>
  <div class="sub">${esc(r.address)}</div>
  ${r.verification?.hours?.length ? `<details><summary>Hours</summary><ul>${r.verification.hours.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></details>` : r.hours ? `<div class="sub">${esc(r.hours)}</div>` : ""}
  <div class="links">${safeUrl(r.verification?.mapsUrl) ? `<a href="${safeUrl(r.verification?.mapsUrl)}">Map</a>` : ""}${safeUrl(r.link) ? ` <a href="${safeUrl(r.link)}">Website</a>` : ""}</div>
</section>`
    )
    .join("");

  const grocery = `${trip.groceryList.shoppingNote ? `<p class="tip">💡 ${esc(trip.groceryList.shoppingNote)}</p>` : ""}
  ${checklist("grocery", master.map((m) => ({ label: `${m.item}`, aside: m.quantity })))}
  ${trip.groceryList.stores.length ? `<h3>Where to shop</h3><ul>${trip.groceryList.stores.map((s) => `<li><strong>${esc(s.name)}</strong> ${badge(s.verification)} — ${esc(s.note)}</li>`).join("")}</ul>` : ""}`;

  const tips = `${trip.tips.weather ? `<p class="tip">🌤 ${esc(trip.tips.weather)}</p>` : ""}
  ${(trip.tips.events ?? []).length ? `<h3>Happening while you're there</h3>${(trip.tips.events ?? []).map((e) => `<div class="card"><strong>${esc(e.name)}</strong> <span class="muted">${esc(e.dates)}</span><p>${esc(e.description)}</p></div>`).join("")}` : ""}
  <h3>Things to do</h3>${trip.tips.activities
    .map(
      (a) => `<div class="card"><div class="row"><strong>${esc(a.name)}</strong> ${badge(a.verification)}</div><p>${esc(a.description)}</p>
    <div class="sub">${[a.duration && `⏱ ${a.duration}`, a.cost && `💵 ${a.cost}`, a.bookingRequired && "Book ahead", a.kidFriendly && "Kid-friendly"].filter(Boolean).map(esc).join(" · ")}</div></div>`
    )
    .join("")}
  ${trip.tips.practical.length ? `<h3>Practical tips</h3><ul>${trip.tips.practical.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
  ${trip.tips.dayTrips.length ? `<h3>Day trips</h3>${trip.tips.dayTrips.map((t) => `<div class="card"><strong>${esc(t.destination)}</strong> <span class="muted">~${esc(t.distanceMinutes)} min</span><p>${esc(t.description)}</p></div>`).join("")}` : ""}`;

  const packingLabels: Record<string, string> = {
    clothingAdults: "Clothing — adults", clothingKids: "Clothing — kids", beachOutdoor: "Beach & outdoor", kitchen: "Kitchen",
    toiletries: "Toiletries", electronics: "Electronics", evening: "Evening", groupLogistics: "Group logistics", propertyProvides: "The stay provides",
  };
  const packing = Object.entries(trip.packingList)
    .filter(([, items]) => items.length)
    .map(([k, items]) => `<h3>${esc(packingLabels[k] ?? k)}</h3>${checklist(`pack-${k}`, items.map((i: { item: string; checked: boolean }) => ({ label: i.item, checked: i.checked })))}`)
    .join("");

  const q = trip.quality;
  const verifiedLine = q
    ? `${q.venues.verified} of ${q.venues.total} places confirmed open on Google · checked ${esc(new Date(q.checkedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(meta.title)} — Irie trip plan</title>
<style>
:root{--bg:#f4f6ee;--card:#fefbe6;--text:#2d331a;--muted:#5b6635;--faint:#88994f;--border:#d5dcbc;--brand:#5b6635;--accent:#96622e;--warn:#9a3412;--warnbg:#fff7ed}
@media (prefers-color-scheme:dark){:root{--bg:#15180c;--card:#1e2211;--text:#f4f6ee;--muted:#c0cb9a;--faint:#95a857;--border:#3c4323;--brand:#aaba78;--accent:#cf9963;--warn:#fdba74;--warnbg:#2a1608}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif}
header{background:#1e2211;color:#f4f6ee;padding:32px 16px}header .in,main{max-width:760px;margin:0 auto}
h1{font:400 clamp(28px,6vw,42px)/1.1 Georgia,serif;margin:0 0 6px}h2,h3{font-family:Georgia,serif;font-weight:400}h3{margin:20px 0 8px}
.pills span{display:inline-block;border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:4px 12px;margin:4px 4px 0 0;font-size:13px}
nav{position:sticky;top:0;background:var(--card);border-bottom:1px solid var(--border);display:flex;overflow-x:auto;z-index:2}
nav button{flex:1;min-width:90px;padding:14px 8px;border:0;background:none;color:var(--muted);font:600 12px/1 inherit;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;border-bottom:3px solid transparent}
nav button[aria-selected=true]{color:var(--text);border-color:var(--brand)}
main{padding:20px 16px 60px}.panel{display:none}.panel.on{display:block}
.card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin:0 0 14px}
.muted,.sub{color:var(--muted);font-size:14px}.theme{color:var(--accent);font-style:italic;font-size:15px}.label{font:700 11px/1 inherit;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);margin-right:8px}
.time{font-weight:600;color:var(--brand);margin-right:8px;font-size:14px}.meal{border-top:1px solid var(--border);padding:10px 0}.meal-head{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline}
.chip{font-size:12px;border-radius:999px;padding:1px 8px;background:#f3e6d8;color:#754d24}.chip.green{background:#eaeedd;color:#3c4323}
.badge{font-size:11px;border-radius:999px;padding:1px 8px;border:1px solid var(--border);color:var(--muted);margin-left:4px}.badge.ok{color:#166534;border-color:#86efac}.badge.warn{color:var(--warn)}
.warn-line{background:var(--warnbg);color:var(--warn);border-radius:8px;padding:6px 10px;font-size:14px;margin:6px 0}
.row{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.price{margin-left:auto;color:var(--accent);font-weight:600}
.tip{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 14px}.links a{color:var(--brand);margin-right:12px}
details.recipe{margin-top:8px;border:1px solid var(--border);border-radius:10px;padding:8px 12px}summary{cursor:pointer;font-weight:600}
ul.schedule{padding-left:18px}ul.check{list-style:none;padding:0}ul.check li{border-bottom:1px solid var(--border);padding:8px 0}ul.check em{color:var(--muted);font-style:normal;margin-left:6px}
input:checked+span{text-decoration:line-through;color:var(--faint)}.toolbar{display:flex;gap:8px;margin:12px 0 0}.toolbar button{border:1px solid rgba(255,255,255,.4);background:none;color:inherit;border-radius:999px;padding:6px 14px;cursor:pointer}
footer{max-width:760px;margin:0 auto;padding:0 16px 40px;color:var(--muted);font-size:13px}
@media print{nav,.toolbar{display:none}.panel{display:block!important;page-break-before:always}.panel:first-of-type{page-break-before:auto}header{background:none;color:#000}details{display:block}details>*{display:block}body{background:#fff;color:#000}.card{break-inside:avoid}}
</style></head><body>
<header><div class="in"><div class="muted" style="color:#c0cb9a;text-transform:uppercase;letter-spacing:.12em;font-size:12px">Irie trip plan</div>
<h1>${esc(meta.title)}</h1><div>${esc(meta.destination)}</div>
<div class="pills"><span>${esc(shortDate(meta.dates.start))} – ${esc(shortDate(meta.dates.end))}</span><span>${esc(meta.dates.nights)} nights</span><span>${esc(meta.group.totalPeople)} people</span><span>${esc(preferences.planningStyle)} plan</span></div>
${verifiedLine ? `<div style="margin-top:10px;font-size:13px;color:#c0cb9a">✓ ${verifiedLine}</div>` : ""}
<div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div></div></header>
<nav role="tablist">${["Itinerary", "Eat & drink", "Grocery", "Activities", "Packing"].map((t, i) => `<button role="tab" aria-selected="${i === 0}" data-tab="${i}">${t}</button>`).join("")}</nav>
<main>
<div class="panel on" data-panel="0">${itinerary}</div>
<div class="panel" data-panel="1">${eat}</div>
<div class="panel" data-panel="2">${grocery}</div>
<div class="panel" data-panel="3">${tips}</div>
<div class="panel" data-panel="4">${packing}</div>
</main>
<footer>Opening hours and details were checked when this plan was created and can change — call ahead for reservations.${opts.url ? ` Live version: <a href="${safeUrl(opts.url)}">${esc(opts.url)}</a>` : ""}</footer>
<script>
(function(){var K="irie-${esc(opts.slug)}-";
document.querySelectorAll("nav button").forEach(function(b){b.addEventListener("click",function(){var t=b.getAttribute("data-tab");
document.querySelectorAll("nav button").forEach(function(x){x.setAttribute("aria-selected",String(x===b))});
document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.getAttribute("data-panel")===t)});window.scrollTo(0,0)})});
document.querySelectorAll("input[type=checkbox]").forEach(function(c){var k=K+c.getAttribute("data-key");try{var v=localStorage.getItem(k);if(v!==null)c.checked=v==="1"}catch(e){}
c.addEventListener("change",function(){try{localStorage.setItem(k,c.checked?"1":"0")}catch(e){}})});})();
</script>
</body></html>`;
}
