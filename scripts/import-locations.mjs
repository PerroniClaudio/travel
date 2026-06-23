import { readFile } from "node:fs/promises";
import process from "node:process";

import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api.js";

const CITY_TABS = ["tokyo", "kyoto", "osaka", "altro"];
const TIME_SLOTS = [
  "mattina",
  "primo_pomeriggio",
  "pomeriggio",
  "aperitivo",
  "cena",
  "sera",
  "notte",
];
const ADDED_BY = ["Claudio", "Giorgia"];

const cityTabByLabel = new Map([
  ["tokyo", "tokyo"],
  ["kyoto", "kyoto"],
  ["osaka", "osaka"],
]);

function parseArgs(argv) {
  const options = {
    file: "locations.md",
    timeSlot: "pomeriggio",
    addedBy: "Claudio",
    notes: "",
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    const nextValue = argv[index + 1];

    if (!nextValue) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === "--file") {
      options.file = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--timeSlot") {
      options.timeSlot = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--addedBy") {
      options.addedBy = nextValue;
      index += 1;
      continue;
    }

    if (arg === "--notes") {
      options.notes = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!TIME_SLOTS.includes(options.timeSlot)) {
    throw new Error(`Invalid --timeSlot. Use one of: ${TIME_SLOTS.join(", ")}`);
  }

  if (!ADDED_BY.includes(options.addedBy)) {
    throw new Error(`Invalid --addedBy. Use one of: ${ADDED_BY.join(", ")}`);
  }

  return options;
}

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");

    for (const rawLine of content.split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

function normalizeName(value) {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

function parseLocationLine(line) {
  const parts = line
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const [cityLabel, ...rest] = parts;
  const normalizedCity = cityLabel.toLowerCase();
  const cityTab = cityTabByLabel.get(normalizedCity) ?? "altro";
  const query = (rest.length > 0 ? rest.join(", ") : cityLabel).trim();

  return {
    rawLine: line,
    cityLabel,
    cityTab,
    name: query,
    normalizedName: normalizeName(query),
    query: [query, cityLabel, "Japan"].join(", "),
  };
}

async function geocodeLocation(address, apiKey) {
  const geocodeUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  geocodeUrl.searchParams.set("address", address);
  geocodeUrl.searchParams.set("key", apiKey);

  const response = await fetch(geocodeUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const data = await response.json();
  const location = data?.results?.[0]?.geometry?.location;

  if (data?.status !== "OK" || location?.lat === undefined || location?.lng === undefined) {
    throw new Error(data?.error_message ?? `No coordinates found for: ${address}`);
  }

  return {
    lat: location.lat,
    lng: location.lng,
  };
}

async function getExistingNames(client) {
  const existing = new Map(CITY_TABS.map((cityTab) => [cityTab, new Set()]));

  for (const cityTab of CITY_TABS) {
    const places = await client.query(api.places.listByCity, { cityTab });
    for (const place of places) {
      existing.get(cityTab).add(normalizeName(place.name));
    }
  }

  return existing;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  await loadEnvFile(".env.local");
  await loadEnvFile(".env");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const mapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in environment");
  }

  if (!mapsApiKey) {
    throw new Error(
      "Missing GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in environment",
    );
  }

  const fileContent = await readFile(options.file, "utf8");
  const entries = fileContent
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseLocationLine)
    .filter(Boolean);

  const client = new ConvexHttpClient(convexUrl);
  const existingNames = await getExistingNames(client);

  let created = 0;
  let skipped = 0;

  for (const entry of entries) {
    const namesForCity = existingNames.get(entry.cityTab);

    if (namesForCity?.has(entry.normalizedName)) {
      skipped += 1;
      console.log(`Skip duplicate: ${entry.name}`);
      continue;
    }

    const coordinates = await geocodeLocation(entry.query, mapsApiKey);

    if (options.dryRun) {
      created += 1;
      console.log(
        `Dry run: ${entry.name} -> ${coordinates.lat}, ${coordinates.lng} [${entry.cityTab}]`,
      );
      continue;
    }

    await client.mutation(api.places.create, {
      name: entry.name,
      cityTab: entry.cityTab,
      lat: coordinates.lat,
      lng: coordinates.lng,
      notes: options.notes,
      timeSlot: options.timeSlot,
      addedBy: options.addedBy,
    });

    namesForCity?.add(entry.normalizedName);
    created += 1;
    console.log(`Imported: ${entry.name}`);
  }

  console.log(`Completed. Imported: ${created}. Skipped: ${skipped}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});