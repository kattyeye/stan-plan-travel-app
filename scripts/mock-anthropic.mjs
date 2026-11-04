#!/usr/bin/env node
/**
 * Local stand-in for the Anthropic Messages API (streaming only), so the whole
 * trip pipeline can run in development without API credits:
 *
 *   node scripts/mock-anthropic.mjs            # listens on :4010
 *   ANTHROPIC_BASE_URL=http://127.0.0.1:4010 ANTHROPIC_API_KEY=mock npm run dev
 *
 * It recognises each pipeline stage from the request and streams back
 * plausible, schema-valid output. Research deliberately pauses once
 * (`pause_turn`) to exercise the continuation path. Every request body is
 * appended to MOCK_LOG (default: .mock-anthropic.log) for inspection.
 * MOCK_REJECT_GRAMMAR=1 rejects strict tools / output formats the way the real
 * API does for schemas it considers too large.
 * The places it returns are fictional — this is for testing plumbing only.
 */
import http from "node:http";
import fs from "node:fs";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const LOG = process.env.MOCK_LOG ?? ".mock-anthropic.log";

const sse = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

function stream(res, { model, blocks, stopReason }) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "request-id": `req_mock_${Date.now()}` });
  sse(res, "message_start", {
    type: "message_start",
    message: { id: `msg_mock_${Date.now()}`, type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 1 } },
  });
  blocks.forEach((b, index) => {
    if (b.type === "text") {
      sse(res, "content_block_start", { type: "content_block_start", index, content_block: { type: "text", text: "" } });
      for (let i = 0; i < b.text.length; i += 400) {
        sse(res, "content_block_delta", { type: "content_block_delta", index, delta: { type: "text_delta", text: b.text.slice(i, i + 400) } });
      }
    } else if (b.type === "tool_use" || b.type === "server_tool_use") {
      sse(res, "content_block_start", { type: "content_block_start", index, content_block: { type: b.type, id: b.id, name: b.name, input: {} } });
      const json = JSON.stringify(b.input);
      for (let i = 0; i < json.length; i += 400) {
        sse(res, "content_block_delta", { type: "content_block_delta", index, delta: { type: "input_json_delta", partial_json: json.slice(i, i + 400) } });
      }
    } else {
      sse(res, "content_block_start", { type: "content_block_start", index, content_block: b });
    }
    sse(res, "content_block_stop", { type: "content_block_stop", index });
  });
  sse(res, "message_delta", { type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 900 } });
  sse(res, "message_stop", { type: "message_stop" });
  res.end();
}

const textOf = (content) => (typeof content === "string" ? content : content.map((c) => c.text ?? "").join("\n"));
const systemOf = (body) => (typeof body.system === "string" ? body.system : (body.system ?? []).map((s) => s.text).join("\n"));

function research(destination) {
  const r = (name, bestFor, closedDays = [], price = "$$") => ({
    name, address: `${Math.floor(Math.random() * 900) + 100} Main St, ${destination}`, neighborhood: "Downtown", cuisine: "Local",
    priceRange: price, bestFor, closedDays, hoursSummary: closedDays.length ? `Closed ${closedDays.join(", ")}` : "Daily",
    kidFriendly: true, dietaryOptions: ["vegetarian options"], whyItFits: `${name} is a relaxed local favourite with room for the whole group.`,
    sourceUrl: `https://example.com/${encodeURIComponent(name)}`, website: null,
  });
  return {
    areaSummary: `A walkable, relaxed part of ${destination}.`,
    weather: "Typically warm days around 82°F with cooler evenings.",
    restaurants: [
      r("Harbor Biscuit Co.", ["breakfast", "coffee"]),
      r("Dune Street Tacos", ["lunch", "dinner"]),
      r("The Saltbox", ["dinner"], ["Monday", "Tuesday"], "$$$"),
      r("Pier House Grill", ["lunch", "dinner"]),
      r("Morning Tide Café", ["breakfast", "lunch"]),
      r("Lantern Room", ["dinner", "drinks"], [], "$$$"),
    ],
    activities: [
      { name: "Lighthouse Climb", address: destination, description: "214 steps to the best view on the coast.", duration: "1 hour", cost: "$10 adults, $5 kids", bookingRequired: false, kidFriendly: true, closedDays: [], bestTime: "Go early before the heat.", tags: ["views"], sourceUrl: "https://example.com/lighthouse", website: null },
      { name: "Sound-side Kayak Tour", address: destination, description: "Calm-water guided paddle through the marsh.", duration: "2 hours", cost: "$45 per person", bookingRequired: true, kidFriendly: true, closedDays: ["Sunday"], bestTime: null, tags: ["adventure"], sourceUrl: "https://example.com/kayak", website: null },
      { name: "Maritime Museum", address: destination, description: "Shipwreck history with a hands-on kids' room.", duration: "1.5 hours", cost: "Free", bookingRequired: false, kidFriendly: true, closedDays: ["Monday"], bestTime: null, tags: ["cultural"], sourceUrl: "https://example.com/museum", website: null },
    ],
    groceryStores: [{ name: "Coastal Market", address: null, type: "general", note: "Full grocery with good seafood counter", sourceUrl: "https://example.com/market" }],
    events: [{ name: "Friday Night Concert Series", dates: "Fridays through August", description: "Free live music on the green.", sourceUrl: "https://example.com/concerts" }],
    dayTrips: [{ destination: "Ocracoke Island", distanceMinutes: 80, description: "Ferry over for wild ponies and a quiet village.", highlights: ["Ferry ride", "Wild ponies"] }],
    practicalTips: ["Beach parking fills by 10am on weekends.", "Book the kayak tour at least 3 days ahead."],
  };
}

function plan(prompt) {
  const days = [...prompt.matchAll(/^Day (\d+): (\w+) (\d{4}-\d{2}-\d{2})/gm)].map((m) => ({ day: +m[1], weekday: m[2] }));
  const style = /Planning style: (\w+)/.exec(prompt)?.[1] ?? "balanced";
  const t = (time, bucket) => (style === "structured" ? time : style === "balanced" ? bucket : null);
  const recipes = [];
  const out = days.map(({ day }) => {
    const rec = `rec-${recipes.length + 1}`;
    recipes.push({ id: rec, name: day % 2 ? "Blueberry pancakes" : "Breakfast burritos", mealType: "breakfast", day, brief: "Easy group breakfast", dietaryApproach: "Works for everyone as written" });
    const dinnerRec = `rec-${recipes.length + 1}`;
    const cookDinner = day % 2 === 0;
    if (cookDinner) recipes.push({ id: dinnerRec, name: "Grilled shrimp tacos", mealType: "dinner", day, brief: "Grill night at the house", dietaryApproach: "Swap shrimp for black beans on one plate if needed" });
    return {
      day,
      theme: day === 1 ? "Arrive and unwind" : day === days.length ? "Last swim and head home" : "Beach and explore",
      schedule: [
        `${t("9:00am", "Morning")} — Beach time near the house`.replace(/^null — /, "If the weather's nice, "),
        `${t("2:00pm", "Afternoon")} — Lighthouse Climb`.replace(/^null — /, "Good afternoon for the "),
        `${t("7:30pm", "Evening")} — Sunset walk on the pier`.replace(/^null — /, "If you've got energy left, "),
      ],
      meals: {
        breakfast: { type: "cook-in", name: recipes.find((r) => r.id === rec).name, restaurantId: null, recipeId: rec, time: t("8:00am", "Morning"), note: null, alternativeIds: [] },
        lunch: { type: "eat-out", name: "Lunch at Dune Street Tacos", restaurantId: "rest-2", recipeId: null, time: t("12:30pm", "Midday"), note: null, alternativeIds: style === "structured" ? [] : ["rest-4"] },
        dinner: cookDinner
          ? { type: "cook-in", name: "Grilled shrimp tacos", restaurantId: null, recipeId: dinnerRec, time: t("6:30pm", "Evening"), note: null, alternativeIds: [] }
          : { type: "eat-out", name: "Dinner at The Saltbox", restaurantId: "rest-3", recipeId: null, time: t("7:00pm", "Evening"), note: "Ask for the porch.", alternativeIds: style === "flexible" ? ["rest-4", "rest-6"] : [] },
      },
      vibe: ["laid-back"],
    };
  });
  return {
    title: "Salt, Sun & Slow Mornings",
    days: out,
    recipes,
    practicalTips: ["Reserve The Saltbox now — it books up a week out.", "Beach parking fills by 10am on weekends."],
    staples: [
      { item: "Coffee", amount: "1", unit: "bag", category: "pantry" },
      { item: "Sparkling water", amount: "12", unit: "cans", category: "drinks" },
      { item: "Sunscreen SPF 50", amount: "1", unit: "bottle", category: "supplies" },
    ],
    shoppingNote: "One big shop at Coastal Market on day 1 covers almost everything.",
  };
}

function recipes(prompt) {
  const servings = Number(/Servings for every recipe: (\d+)/.exec(prompt)?.[1] ?? 4);
  const specs = JSON.parse(prompt.slice(prompt.indexOf("Write these recipes:") + "Write these recipes:".length).trim().split(/\n\nA previous draft/)[0]);
  return {
    recipes: specs.map((s) => ({
      id: s.id, name: s.name, mealType: s.mealType, day: s.day, servings: Math.max(2, servings - 2), prepTime: "10 min", cookTime: "20 min", difficulty: "easy",
      tip: "Prep the night before so mornings stay slow.",
      ingredients: [
        { item: s.name.includes("shrimp") ? "Large shrimp" : "All-purpose flour", amount: "2", unit: s.name.includes("shrimp") ? "lb" : "cup", category: s.name.includes("shrimp") ? "seafood" : "pantry" },
        { item: "Eggs", amount: "4", unit: "", category: "dairy" },
        { item: "Limes", amount: "3", unit: "", category: "produce" },
        { item: "Olive oil", amount: "2", unit: "tbsp", category: "pantry" },
      ],
      steps: [{ step: 1, instruction: "Mix everything." }, { step: 2, instruction: "Cook until golden." }, { step: 3, instruction: "Serve family-style." }],
      tags: ["easy"],
      dietaryNotes: ["Works for everyone as written"],
    })),
  };
}

const packing = () => {
  const items = (...xs) => xs.map((item) => ({ item, propertyProvides: false }));
  return {
    clothingAdults: items("Swimsuits (2 each)", "Light rain jacket", "Sandals"),
    clothingKids: items("Rash guards", "Water shoes"),
    beachOutdoor: items("Beach umbrella", "Sand toys", "Reef-safe sunscreen"),
    kitchen: items("Favorite coffee", "Cooler for the drive"),
    toiletries: items("After-sun gel"),
    electronics: items("Portable speaker"),
    evening: items("Bug spray for the porch"),
    groupLogistics: items("Shared grocery budget app"),
    propertyProvides: [{ item: "Beach towels", propertyProvides: true }, { item: "Grill", propertyProvides: true }],
  };
};

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url.startsWith("/v1/messages")) {
    res.writeHead(404).end();
    return;
  }
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);
  fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), beta: req.headers["anthropic-beta"] ?? null, version: req.headers["anthropic-version"] ?? null, body }) + "\n");

  // MOCK_REJECT_GRAMMAR=1 mimics the real API refusing large strict schemas.
  if (process.env.MOCK_REJECT_GRAMMAR === "1" && (body.output_config?.format || (body.tools ?? []).some((t) => t.strict))) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "The compiled grammar is too large, which would cause performance issues. Simplify your tool schemas or reduce the number of strict tools." } }));
    return;
  }

  const system = systemOf(body);
  const firstPrompt = textOf(body.messages[0].content);
  const model = body.model;
  await new Promise((r) => setTimeout(r, Number(process.env.MOCK_DELAY_MS ?? 400)));

  if ((body.tools ?? []).some((t) => t.name === "submit_research")) {
    const destination = /Destination: (.+)/.exec(firstPrompt)?.[1] ?? "the coast";
    if (body.messages.length === 1) {
      return stream(res, {
        model,
        stopReason: "pause_turn",
        blocks: [
          { type: "server_tool_use", id: "srvtoolu_mock1", name: "web_search", input: { query: `best breakfast ${destination}` } },
          { type: "web_search_tool_result", tool_use_id: "srvtoolu_mock1", content: [{ type: "web_search_result", url: "https://example.com/harbor-biscuit", title: "Harbor Biscuit Co. — Menu & Hours", encrypted_content: "mock", page_age: null }] },
        ],
      });
    }
    return stream(res, { model, stopReason: "tool_use", blocks: [{ type: "tool_use", id: "toolu_mock1", name: "submit_research", input: research(destination) }] });
  }

  let payload;
  if (system.includes("packing lists")) payload = packing();
  else if (system.includes("trip planner")) payload = plan(firstPrompt);
  else if (system.includes("write recipes")) payload = recipes(firstPrompt);
  else if (system.includes("trip-planning form"))
    payload = { tripTypes: ["beach house", "villa"], vibes: ["laid-back", "family-fun", "foodie", "nature"], cuisines: ["Outer Banks seafood", "Southern breakfast"], amenities: ["beach access", "outdoor shower", "grill"] };
  else payload = { note: "unrecognised request" };

  stream(res, { model, stopReason: "end_turn", blocks: [{ type: "text", text: JSON.stringify(payload) }] });
});

server.listen(PORT, "127.0.0.1", () => console.log(`mock Anthropic API on http://127.0.0.1:${PORT} (log: ${LOG})`));
