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

type PlaceFormProps = {
  draft: DraftPlace;
  onDraftChangeAction: React.Dispatch<React.SetStateAction<DraftPlace>>;
  onSubmitAction: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  saving: boolean;
  submitLabel: string;
  className?: string;
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

function PlaceForm({
  draft,
  onDraftChangeAction,
  onSubmitAction,
  saving,
  submitLabel,
  className,
}: PlaceFormProps) {
  return (
    <form className={className} onSubmit={onSubmitAction}>
      <div>
        <label className="label px-1">
          <span className="label-text font-semibold">Nome del luogo</span>
        </label>
        <input
          className="input input-bordered w-full rounded-2xl"
          value={draft.name}
          onChange={(event) =>
            onDraftChangeAction((current) => ({
              ...current,
              name: event.target.value,
            }))
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
              onDraftChangeAction((current) => ({
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
              onDraftChangeAction((current) => ({
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
            onDraftChangeAction((current) => ({
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
              onDraftChangeAction((current) => ({
                ...current,
                addressQuery: event.target.value,
              }))
            }
            required
          />
        </div>
        <p className="mt-2 px-1 text-sm text-base-content/60">
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
            onDraftChangeAction((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-block rounded-2xl"
        disabled={saving}
      >
        {saving ? "Salvataggio..." : submitLabel}
      </button>
    </form>
  );
}

export function TravelApp() {
  const [screen, setScreen] = useState<Screen>("mappa");
  const [city, setCity] = useState<CityTab>("tokyo");
  const [selectedPlaceId, setSelectedPlaceId] = useState<PlaceId | null>(null);
  const [draft, setDraft] = useState<DraftPlace>(defaultDraft("tokyo"));
  const [editDraft, setEditDraft] = useState<DraftPlace>(defaultDraft("tokyo"));
  const [editingPlaceId, setEditingPlaceId] = useState<PlaceId | null>(null);
  const [currentPosition, setCurrentPosition] =
    useState<GeolocationCoordinates | null>(null);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingPlaceId, setDeletingPlaceId] = useState<PlaceId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const places = useQuery(api.places.listByCity, { cityTab: city }) as
    | Place[]
    | undefined;
  const createPlaceMutation = useMutation(api.places.create);
  const updatePlaceMutation = useMutation(api.places.update);
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
  const editingPlace =
    placeList.find((place) => place._id === editingPlaceId) ?? null;
  const suggestedDays = suggestDays(placeList, city);
  const overlayCardClassName =
    "rounded-4xl border border-base-300/70 bg-base-100/90 p-4 text-base-content shadow-[0_20px_50px_color-mix(in_oklab,var(--color-neutral)_18%,transparent)] backdrop-blur-md";
  const panelClassName =
    "border border-base-300/70 bg-base-100/88 shadow-[0_16px_40px_color-mix(in_oklab,var(--color-neutral)_16%,transparent)] backdrop-blur";

  function openDirections(place: Place) {
    window.open(getDirectionsUrl(place), "_blank", "noopener,noreferrer");
  }

  function handleCityChange(nextCity: CityTab) {
    setCity(nextCity);
    setDraft(defaultDraft(nextCity));
    setSelectedPlaceId(null);
  }

  function openEditModal(place: Place) {
    setEditingPlaceId(place._id);
    setEditDraft({
      name: place.name,
      cityTab: place.cityTab,
      notes: place.notes,
      timeSlot: place.timeSlot,
      addedBy: place.addedBy,
      addressQuery: place.name,
    });
    setMessage(null);
  }

  function closeEditModal() {
    if (updating) {
      return;
    }

    setEditingPlaceId(null);
  }

  async function geocodeDraft(nextDraft: DraftPlace) {
    if (!nextDraft.addressQuery.trim()) {
      setMessage("Inserisci indirizzo o nome luogo");
      return null;
    }

    const geocodeResponse = await fetch("/api/geocode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: nextDraft.addressQuery,
        cityTab: nextDraft.cityTab,
      }),
    });

    const geocodePayload = (await geocodeResponse.json()) as {
      error?: string;
      lat?: number;
      lng?: number;
    };

    if (!geocodeResponse.ok) {
      setMessage(geocodePayload.error ?? "Geocoding failed");
      return null;
    }

    return {
      lat: geocodePayload.lat ?? Number.NaN,
      lng: geocodePayload.lng ?? Number.NaN,
    };
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
      const coordinates = await geocodeDraft(draft);

      if (!coordinates) {
        return;
      }

      const created = await createPlaceMutation({
        name: draft.name,
        cityTab: draft.cityTab,
        notes: draft.notes,
        timeSlot: draft.timeSlot,
        addedBy: draft.addedBy,
        lat: coordinates.lat,
        lng: coordinates.lng,
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

  async function updatePlace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingPlaceId) {
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      const coordinates = await geocodeDraft(editDraft);

      if (!coordinates) {
        return;
      }

      const updated = await updatePlaceMutation({
        id: editingPlaceId,
        name: editDraft.name,
        cityTab: editDraft.cityTab,
        notes: editDraft.notes,
        timeSlot: editDraft.timeSlot,
        addedBy: editDraft.addedBy,
        lat: coordinates.lat,
        lng: coordinates.lng,
      });

      if (!updated) {
        setMessage("Aggiornamento fallito");
        return;
      }

      setSelectedPlaceId(updated._id);
      setCity(updated.cityTab);
      closeEditModal();
    } catch {
      setMessage("Aggiornamento fallito");
    } finally {
      setUpdating(false);
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
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-primary)_20%,transparent)_0%,transparent_24%,transparent_72%,color-mix(in_oklab,var(--color-secondary)_18%,transparent)_100%)]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-6 sm:pt-5">
        <div className={`pointer-events-auto tabs tabs-boxed grid w-full max-w-3xl grid-cols-4 gap-2 rounded-[1.75rem] p-2 ${panelClassName}`}>
          {cityTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab whitespace-nowrap rounded-2xl border-0 px-1 text-[11px] font-semibold transition-colors sm:text-sm ${city === tab ? "tab-active bg-primary! text-primary-content!" : "bg-transparent text-base-content/60 hover:bg-base-200/80 hover:text-base-content"}`}
              onClick={() => handleCityChange(tab)}
            >
              {cityMeta[tab].label}
            </button>
          ))}
        </div>
      </div>

      {message ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-30 flex justify-center px-3 sm:px-6">
          <div className="alert alert-warning pointer-events-auto w-full max-w-xl border border-warning/40 bg-warning/20 text-sm text-warning-content shadow-sm backdrop-blur">
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
                    <p className="mt-1 text-sm text-base-content/70">
                      {selectedPlace.notes || "Nessuna nota"}
                    </p>
                  </div>
                  <span className="badge badge-secondary badge-soft badge-lg border-0">
                    {timeSlotLabels[selectedPlace.timeSlot]}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="badge badge-accent badge-soft border-0">
                    {selectedPlace.addedBy}
                  </span>
                  <span
                    className={`badge badge-soft border-0 ${selectedPlace.visited ? "badge-success" : "badge-warning"}`}
                  >
                    {selectedPlace.visited ? "Visitato" : "Da visitare"}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-block mt-4 rounded-2xl border-0"
                  onClick={() => openDirections(selectedPlace)}
                >
                  Apri indicazioni
                </button>
                <button
                  type="button"
                  className="btn btn-error btn-block mt-2 rounded-2xl border-0"
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
              <div className="pointer-events-none mb-2 w-full max-w-sm rounded-4xl border border-dashed border-base-300/70 bg-base-100/76 p-5 text-center text-sm text-base-content/60 shadow-sm backdrop-blur-md">
                Tocca un pin per vedere dettagli.
              </div>
            )}
          </div>
        ) : null}

        {screen === "luoghi" ? (
          <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto pb-2">
            <div className="space-y-3">
            {loading ? (
              <div className={`${overlayCardClassName} text-center text-sm text-base-content/60`}>
                Caricamento luoghi...
              </div>
            ) : null}
            {!loading && placeList.length === 0 ? (
              <div className="rounded-4xl border border-dashed border-base-300/70 bg-base-100/92 p-6 text-center text-sm text-base-content/60 shadow-sm backdrop-blur-md">
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
                    <h2 className="text-lg font-bold text-base-content">{place.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-base-content/70">
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
                  <span className="badge badge-secondary badge-soft border-0">
                    {timeSlotLabels[place.timeSlot]}
                  </span>
                  <span className="badge badge-accent badge-soft border-0">{place.addedBy}</span>
                  <span
                    className={`badge badge-soft border-0 ${place.visited ? "badge-success" : "badge-warning"}`}
                  >
                    {place.visited ? "Visitato" : "Da visitare"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-soft btn-sm rounded-xl border-0"
                    onClick={() => openEditModal(place)}
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-soft btn-sm rounded-xl border-0"
                    onClick={() => openDirections(place)}
                  >
                    Indicazioni
                  </button>
                  <button
                    type="button"
                    className="btn btn-error btn-sm rounded-xl border-0"
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
          <PlaceForm
            className={`${overlayCardClassName} mx-auto h-full w-full max-w-2xl space-y-4 overflow-y-auto`}
            draft={draft}
            onDraftChangeAction={setDraft}
            onSubmitAction={createPlace}
            saving={saving}
            submitLabel="Salva"
          />
        ) : null}

        {screen === "itinerario" ? (
          <div className="mx-auto h-full w-full max-w-2xl overflow-y-auto pb-2">
            <div className="space-y-3">
            <div className={overlayCardClassName}>
              <h2 className="text-lg font-bold">Suggerisci giornata</h2>
              <p className="mt-1 text-sm text-base-content/70">
                Gruppi basati su vicinanza e fascia oraria per {cityMeta[city].label}.
              </p>
            </div>
            {suggestedDays.length === 0 ? (
              <div className="rounded-4xl border border-dashed border-base-300/70 bg-base-100/92 p-6 text-center text-sm text-base-content/60 shadow-sm backdrop-blur-md">
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
                    <p className="text-primary text-xs font-semibold uppercase tracking-[0.25em]">
                      Giorno {index + 1}
                    </p>
                    <h3 className="text-lg font-bold">{day.areaLabel}</h3>
                  </div>
                  <span className="badge badge-secondary badge-soft border-0">
                    {day.timeLabel}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {day.places.map((place) => (
                    <button
                      key={place._id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-base-300/50 bg-base-200/70 px-4 py-3 text-left transition-colors hover:bg-base-200"
                      onClick={() => {
                        setSelectedPlaceId(place._id);
                        setScreen("mappa");
                      }}
                    >
                      <span>
                        <strong className="block">{place.name}</strong>
                        <span className="text-sm text-base-content/60">
                          {timeSlotLabels[place.timeSlot]}
                        </span>
                      </span>
                      <span className="badge badge-accent badge-soft border-0">
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

      {editingPlaceId && editingPlace ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-neutral/45 px-3 py-6 backdrop-blur-sm sm:px-6">
          <div className={`${overlayCardClassName} w-full max-w-2xl space-y-4`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Modifica luogo</h2>
                <p className="mt-1 text-sm text-base-content/65">
                  Aggiorna i dettagli di {editingPlace.name}.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm rounded-xl"
                onClick={closeEditModal}
                disabled={updating}
              >
                Chiudi
              </button>
            </div>

            <PlaceForm
              className="space-y-4"
              draft={editDraft}
              onDraftChangeAction={setEditDraft}
              onSubmitAction={updatePlace}
              saving={updating}
              submitLabel="Salva modifiche"
            />
          </div>
        </div>
      ) : null}

      <nav className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:px-6 sm:pb-5">
        <div className={`flex w-full max-w-3xl gap-2 rounded-4xl p-2 shadow-[0_-10px_40px_color-mix(in_oklab,var(--color-neutral)_14%,transparent)] ${panelClassName}`}>
        {screenOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`btn h-auto min-h-0 flex-1 rounded-2xl px-2 py-3 border-0 ${screen === option.id ? "btn-primary text-primary-content" : "btn-ghost bg-transparent text-base-content/65 hover:bg-base-200/80 hover:text-base-content"}`}
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
