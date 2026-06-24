import { v } from "convex/values";
import { mutationGeneric, queryGeneric } from "convex/server";

const query = queryGeneric;
const mutation = mutationGeneric;

export const listByCity = query({
  args: {
    cityTab: v.union(
      v.literal("tokyo"),
      v.literal("kyoto"),
      v.literal("osaka"),
      v.literal("altro"),
    ),
  },
  handler: async (ctx, { cityTab }) => {
    let places;

    try {
      places = await ctx.db
        .query("places")
        .withIndex("by_city_tab", (q) => q.eq("cityTab", cityTab))
        .collect();
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes("by_city_tab")
      ) {
        throw error;
      }

      places = (await ctx.db.query("places").collect()).filter(
        (place) => place.cityTab === cityTab,
      );
    }

    return places.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const create = mutation({
  args: {
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
    addedBy: v.union(v.literal("Claudio"), v.literal("Giorgia")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("places", {
      ...args,
      visited: false,
    });

    return await ctx.db.get(id);
  },
});

export const toggleVisited = mutation({
  args: {
    id: v.id("places"),
    visited: v.boolean(),
  },
  handler: async (ctx, { id, visited }) => {
    await ctx.db.patch(id, { visited });
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: {
    id: v.id("places"),
  },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return { id };
  },
});
