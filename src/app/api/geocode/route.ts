import { NextResponse } from "next/server";

const cityLabels = {
  tokyo: "Tokyo",
  kyoto: "Kyoto",
  osaka: "Osaka",
  altro: "Japan",
} as const;

type CityTab = keyof typeof cityLabels;

type GeocodeResponse = {
  status?: string;
  results?: Array<{
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
  error_message?: string;
};

export async function POST(request: Request) {
  const mapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!mapsApiKey) {
    return NextResponse.json(
      { error: "Missing Google Maps API key on server" },
      { status: 500 },
    );
  }

  const payload = (await request.json()) as {
    address?: string;
    cityTab?: CityTab;
  };

  const address = payload.address?.trim();
  const cityTab = payload.cityTab ?? "altro";

  if (!address) {
    return NextResponse.json(
      { error: "Inserisci indirizzo o nome luogo" },
      { status: 400 },
    );
  }

  const query = [address, cityLabels[cityTab], "Japan"].join(", ");
  const geocodeUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  geocodeUrl.searchParams.set("address", query);
  geocodeUrl.searchParams.set("key", mapsApiKey);

  const response = await fetch(geocodeUrl, { cache: "no-store" });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Geocoding failed" },
      { status: response.status },
    );
  }

  const data = (await response.json()) as GeocodeResponse;
  const location = data.results?.[0]?.geometry?.location;

  if (data.status !== "OK" || location?.lat === undefined || location.lng === undefined) {
    return NextResponse.json(
      { error: data.error_message ?? "Nessuna coordinata trovata" },
      { status: 422 },
    );
  }

  return NextResponse.json({ lat: location.lat, lng: location.lng });
}