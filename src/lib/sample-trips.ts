import { GeneratedTrip } from "@/types/trip";

const SANTORINI: GeneratedTrip = {
  meta: {
    title: "Sunsets & Seafood in Santorini",
    destination: "Santorini, Greece",
    dates: { start: "Jun 14", end: "Jun 19", nights: 5 },
    group: { adults: 2, kids: 0, kidAges: [], totalPeople: 2 },
    property: "Cliffside villa with plunge pool, Oia",
    tripType: "couples",
  },
  preferences: {
    planningStyle: "balanced",
    budget: "splurge",
    vibes: ["foodie", "laid-back", "cultural"],
    cookInRatio: "mix",
    dietaryRestrictions: [],
  },
  recipes: [
    {
      id: "r1", name: "Greek Yogurt Breakfast Bowl", mealType: "breakfast", day: 1,
      servings: 2, prepTime: "5 min", cookTime: "0 min", difficulty: "easy",
      tip: "Pick up thick strained yogurt from the local market in Fira.",
      ingredients: [
        { item: "Greek yogurt", amount: "2", unit: "cups", category: "dairy" },
        { item: "Honey", amount: "2", unit: "tbsp", category: "pantry" },
        { item: "Walnuts", amount: "1/4", unit: "cup", category: "pantry" },
        { item: "Fresh figs", amount: "4", unit: "whole", category: "produce" },
      ],
      steps: [
        { step: 1, instruction: "Divide yogurt between two bowls." },
        { step: 2, instruction: "Halve the figs and arrange on top." },
        { step: 3, instruction: "Drizzle with honey and scatter walnuts." },
      ],
      tags: ["quick", "vegetarian", "no-cook"],
    },
    {
      id: "r2", name: "Tomato Fritters (Ntomatokeftedes)", mealType: "lunch", day: 2,
      servings: 2, prepTime: "15 min", cookTime: "10 min", difficulty: "medium",
      tip: "Santorini cherry tomatoes are uniquely sweet — don't substitute.",
      ingredients: [
        { item: "Santorini cherry tomatoes", amount: "300", unit: "g", category: "produce" },
        { item: "Red onion", amount: "1", unit: "small", category: "produce" },
        { item: "Fresh mint", amount: "1/4", unit: "cup", category: "produce" },
        { item: "All-purpose flour", amount: "1/2", unit: "cup", category: "pantry" },
        { item: "Olive oil", amount: "3", unit: "tbsp", category: "pantry" },
      ],
      steps: [
        { step: 1, instruction: "Dice tomatoes and onion, salt and rest 10 min, squeeze out moisture." },
        { step: 2, instruction: "Mix with mint, flour, and seasoning to form a thick batter." },
        { step: 3, instruction: "Fry spoonfuls in olive oil until golden, 2–3 min per side." },
      ],
      tags: ["vegetarian", "local-specialty", "appetizer"],
    },
  ],
  itinerary: [
    {
      day: 1, date: "Jun 14", theme: "Arrival & Oia sunset",
      meals: {
        breakfast: { type: "cook-in", name: "Greek Yogurt Breakfast Bowl", recipeId: "r1" },
        lunch: { type: "eat-out", name: "Lunch at Metaxi Mas, Exo Gonia" },
        dinner: { type: "eat-out", name: "Sunset dinner at Lauda Restaurant, Oia" },
      },
      activities: [
        "10:00am — Check into villa, settle in",
        "1:00pm — Drive to Metaxi Mas for the best moussaka on the island",
        "3:30pm — Wander the blue-domed churches of Oia",
        "7:30pm — Claim your sunset spot at Oia Castle — arrive 45 min early",
        "9:00pm — Dinner at Lauda with Aegean views",
      ],
      vibe: ["romantic", "cultural"],
    },
    {
      day: 2, date: "Jun 15", theme: "Fira & volcanic beaches",
      meals: {
        breakfast: { type: "eat-out", name: "Coffee and pastries at Bette Creperie, Fira" },
        lunch: { type: "cook-in", name: "Tomato Fritters (Ntomatokeftedes)", recipeId: "r2" },
        dinner: { type: "eat-out", name: "Dinner at Selene, Pyrgos" },
      },
      activities: [
        "9:00am — Hike the caldera path from Fira to Imerovigli (4km, 1.5hr)",
        "11:00am — Cable car back down to old port",
        "1:30pm — Tomato fritters lunch at the villa — ingredients from Fira market",
        "4:00pm — Drive to Perissa Black Sand Beach for a swim",
        "8:30pm — Dinner at Selene — book the terrace table",
      ],
      vibe: ["adventurous", "foodie"],
    },
    {
      day: 3, date: "Jun 16", theme: "Winery tour & Akrotiri ruins",
      meals: {
        breakfast: { type: "eat-out", name: "Breakfast at the villa's recommended café" },
        lunch: { type: "eat-out", name: "Meze lunch at Santo Wines winery" },
        dinner: { type: "eat-out", name: "Dinner at Ammoudi Fish Tavern, Oia" },
      },
      activities: [
        "9:30am — Akrotiri archaeological site (pre-book tickets)",
        "12:00pm — Wine tasting + meze platter at Santo Wines with caldera views",
        "3:00pm — Afternoon free — villa pool and nap",
        "7:00pm — Walk down 214 steps to Ammoudi Bay",
        "8:00pm — Fresh octopus and grilled fish at the waterfront taverns",
      ],
      vibe: ["cultural", "foodie", "laid-back"],
    },
    {
      day: 4, date: "Jun 17", theme: "Boat trip around the caldera",
      meals: {
        breakfast: { type: "eat-out", name: "Continental breakfast at villa" },
        lunch: { type: "eat-out", name: "BBQ lunch on the catamaran" },
        dinner: { type: "eat-out", name: "Final dinner at Roka Restaurant, Oia" },
      },
      activities: [
        "9:00am — Private catamaran tour departs from Vlychada Marina",
        "10:30am — Swim at the Hot Springs, Nea Kameni volcanic island",
        "12:30pm — BBQ lunch aboard, anchored in the caldera",
        "3:00pm — Snorkeling stop at Red Beach",
        "6:00pm — Return to port",
        "8:30pm — Farewell dinner at Roka",
      ],
      vibe: ["adventurous", "romantic"],
    },
    {
      day: 5, date: "Jun 18", theme: "Pyrgos & slow morning",
      meals: {
        breakfast: { type: "eat-out", name: "Breakfast at Franco's Café, Pyrgos" },
        lunch: { type: "eat-out", name: "Late lunch at Nikolas Taverna, Fira" },
        dinner: { type: "eat-out", name: "Dinner at Kastro Oia Restaurant" },
      },
      activities: [
        "9:00am — Drive to hilltop Pyrgos village — best 360° island views",
        "10:30am — Browse local ceramics and art galleries",
        "1:00pm — Long leisurely lunch at Nikolas Taverna in Fira",
        "4:00pm — Last villa pool session",
        "8:00pm — Final sunset dinner at Kastro",
      ],
      vibe: ["cultural", "laid-back"],
    },
  ],
  restaurants: [
    {
      id: "rest1", name: "Metaxi Mas", address: "Exo Gonia, Santorini",
      hours: "1:00pm – 11:00pm daily", priceRange: "$$$",
      tags: ["greek", "local-favorite", "moussaka"],
      description: "Off-the-beaten-path taverna beloved by locals. The moussaka and lamb dishes are extraordinary.",
      rating: "4.9",
    },
    {
      id: "rest2", name: "Lauda Restaurant", address: "Oia Castle area, Santorini",
      hours: "7:00pm – 11:30pm daily", priceRange: "$$$$",
      tags: ["fine-dining", "seafood", "sunset-views"],
      description: "Refined Mediterranean with unobstructed caldera views. Reserve the terrace table weeks in advance.",
      rating: "4.8",
    },
    {
      id: "rest3", name: "Ammoudi Fish Tavern", address: "Ammoudi Bay, Oia",
      hours: "12:00pm – 10:00pm daily", priceRange: "$$",
      tags: ["seafood", "waterfront", "casual"],
      description: "Grilled octopus and fresh catch served right on the dock. Worth the 214-step descent.",
      rating: "4.7",
    },
  ],
  groceryList: {
    byMeal: [],
    staples: [
      { item: "Local olive oil", amount: "1", unit: "bottle", category: "pantry" },
      { item: "Sea salt flakes", amount: "1", unit: "pack", category: "pantry" },
    ],
    shoppingNote: "Fira central market is best for produce. Pick up yogurt and honey on arrival.",
    stores: [
      { name: "Fira Central Market", type: "local-market", note: "Best for fresh produce and local honey" },
    ],
  },
  tips: {
    activities: [
      {
        name: "Caldera Hike (Fira to Oia)",
        description: "The 10km cliffside hike is one of the most spectacular walks in the Mediterranean. Start at sunrise.",
        duration: "3–4 hours",
        cost: "Free",
        bookingRequired: false,
        kidFriendly: false,
        tags: ["hiking", "views", "sunrise"],
      },
      {
        name: "Akrotiri Archaeological Site",
        description: "A Bronze Age city buried by the same volcanic eruption as Pompeii — but 1,000 years earlier.",
        duration: "1.5–2 hours",
        cost: "€14",
        bookingRequired: true,
        kidFriendly: true,
        tags: ["history", "culture", "archaeology"],
      },
    ],
    practical: [
      "Rent an ATV or car — the bus system is slow and unreliable",
      "Book sunset dinner tables at least 2 weeks ahead in summer",
      "Carry cash — many small tavernas don't accept cards",
      "The cable car in Fira has a 30–45 min queue in peak season — take the donkeys or walk",
    ],
    dayTrips: [
      {
        destination: "Thirassia Island",
        distanceMinutes: 30,
        description: "Santorini's quieter sister island — take a ferry from Ammoudi Bay for a crowd-free caldera experience.",
        highlights: ["Traditional fishing village", "Fewer tourists", "Local tavernas"],
      },
    ],
  },
  packingList: {
    clothingAdults: [
      { item: "Linen shirt (x3)", checked: false },
      { item: "Light sundress (x2)", checked: false },
      { item: "Comfortable walking sandals", checked: false },
      { item: "Evening outfit for fine dining", checked: false },
    ],
    clothingKids: [],
    beachOutdoor: [
      { item: "Reef-safe sunscreen SPF50+", checked: false },
      { item: "Snorkel mask", checked: false },
      { item: "Water shoes (for lava rock beaches)", checked: false },
    ],
    kitchen: [],
    toiletries: [
      { item: "After-sun lotion", checked: false },
      { item: "Lip balm with SPF", checked: false },
    ],
    electronics: [
      { item: "EU power adapter", checked: false },
      { item: "Waterproof phone case", checked: false },
    ],
    evening: [
      { item: "Light layer / wrap for evening sea breeze", checked: false },
    ],
    groupLogistics: [
      { item: "Printed restaurant reservation confirmations", checked: false },
      { item: "Akrotiri ticket printout", checked: false },
    ],
    propertyProvides: [
      { item: "Pool towels", checked: false, propertyProvides: true },
      { item: "Beach towels", checked: false, propertyProvides: true },
    ],
  },
};

const TOKYO: GeneratedTrip = {
  meta: {
    title: "Tokyo: Ramen, Rails & Neon Nights",
    destination: "Tokyo, Japan",
    dates: { start: "Oct 5", end: "Oct 10", nights: 5 },
    group: { adults: 2, kids: 0, kidAges: [], totalPeople: 2 },
    property: "Design hotel in Shinjuku, city views",
    tripType: "city trip",
  },
  preferences: {
    planningStyle: "structured",
    budget: "moderate",
    vibes: ["foodie", "cultural", "adventurous"],
    cookInRatio: "mostly-out",
    dietaryRestrictions: [],
  },
  recipes: [
    {
      id: "r10", name: "Hotel Breakfast Spread", mealType: "breakfast", day: 1,
      servings: 2, prepTime: "0 min", cookTime: "0 min", difficulty: "easy",
      tip: "Most Tokyo hotels offer excellent Japanese breakfast buffets — opt in.",
      ingredients: [],
      steps: [],
      tags: ["hotel", "buffet"],
    },
  ],
  itinerary: [
    {
      day: 1, date: "Oct 5", theme: "Shinjuku arrival & Omoide Yokocho",
      meals: {
        breakfast: { type: "eat-out", name: "Hotel breakfast buffet" },
        lunch: { type: "eat-out", name: "Ramen at Fuunji (tsukemen specialist), Shinjuku" },
        dinner: { type: "eat-out", name: "Yakitori at Omoide Yokocho (Memory Lane)" },
      },
      activities: [
        "12:00pm — Check into hotel, store bags",
        "1:00pm — Tsukemen ramen at Fuunji — arrive before 11:30am to avoid the queue",
        "3:00pm — Walk east Shinjuku to Kabukicho — explore the entertainment district",
        "5:00pm — Tokyo Metropolitan Government Building observation deck (free, closes 10:30pm)",
        "7:30pm — Dinner in Omoide Yokocho — order the chicken hearts and skin skewers",
      ],
      vibe: ["foodie", "nightlife"],
    },
    {
      day: 2, date: "Oct 6", theme: "Harajuku, Meiji & Shibuya",
      meals: {
        breakfast: { type: "eat-out", name: "Tamagoyaki breakfast at Tsukiji Outer Market" },
        lunch: { type: "eat-out", name: "Crepes on Takeshita Street, Harajuku" },
        dinner: { type: "eat-out", name: "Gyukatsu (beef cutlet) at Gyukatsu Motomura, Shibuya" },
      },
      activities: [
        "8:00am — Tsukiji Outer Market for breakfast — fresh tamagoyaki and tuna onigiri",
        "10:30am — Meiji Shrine — serene 70-hectare forested shrine in central Tokyo",
        "12:30pm — Takeshita Street for Harajuku crepes and people-watching",
        "2:30pm — Omotesando — Tokyo's most architecturally interesting shopping street",
        "5:00pm — Shibuya Crossing — watch the scramble from above at Starbucks or Mag's Park",
        "7:00pm — Gyukatsu dinner — the queue moves fast",
      ],
      vibe: ["cultural", "foodie"],
    },
    {
      day: 3, date: "Oct 7", theme: "Asakusa, Akihabara & izakaya night",
      meals: {
        breakfast: { type: "eat-out", name: "Melonpan and coffee at Pelican Café, Asakusa" },
        lunch: { type: "eat-out", name: "Tempura at Daikokuya, Asakusa (since 1887)" },
        dinner: { type: "eat-out", name: "Izakaya hopping in Yurakucho under the train tracks" },
      },
      activities: [
        "8:30am — Senso-ji Temple at dawn before the crowds arrive",
        "9:30am — Browse the Nakamise shopping street for omiyage gifts",
        "11:30am — Tempura lunch at Daikokuya — the original location, cash only",
        "2:00pm — Akihabara electronics and anime district",
        "4:30pm — teamLab Planets (pre-book) or skip to Yurakucho",
        "7:00pm — Multiple izakayas under Yurakucho's railway arches — order draft Sapporo and edamame",
      ],
      vibe: ["cultural", "foodie", "nightlife"],
    },
    {
      day: 4, date: "Oct 8", theme: "Tsukiji, Ginza & Roppongi",
      meals: {
        breakfast: { type: "eat-out", name: "Sushi breakfast at Sushi Dai, Toyosu Market" },
        lunch: { type: "eat-out", name: "Tonkatsu at Maisen, Omotesando" },
        dinner: { type: "eat-out", name: "Omakase at Sushi Yoshitake, Ginza (pre-booked)" },
      },
      activities: [
        "6:30am — Depart for Toyosu Market — join the Sushi Dai queue by 6:45am",
        "10:00am — Return to hotel, nap",
        "12:30pm — Tonkatsu at Maisen in the old bathhouse building",
        "3:00pm — Ginza galleries and the Itoya stationery flagship",
        "6:00pm — Pre-dinner drinks at a Ginza bar",
        "8:00pm — Omakase dinner — 12-course nigiri from the counter",
      ],
      vibe: ["foodie", "cultural"],
    },
    {
      day: 5, date: "Oct 9", theme: "Yanaka & slow Tokyo",
      meals: {
        breakfast: { type: "eat-out", name: "Coffee and toast at Kayaba Coffee, Yanaka" },
        lunch: { type: "eat-out", name: "Soba at Kanda Matsuya (since 1884)" },
        dinner: { type: "eat-out", name: "Shabu-shabu at Nabezo, Shinjuku" },
      },
      activities: [
        "9:00am — Yanaka Ginza old shopping street — Tokyo before the skyscrapers",
        "10:30am — Yanaka Cemetery walk — beautiful in autumn foliage",
        "12:30pm — Hand-cut soba at Kanda Matsuya, one of Tokyo's oldest soba shops",
        "2:30pm — Jimbocho used book district",
        "5:00pm — Last walk through Shinjuku Gyoen garden",
        "7:30pm — Farewell shabu-shabu dinner",
      ],
      vibe: ["cultural", "laid-back", "foodie"],
    },
  ],
  restaurants: [
    {
      id: "rest10", name: "Fuunji", address: "1-12-1 Nishishinjuku, Shinjuku",
      hours: "11:00am – 3:00pm, 5:30pm – 9:00pm (closed Sun)",
      priceRange: "$$",
      tags: ["ramen", "tsukemen", "queue", "cash-only"],
      description: "Best tsukemen (dipping ramen) in Shinjuku. Arrive before opening to beat the line.",
      rating: "4.8",
    },
    {
      id: "rest11", name: "Daikokuya Tempura", address: "1-38-10 Asakusa, Taito",
      hours: "11:00am – 8:30pm daily (queue before noon)",
      priceRange: "$$",
      tags: ["tempura", "traditional", "cash-only", "since-1887"],
      description: "The definitive Asakusa tempura experience. Dark sesame oil, crispy batter, rice-bowl sets.",
      rating: "4.7",
    },
    {
      id: "rest12", name: "Gyukatsu Motomura", address: "Multiple Shibuya locations",
      hours: "11:00am – 10:30pm daily",
      priceRange: "$$",
      tags: ["beef", "katsu", "quick-queue"],
      description: "You cook thin beef cutlets on a personal stone grill. Order the rare set.",
      rating: "4.6",
    },
  ],
  groceryList: {
    byMeal: [],
    staples: [],
    shoppingNote: "Mostly eating out — pick up snacks at 7-Eleven or Family Mart (genuinely excellent in Japan).",
    stores: [
      { name: "7-Eleven / Family Mart", type: "general", note: "Onigiri, sandwiches, hot foods — better than most restaurants elsewhere" },
    ],
  },
  tips: {
    activities: [
      {
        name: "Senso-ji Temple at Dawn",
        description: "Arrive by 6:30am before tour groups. The lantern-lit approach is magical in the early mist.",
        duration: "1 hour",
        cost: "Free",
        bookingRequired: false,
        kidFriendly: true,
        tags: ["temple", "dawn", "photography"],
      },
      {
        name: "teamLab Planets",
        description: "Immersive digital art installation in Toyosu. Book 2 weeks ahead — sells out.",
        duration: "1.5 hours",
        cost: "¥3,200",
        bookingRequired: true,
        kidFriendly: true,
        tags: ["art", "immersive", "photography"],
      },
    ],
    practical: [
      "Get a Suica card at the airport — works on all trains, buses, and most convenience stores",
      "Google Maps transit directions are perfectly accurate for Tokyo trains",
      "Carry ¥10,000 in cash at all times — many top restaurants are cash only",
      "Tipping is not done in Japan and can cause awkwardness",
      "Book teamLab and any omakase restaurants 2–4 weeks ahead via TableCheck or Tableall",
    ],
    dayTrips: [
      {
        destination: "Nikko",
        distanceMinutes: 120,
        description: "UNESCO-listed shrines and waterfalls in the mountains north of Tokyo. Day-trip on the Spacia limited express.",
        highlights: ["Tosho-gu Shrine", "Kegon Falls", "Cedar Avenue approach road"],
      },
      {
        destination: "Kamakura",
        distanceMinutes: 60,
        description: "Coastal town with the giant Buddha and temple-lined hiking trails.",
        highlights: ["Giant Kotoku-in Buddha", "Hase-dera garden", "Fresh shirasu (whitebait) on the coast"],
      },
    ],
  },
  packingList: {
    clothingAdults: [
      { item: "Comfortable walking shoes (you'll do 20k steps/day)", checked: false },
      { item: "Slip-on shoes for easy removal at shrines/restaurants", checked: false },
      { item: "Light layers — October is warm days, cool evenings", checked: false },
      { item: "One smart-casual outfit for fine dining", checked: false },
    ],
    clothingKids: [],
    beachOutdoor: [],
    kitchen: [],
    toiletries: [
      { item: "Pocket tissues (used instead of hand dryers)", checked: false },
      { item: "Portable hand sanitizer", checked: false },
    ],
    electronics: [
      { item: "Japan power adapter (Type A — same as US)", checked: false },
      { item: "Portable WiFi or SIM card (pre-order from Sakura Mobile)", checked: false },
    ],
    evening: [],
    groupLogistics: [
      { item: "Printed/saved omakase reservation confirmation", checked: false },
      { item: "teamLab ticket QR codes downloaded offline", checked: false },
    ],
    propertyProvides: [],
  },
};

const AUSTIN: GeneratedTrip = {
  meta: {
    title: "Austin: BBQ, Beats & Barton Springs",
    destination: "Austin, TX, USA",
    dates: { start: "Apr 11", end: "Apr 15", nights: 4 },
    group: { adults: 4, kids: 0, kidAges: [], totalPeople: 4 },
    property: "East Austin bungalow with back deck, full kitchen",
    tripType: "friends trip",
  },
  preferences: {
    planningStyle: "flexible",
    budget: "moderate",
    vibes: ["live-music", "foodie", "adventurous"],
    cookInRatio: "mix",
    dietaryRestrictions: [],
  },
  recipes: [
    {
      id: "r20", name: "Breakfast Tacos (Austin-style)", mealType: "breakfast", day: 1,
      servings: 4, prepTime: "10 min", cookTime: "15 min", difficulty: "easy",
      tip: "Use flour tortillas from H-E-B — the Central Market ones are exceptional.",
      ingredients: [
        { item: "Flour tortillas (6-inch)", amount: "8", unit: "count", category: "bakery" },
        { item: "Eggs", amount: "8", unit: "large", category: "dairy" },
        { item: "Chorizo", amount: "8", unit: "oz", category: "meat" },
        { item: "Potato", amount: "2", unit: "medium", category: "produce" },
        { item: "White onion", amount: "1", unit: "small", category: "produce" },
        { item: "Salsa verde", amount: "1", unit: "jar", category: "pantry" },
        { item: "Sharp cheddar", amount: "1", unit: "cup shredded", category: "dairy" },
      ],
      steps: [
        { step: 1, instruction: "Dice and pan-fry potatoes in oil until crispy, ~10 min. Season generously." },
        { step: 2, instruction: "Brown chorizo in same pan, breaking it up. Add diced onion." },
        { step: 3, instruction: "Scramble eggs directly into chorizo mixture, cook to your preference." },
        { step: 4, instruction: "Warm tortillas on a dry skillet. Fill with potato, egg-chorizo, cheese, salsa." },
      ],
      tags: ["breakfast", "tex-mex", "crowd-pleaser"],
    },
    {
      id: "r21", name: "Queso Blanco & Chips", mealType: "dinner", day: 2,
      servings: 4, prepTime: "5 min", cookTime: "15 min", difficulty: "easy",
      tip: "Velveeta is non-negotiable for proper Austin queso. Don't judge it, just make it.",
      ingredients: [
        { item: "Velveeta cheese", amount: "1", unit: "lb block", category: "dairy" },
        { item: "Rotel diced tomatoes & chilis", amount: "1", unit: "can", category: "pantry" },
        { item: "Jalapeño", amount: "2", unit: "fresh", category: "produce" },
        { item: "Tortilla chips", amount: "1", unit: "large bag", category: "pantry" },
        { item: "Lime", amount: "2", unit: "whole", category: "produce" },
      ],
      steps: [
        { step: 1, instruction: "Cube Velveeta and melt in saucepan over low heat, stirring constantly." },
        { step: 2, instruction: "Stir in Rotel and diced jalapeño. Squeeze in lime juice." },
        { step: 3, instruction: "Keep warm on low. Serve immediately with chips, garnish with cilantro." },
      ],
      tags: ["snack", "tex-mex", "party"],
    },
  ],
  itinerary: [
    {
      day: 1, date: "Apr 11", theme: "Arrival & 6th Street",
      meals: {
        breakfast: { type: "cook-in", name: "Breakfast Tacos (Austin-style)", recipeId: "r20" },
        lunch: { type: "eat-out", name: "Brisket plate at Franklin Barbecue — queue from 8am" },
        dinner: { type: "eat-out", name: "Drinks and tacos on East 6th" },
      },
      activities: [
        "8:00am — Join the Franklin BBQ queue (arrive 8am for noon opening — worth it)",
        "10:00am — Walk around the East 6th neighborhood while waiting",
        "12:00pm — Franklin BBQ opens — brisket, ribs, turkey, links",
        "2:00pm — Barton Springs Pool for an afternoon swim ($5 entry)",
        "6:00pm — Bar crawl on East 6th — try Hole in the Wall for live music",
        "9:00pm — Late-night tacos at Juan in a Million on Cesar Chavez",
      ],
      vibe: ["foodie", "live-music"],
    },
    {
      day: 2, date: "Apr 12", theme: "South Congress & live music",
      meals: {
        breakfast: { type: "eat-out", name: "Brunch at Veracruz All Natural food truck, East Austin" },
        lunch: { type: "eat-out", name: "Sandwiches at Thunderbird Coffee & Kitchen" },
        dinner: { type: "cook-in", name: "Queso Blanco & Chips + grill on the back deck", recipeId: "r21" },
      },
      activities: [
        "10:00am — Veracruz All Natural for the Migas taco — their most famous item",
        "12:00pm — South Congress Avenue stroll — vintage shops, bookstores, Allens Boots",
        "2:00pm — Blanton Museum of Art on UT campus (free Thursday evenings)",
        "5:00pm — H-E-B grocery run for grill supplies",
        "7:00pm — Back deck grilling and queso at the bungalow",
        "9:30pm — Uber to Continental Club for blues and roots music",
      ],
      vibe: ["foodie", "cultural", "live-music"],
    },
    {
      day: 3, date: "Apr 13", theme: "Outdoor Austin",
      meals: {
        breakfast: { type: "eat-out", name: "Coffee at Caffé Medici, West Campus" },
        lunch: { type: "eat-out", name: "Food truck park — try Loro (Asian smokehouse)" },
        dinner: { type: "eat-out", name: "Dinner at Uchi — Austin's best Japanese" },
      },
      activities: [
        "8:00am — Sunrise hike at Mount Bonnell (25 min, best city views in Austin)",
        "10:00am — Kayak rental on Lady Bird Lake at Rowing Dock",
        "12:30pm — Loro for brisket fried rice and bao buns",
        "3:00pm — Austin Bouldering Project for a session",
        "7:30pm — Uchi — book the 6-course omakase for the group",
      ],
      vibe: ["adventurous", "foodie"],
    },
    {
      day: 4, date: "Apr 14", theme: "Rainey Street & last night out",
      meals: {
        breakfast: { type: "eat-out", name: "Breakfast at Paperboy, East Austin" },
        lunch: { type: "eat-out", name: "Torchy's Tacos — order the Trailer Park Taco" },
        dinner: { type: "eat-out", name: "Dinner + live music at Stubb's Amphitheater" },
      },
      activities: [
        "10:00am — Leisurely brunch at Paperboy on Manor Road",
        "12:00pm — Last walk through East Austin neighborhoods",
        "2:00pm — Torchy's Tacos — the Trailer Park (fried chicken, green chilis, queso)",
        "4:00pm — Rainey Street — bar-hop the bungalow bars",
        "6:00pm — Check Stubb's calendar — outdoor amphitheater shows most nights",
        "10:00pm — Late-night at White Horse honky-tonk for two-stepping",
      ],
      vibe: ["live-music", "foodie", "nightlife"],
    },
  ],
  restaurants: [
    {
      id: "rest20", name: "Franklin Barbecue", address: "900 E 11th St, Austin",
      hours: "11:00am until sold out (usually 1:30–2pm) — closed Mon",
      priceRange: "$$",
      tags: ["bbq", "brisket", "queue", "worth-it", "james-beard-award"],
      description: "The most famous BBQ in America. The brisket is life-changing. Arrive 8am, bring a cooler and beer for the queue.",
      rating: "4.9",
    },
    {
      id: "rest21", name: "Veracruz All Natural", address: "Multiple East Austin locations",
      hours: "8:00am – 3:00pm daily",
      priceRange: "$",
      tags: ["tacos", "food-truck", "breakfast", "vegetarian-friendly"],
      description: "Best breakfast tacos in Austin, possibly in Texas. The Migas is the one.",
      rating: "4.8",
    },
    {
      id: "rest22", name: "Uchi", address: "801 S Lamar Blvd, Austin",
      hours: "5:00pm – 10:00pm daily",
      priceRange: "$$$",
      tags: ["japanese", "omakase", "fine-dining", "james-beard"],
      description: "James Beard-winning Japanese restaurant. Tyson Cole's omakase is the definitive Austin splurge.",
      rating: "4.9",
    },
  ],
  groceryList: {
    byMeal: [],
    staples: [
      { item: "Lone Star Beer (24-pack)", amount: "1", unit: "case", category: "drinks" },
      { item: "Topo Chico sparkling water", amount: "6", unit: "bottles", category: "drinks" },
      { item: "Hot sauce (Cholula)", amount: "1", unit: "bottle", category: "pantry" },
    ],
    shoppingNote: "H-E-B on Oltorf is the best grocery store in Texas. Do not skip it.",
    stores: [
      { name: "H-E-B Central Market", type: "general", note: "Best grocery store in Austin — get tortillas, salsa, and beer here" },
    ],
  },
  tips: {
    activities: [
      {
        name: "Barton Springs Pool",
        description: "A 3-acre natural spring pool fed by underground aquifers — stays 68°F year-round. Perfect April afternoon.",
        duration: "2–3 hours",
        cost: "$5",
        bookingRequired: false,
        kidFriendly: true,
        tags: ["swimming", "outdoor", "local-favorite"],
      },
      {
        name: "Continental Club",
        description: "Austin's oldest honky-tonk (1955) on South Congress. Live blues, rockabilly, and country every night.",
        duration: "2–3 hours",
        cost: "$5–10 cover",
        bookingRequired: false,
        kidFriendly: false,
        tags: ["live-music", "honky-tonk", "iconic"],
      },
    ],
    practical: [
      "Uber/Lyft is essential — parking in Austin is brutal",
      "Franklin BBQ queue: bring camp chairs, a cooler, and start drinking. It's a social event.",
      "6th Street is touristy — Rainey Street and East 6th have better bars for locals",
      "Tipping culture is strong in Austin — 20% minimum at sit-down restaurants",
      "Check the Austin City Limits taping schedule — free tickets often available",
    ],
    dayTrips: [
      {
        destination: "Wimberley, TX",
        distanceMinutes: 60,
        description: "Hill Country river town with swimming holes, antique stores, and the famous Blue Hole.",
        highlights: ["Blue Hole swimming", "Wimberley Square antiques", "Cypress Creek"],
      },
    ],
  },
  packingList: {
    clothingAdults: [
      { item: "Cowboy boots (optional but encouraged)", checked: false },
      { item: "Comfortable sneakers for walking", checked: false },
      { item: "Light layers — April nights can be cool", checked: false },
      { item: "Swimsuit for Barton Springs", checked: false },
    ],
    clothingKids: [],
    beachOutdoor: [
      { item: "Sunscreen SPF50+", checked: false },
      { item: "Polarized sunglasses", checked: false },
    ],
    kitchen: [
      { item: "Cast iron skillet (if bungalow doesn't have one)", checked: false },
    ],
    toiletries: [],
    electronics: [
      { item: "Portable speaker for back deck", checked: false },
    ],
    evening: [
      { item: "Ear plugs for late-night 6th Street", checked: false },
    ],
    groupLogistics: [
      { item: "Uchi reservation confirmation", checked: false },
      { item: "Venmo or cash for splitting bills", checked: false },
    ],
    propertyProvides: [
      { item: "Back deck seating", checked: false, propertyProvides: true },
      { item: "Full kitchen with grill", checked: false, propertyProvides: true },
    ],
  },
};

export const SAMPLE_TRIPS: Record<string, GeneratedTrip> = {
  santorini: SANTORINI,
  tokyo: TOKYO,
  austin: AUSTIN,
};
