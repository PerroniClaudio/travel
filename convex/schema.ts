import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  places: defineTable({
    name: v.string(),
    cityTab: v.union(
      v.literal("tokyo"),
      v.literal("kyoto"),
      v.literal("osaka"),
      v.literal("altro"),
    ),
    lat: v.number(),
    lng: v.number(),
    notes: v.string(),
    timeSlot: v.union(
      v.literal("mattina"),
      v.literal("primo_pomeriggio"),
      v.literal("pomeriggio"),
      v.literal("aperitivo"),
      v.literal("cena"),
      v.literal("sera"),
      v.literal("notte"),
    ),
    visited: v.boolean(),
    addedBy: v.union(v.literal("Claudio"), v.literal("Giorgia")),
  }).index("by_city_tab", ["cityTab"]),
});
