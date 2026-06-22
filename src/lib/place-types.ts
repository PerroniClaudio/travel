import type { Id } from "../../convex/_generated/dataModel";

export const cityTabs = ["tokyo", "kyoto", "osaka", "altro"] as const;
export const timeSlots = [
  "mattina",
  "primo_pomeriggio",
  "pomeriggio",
  "aperitivo",
  "cena",
  "sera",
  "notte",
] as const;
export const addedByOptions = ["Claudio", "Giorgia"] as const;

export type CityTab = (typeof cityTabs)[number];
export type TimeSlot = (typeof timeSlots)[number];
export type AddedBy = (typeof addedByOptions)[number];
export type PlaceId = Id<"places">;
export type Place = {
  _id: PlaceId;
  _creationTime: number;
  name: string;
  cityTab: CityTab;
  lat: number;
  lng: number;
  notes: string;
  timeSlot: TimeSlot;
  visited: boolean;
  addedBy: AddedBy;
};
