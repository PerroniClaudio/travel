import type { CityTab, Place } from "@/lib/place-types";
import { timeSlotLabels } from "./map";

const timeSlotOrder = [
  "mattina",
  "primo_pomeriggio",
  "pomeriggio",
  "aperitivo",
  "cena",
  "sera",
  "notte",
] as const;

const thresholdKmByCity: Record<CityTab, number> = {
  tokyo: 2.4,
  kyoto: 3.2,
  osaka: 2.8,
  altro: 4.5,
};

export type SuggestedDay = {
  id: string;
  areaLabel: string;
  timeLabel: string;
  places: Place[];
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(a: Pick<Place, "lat" | "lng">, b: Pick<Place, "lat" | "lng">) {
  const earthRadius = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

function slotIndex(slot: Place["timeSlot"]) {
  return timeSlotOrder.indexOf(slot);
}

export function suggestDays(places: Place[], city: CityTab): SuggestedDay[] {
  const pending = [...places]
    .filter((place) => !place.visited)
    .sort((a, b) => slotIndex(a.timeSlot) - slotIndex(b.timeSlot));

  const groups: Place[][] = [];
  const thresholdKm = thresholdKmByCity[city];

  for (const place of pending) {
    const group = groups.find((candidate) =>
      candidate.some((member) => distanceKm(member, place) <= thresholdKm),
    );

    if (group) {
      group.push(place);
      group.sort((a, b) => slotIndex(a.timeSlot) - slotIndex(b.timeSlot));
      continue;
    }

    groups.push([place]);
  }

  return groups.slice(0, 5).map((group, index) => {
    const first = group[0];
    const last = group[group.length - 1];

    return {
      id: `day-${index + 1}`,
      areaLabel: `${first.name} area`,
      timeLabel:
        first.timeSlot === last.timeSlot
          ? timeSlotLabels[first.timeSlot]
          : `${timeSlotLabels[first.timeSlot]} -> ${timeSlotLabels[last.timeSlot]}`,
      places: group,
    };
  });
}
