# Irie

Personalised, verified trip plans: itinerary, meals and recipes, grocery list, restaurant guide, activities and packing list — built around the group, their planning style, and real opening hours.

- **Architecture & conventions:** [CLAUDE.md](CLAUDE.md)
- **Partner integration (Airbnb, VRBO, property managers):** [docs/PARTNER_API.md](docs/PARTNER_API.md)
- **Configuration:** [.env.example](.env.example)

## Develop

```bash
npm install
npm run dev:mock     # mock Claude API on :4010, no credits used
ANTHROPIC_BASE_URL=http://127.0.0.1:4010 ANTHROPIC_API_KEY=mock ADMIN_TOKEN=dev npm run dev
```

Open http://localhost:3000/wizard. Admin console: http://localhost:3000/admin/trips (token `dev`).

## Check

```bash
npm run typecheck && npm test && npm run lint && npm run build
```
