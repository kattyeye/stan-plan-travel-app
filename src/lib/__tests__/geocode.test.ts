import { describe, expect, it } from "vitest";
import { parseGoogle, parsePhoton } from "../geocode";

describe("destination autocomplete parsing", () => {
  it("keeps travel destinations from OpenStreetMap and drops streets and duplicates", () => {
    const json = {
      features: [
        { properties: { osm_id: 1, osm_type: "R", osm_key: "place", osm_value: "island", name: "Corfu", state: "Ionian Islands", country: "Greece" } },
        { properties: { osm_id: 2, osm_type: "R", osm_key: "boundary", osm_value: "administrative", name: "Corfu", state: "Ionian Islands", country: "Greece" } },
        { properties: { osm_id: 3, osm_type: "W", osm_key: "highway", osm_value: "residential", name: "Corfu Street", country: "United States" } },
        { properties: { osm_id: 4, osm_type: "N", osm_key: "place", osm_value: "city", name: "Greece", country: "Greece" } },
      ],
    };
    expect(parsePhoton(json)).toEqual([
      { id: "osm:R1", label: "Corfu, Ionian Islands, Greece", mainText: "Corfu", secondaryText: "Ionian Islands, Greece" },
      { id: "osm:N4", label: "Greece", mainText: "Greece", secondaryText: "" },
    ]);
    expect(parsePhoton({})).toEqual([]);
  });

  it("maps Google Places (New) predictions", () => {
    const json = {
      suggestions: [
        { placePrediction: { placeId: "abc", text: { text: "Nags Head, NC, USA" }, structuredFormat: { mainText: { text: "Nags Head" }, secondaryText: { text: "NC, USA" } } } },
        { queryPrediction: { text: { text: "nags head restaurants" } } },
      ],
    };
    expect(parseGoogle(json)).toEqual([{ id: "g:abc", label: "Nags Head, NC, USA", mainText: "Nags Head", secondaryText: "NC, USA" }]);
  });
});
