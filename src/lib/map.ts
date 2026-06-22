import type { CityTab, Place, TimeSlot } from "@/lib/place-types";

export const cityMeta: Record<
  CityTab,
  { label: string; center: { lat: number; lng: number }; zoom: number }
> = {
  tokyo: { label: "Tokyo", center: { lat: 35.6764, lng: 139.6501 }, zoom: 11 },
  kyoto: { label: "Kyoto", center: { lat: 35.0116, lng: 135.7681 }, zoom: 12 },
  osaka: { label: "Osaka", center: { lat: 34.6937, lng: 135.5023 }, zoom: 12 },
  altro: { label: "Altro", center: { lat: 35.1815, lng: 136.9066 }, zoom: 6 },
};

export const timeSlotLabels: Record<TimeSlot, string> = {
  mattina: "Mattina",
  primo_pomeriggio: "Primo pomeriggio",
  pomeriggio: "Pomeriggio",
  aperitivo: "Aperitivo",
  cena: "Cena",
  sera: "Sera",
  notte: "Notte",
};

export const timeSlotColors: Record<TimeSlot, string> = {
  mattina: "#f59e0b",
  primo_pomeriggio: "#f97316",
  pomeriggio: "#ef4444",
  aperitivo: "#ec4899",
  cena: "#8b5cf6",
  sera: "#3b82f6",
  notte: "#1d4ed8",
};

export function getDirectionsUrl(place: Pick<Place, "lat" | "lng">) {
  const params = new URLSearchParams({
    api: "1",
    destination: `${place.lat},${place.lng}`,
    travelmode: "walking",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
