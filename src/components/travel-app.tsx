"use client";

import { useMutation, useQuery } from "convex/react";
import {
  List,
  MapPinned,
  Plus,
  Route,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { suggestDays } from "@/lib/itinerary";
import { cityMeta, getDirectionsUrl, timeSlotLabels } from "@/lib/map";
import {
  addedByOptions,
  cityTabs,
  timeSlots,
  type AddedBy,
  type CityTab,
  type Place,
  type PlaceId,
  type TimeSlot,
} from "@/lib/place-types";
import { MapView } from "./map-view";

type Screen = "luoghi" | "mappa" | "nuovo" | "itinerario";
type DraftPlace = {
  name: string;
  cityTab: CityTab;
  notes: string;
  timeSlot: TimeSlot;
  addedBy: AddedBy;
  addressQuery: string;
};

const defaultDraft = (cityTab: CityTab): DraftPlace => ({
  name: "",
  cityTab,
  notes: "",
  timeSlot: "mattina",
  addedBy: "Claudio",
  addressQuery: "",
});

const screenOptions: Array<{ id: Screen; label: string; icon: LucideIcon }> = [
  { id: "luoghi", label: "Luoghi", icon: List },
  { id: "mappa", label: "Mappa", icon: MapPinned },
  { id: "nuovo", label: "Nuovo", icon: Plus },
  { id: "itinerario", label: "Itinerario", icon: Route },
];

export function TravelApp() {
  const [screen, setScreen] = useState<Screen>("mappa");
  const [city, setCity] = useState<CityTab>("tokyo");
  const [selectedPlaceId, setSelectedPlaceId] = useState<PlaceId | null>(null);
  const [draft, setDraft] = useState<DraftPlace>(defaultDraft("tokyo"));
  const [currentPosition, setCurrentPosition] =
    useState<GeolocationCoordinates | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingPlaceId, setDeletingPlaceId] = useState<PlaceId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const places = useQuery(api.places.listByCity, { cityTab: city }) as
    | Place[]
    | undefined;
  const createPlaceMutation = useMutation(api.places.create);
  const deletePlaceMutation = useMutation(api.places.remove);
  const toggleVisitedMutation = useMutation(api.places.toggleVisited);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => setCurrentPosition(position.coords),
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const loading = places === undefined;
  const placeList = places ?? [];
  const selectedPlace =
    placeList.find((place) => place._id === selectedPlaceId) ?? null;
  const suggestedDays = suggestDays(placeList, city);
  const overlayCardClassName =
    "rounded-4xl border border-white/70 bg-white/92 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.15)] backdrop-blur-md";

  function openDirections(place: Place) {
    window.open(getDirectionsUrl(place), "_blank", "noopener,noreferrer");
  }

  function handleCityChange(nextCity: CityTab) {
    setCity(nextCity);
    setDraft(defaultDraft(nextCity));
    setSelectedPlaceId(null);
  }

  async function toggleVisited(place: Place) {
    try {
      await toggleVisitedMutation({ id: place._id, visited: !place.visited });
    } catch {
      setMessage("Unable to update place");
    }
  }

  async function deletePlace(place: Place) {
    const confirmed = window.confirm(
      `Eliminare ${place.name} dai luoghi salvati?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingPlaceId(place._id);
    setMessage(null);

    try {
      await deletePlaceMutation({ id: place._id });

      if (selectedPlaceId === place._id) {
        setSelectedPlaceId(null);
      }
    } catch {
      setMessage("Impossibile eliminare il luogo");
    } finally {
      setDeletingPlaceId(null);
    }
  }

  async function createPlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (!draft.addressQuery.trim()) {
        setMessage("Inserisci indirizzo o nome luogo");
        return;
      }

      const geocodeResponse = await fetch("/api/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: draft.addressQuery,
          cityTab: draft.cityTab,
        }),
      });

      const geocodePayload = (await geocodeResponse.json()) as {
        error?: string;
        lat?: number;
        lng?: number;
      };

      if (!geocodeResponse.ok) {
        setMessage(geocodePayload.error ?? "Geocoding failed");
        return;
      }

      const created = await createPlaceMutation({
        name: draft.name,
        cityTab: draft.cityTab,
        notes: draft.notes,
        timeSlot: draft.timeSlot,
        addedBy: draft.addedBy,
        lat: geocodePayload.lat ?? Number.NaN,
        lng: geocodePayload.lng ?? Number.NaN,
      });

      if (!created) {
        setMessage("Salvataggio fallito");
        return;
      }

      setSelectedPlaceId(created._id);
      setScreen("mappa");
      setCity(created.cityTab);
      setDraft(defaultDraft(created.cityTab));
    } catch {
      setMessage("Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden text-base-content">
      <div className="absolute inset-0">
        <MapView
          city={city}
          places={placeList}
          selectedPlaceId={selectedPlaceId}
          onSelectPlaceAction={setSelectedPlaceId}
          currentPosition={currentPosition}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(247,254,231,0.55)_0%,rgba(255,255,255,0)_24%,rgba(255,255,255,0)_72%,rgba(255,247,237,0.35)_100%)]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-6 sm:pt-5">
        <div className="pointer-events-auto tabs tabs-boxed grid w-full max-w-3xl grid-cols-4 gap-2 rounded-[1.75rem] border border-white/70 bg-white/88 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur">
          {cityTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab whitespace-nowrap rounded-2xl border-0 px-1 text-[11px] font-semibold sm:text-sm ${city === tab ? "tab-active bg-sky-500 text-white" : "bg-transparent text-slate-500"}`}
              onClick={() => handleCityChange(tab)}
            >
              {cityMeta[tab].label}
            </button>
          ))}
        </div>
      </div>

      {message ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-30 flex justify-center px-3 sm:px-6">
          <div className="alert pointer-events-auto w-full max-w-xl border border-amber-200 bg-amber-50/95 text-sm text-amber-800 shadow-sm backdrop-blur">
            <span>{message}</span>
          </div>
        </div>
      ) : null}

      <section
        className={`absolute inset-x-0 top-24 bottom-24 z-10 overflow-hidden px-3 pb-3 sm:top-28 sm:bottom-28 sm:px-6 ${screen === "mappa" ? "pointer-events-none" : "pointer-events-auto"}`}
      >
        {screen === "mappa" ? (
          <div className="flex h-full items-end justify-center lg:justify-start">
            {selectedPlace ? (
              <article className={`${overlayCardClassName} pointer-events-auto mb-2 w-full max-w-md`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{selectedPlace.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedPlace.notes || "Nessuna nota"}
                    </p>
                  </div>
                  <span className="badge badge-outline badge-lg">
                    {timeSlotLabels[selectedPlace.timeSlot]}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="badge badge-accent badge-soft">
                    {selectedPlace.addedBy}
                  </span>
                  <span className="badge badge-neutral badge-soft">
                    {selectedPlace.visited ? "Visitato" : "Da visitare"}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-block mt-4 rounded-2xl"
                  onClick={() => openDirections(selectedPlace)}
                >
                  Apri indicazioni
                </button>
                <button
                  type="button"
                  className="btn btn-error btn-soft btn-block mt-2 rounded-2xl"
                  onClick={() => deletePlace(selectedPlace)}
                  disabled={deletingPlaceId === selectedPlace._id}
                >
                  <Trash2 className="size-4" strokeWidth={2.2} />
                  {deletingPlaceId === selectedPlace._id
                    ? "Eliminazione..."
                    : "Elimina luogo"}
                </button>
              </article>
            ) : (
              <div className="pointer-events-none mb-2 w-full max-w-sm rounded-4xl border border-dashed border-white/70 bg-white/76 p-5 text-center text-sm text-slate-500 shadow-sm backdrop-blur-md">
                Tocca un pin per vedere dettagli.
              </div>
            )}
          </div>
        ) : null}

        {screen === "luoghi" ? (
          <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto pb-2">
            <div className="space-y-3">
            {loading ? (
              <div className={`${overlayCardClassName} text-center text-sm text-slate-500`}>
                Caricamento luoghi...
              </div>
            ) : null}
            {!loading && placeList.length === 0 ? (
              <div className="rounded-4xl border border-dashed border-white/70 bg-white/92 p-6 text-center text-sm text-slate-500 shadow-sm backdrop-blur-md">
                Nessun posto salvato per {cityMeta[city].label}.
              </div>
            ) : null}
            {placeList.map((place) => (
              <article
                key={place._id}
                className={overlayCardClassName}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => {
                      setSelectedPlaceId(place._id);
                      setScreen("mappa");
                    }}
                  >
                    <h2 className="text-lg font-bold text-slate-900">{place.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {place.notes || "Nessuna nota"}
                    </p>
                  </button>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary mt-1"
                    checked={place.visited}
                    onChange={() => toggleVisited(place)}
                    aria-label={`Segna ${place.name} come visitato`}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="badge badge-secondary badge-soft">
                    {timeSlotLabels[place.timeSlot]}
                  </span>
                  <span className="badge badge-accent badge-soft">{place.addedBy}</span>
                  <span className="badge badge-ghost">
                    {place.visited ? "Visitato" : "Da visitare"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm rounded-xl"
                    onClick={() => openDirections(place)}
                  >
                    Indicazioni
                  </button>
                  <button
                    type="button"
                    className="btn btn-error btn-soft btn-sm rounded-xl"
                    onClick={() => deletePlace(place)}
                    disabled={deletingPlaceId === place._id}
                  >
                    <Trash2 className="size-4" strokeWidth={2.2} />
                    {deletingPlaceId === place._id ? "Eliminazione..." : "Elimina"}
                  </button>
                </div>
              </article>
            ))}
            </div>
          </div>
        ) : null}

        {screen === "nuovo" ? (
          <form
            className={`${overlayCardClassName} mx-auto h-full w-full max-w-2xl space-y-4 overflow-y-auto`}
            onSubmit={createPlace}
          >
            <div>
              <label className="label px-1">
                <span className="label-text font-semibold">Nome del luogo</span>
              </label>
              <input
                className="input input-bordered w-full rounded-2xl"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label px-1">
                  <span className="label-text font-semibold">Città</span>
                </label>
                <select
                  className="select select-bordered w-full rounded-2xl"
                  value={draft.cityTab}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      cityTab: event.target.value as CityTab,
                    }))
                  }
                >
                  {cityTabs.map((tab) => (
                    <option key={tab} value={tab}>
                      {cityMeta[tab].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label px-1">
                  <span className="label-text font-semibold">Chi lo ha inserito</span>
                </label>
                <select
                  className="select select-bordered w-full rounded-2xl"
                  value={draft.addedBy}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      addedBy: event.target.value as AddedBy,
                    }))
                  }
                >
                  {addedByOptions.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label px-1">
                <span className="label-text font-semibold">Orario preferibile</span>
              </label>
              <select
                className="select select-bordered w-full rounded-2xl"
                value={draft.timeSlot}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    timeSlot: event.target.value as TimeSlot,
                  }))
                }
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {timeSlotLabels[slot]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label px-1">
                <span className="label-text font-semibold">Ricerca luogo / indirizzo</span>
              </label>
              <div className="flex gap-2">
                <input
                  className="input input-bordered flex-1 rounded-2xl"
                  placeholder="es. Fushimi Inari Shrine Kyoto"
                  value={draft.addressQuery}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      addressQuery: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <p className="mt-2 px-1 text-sm text-slate-500">
                Le coordinate vengono risolte automaticamente al salvataggio.
              </p>
            </div>

            <div>
              <label className="label px-1">
                <span className="label-text font-semibold">Descrizione / note</span>
              </label>
              <textarea
                className="textarea textarea-bordered min-h-32 w-full rounded-3xl"
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block rounded-2xl"
              disabled={saving}
            >
              {saving ? "Salvataggio..." : "Salva"}
            </button>
          </form>
        ) : null}

        {screen === "itinerario" ? (
          <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto pb-2">
            <div className="space-y-3">
            <div className={overlayCardClassName}>
              <h2 className="text-lg font-bold">Suggerisci giornata</h2>
              <p className="mt-1 text-sm text-slate-600">
                Gruppi basati su vicinanza e fascia oraria per {cityMeta[city].label}.
              </p>
            </div>
            {suggestedDays.length === 0 ? (
              <div className="rounded-4xl border border-dashed border-white/70 bg-white/92 p-6 text-center text-sm text-slate-500 shadow-sm backdrop-blur-md">
                Nessun gruppo da proporre. Aggiungi posti non visitati.
              </div>
            ) : null}
            {suggestedDays.map((day, index) => (
              <article
                key={day.id}
                className={overlayCardClassName}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">
                      Giorno {index + 1}
                    </p>
                    <h3 className="text-lg font-bold">{day.areaLabel}</h3>
                  </div>
                  <span className="badge badge-secondary badge-soft">
                    {day.timeLabel}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {day.places.map((place) => (
                    <button
                      key={place._id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl bg-base-100 px-4 py-3 text-left"
                      onClick={() => {
                        setSelectedPlaceId(place._id);
                        setScreen("mappa");
                      }}
                    >
                      <span>
                        <strong className="block">{place.name}</strong>
                        <span className="text-sm text-slate-500">
                          {timeSlotLabels[place.timeSlot]}
                        </span>
                      </span>
                      <span className="badge badge-accent badge-soft">
                        {place.addedBy}
                      </span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
            </div>
          </div>
        ) : null}
      </section>

      <nav className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:px-6 sm:pb-5">
        <div className="flex w-full max-w-3xl gap-2 rounded-4xl border border-white/70 bg-white/88 p-2 shadow-[0_-10px_40px_rgba(15,23,42,0.12)] backdrop-blur">
        {screenOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`btn h-auto min-h-0 flex-1 rounded-2xl px-2 py-3 ${screen === option.id ? "btn-primary" : "btn-ghost border-0 bg-transparent text-slate-600"}`}
            onClick={() => setScreen(option.id)}
          >
            <span className="flex flex-col items-center gap-1 text-[11px] font-semibold sm:text-xs">
              <option.icon className="size-5" strokeWidth={2.2} />
              <span>{option.label}</span>
            </span>
          </button>
        ))}
        </div>
      </nav>
    </main>
  );
}
