const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

export const hasGoogleMapsKey = Boolean(apiKey);
export const googleMapsMapId = mapId;

let loaderInitialized = false;

async function getGoogleMapsLoader() {
  if (typeof window === "undefined") {
    throw new Error("Google Maps loader is only available in the browser");
  }

  const loader = await import("@googlemaps/js-api-loader");

  if (apiKey && !loaderInitialized) {
    loader.setOptions({
      key: apiKey,
      mapIds: [mapId],
      v: "weekly",
    });
    loaderInitialized = true;
  }

  return loader;
}

export async function loadMapsLibrary() {
  const { importLibrary } = await getGoogleMapsLoader();
  return importLibrary("maps");
}

export async function loadMarkerLibrary() {
  const { importLibrary } = await getGoogleMapsLoader();
  return importLibrary("marker");
}

export async function loadGeocodingLibrary() {
  const { importLibrary } = await getGoogleMapsLoader();
  return importLibrary("geocoding");
}
