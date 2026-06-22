"use client";

import { useEffect, useRef, useState } from "react";
import {
  googleMapsMapId,
  hasGoogleMapsKey,
  loadMapsLibrary,
  loadMarkerLibrary,
} from "@/lib/google-maps";
import { cityMeta, timeSlotColors } from "@/lib/map";
import type { CityTab, Place, PlaceId } from "@/lib/place-types";

type MapViewProps = {
  city: CityTab;
  places: Place[];
  selectedPlaceId: PlaceId | null;
  onSelectPlaceAction: (placeId: PlaceId) => void;
  currentPosition: GeolocationCoordinates | null;
};

function buildMarkerContent(color: string, size: number) {
  const marker = document.createElement("div");
  marker.style.width = `${size}px`;
  marker.style.height = `${size}px`;
  marker.style.borderRadius = "9999px";
  marker.style.backgroundColor = color;
  marker.style.border = "2px solid #ffffff";
  marker.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.35)";

  return marker;
}

export function MapView({
  city,
  places,
  selectedPlaceId,
  onSelectPlaceAction,
  currentPosition,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const currentMarkerRef =
    useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasGoogleMapsKey || !containerRef.current) {
      return;
    }
    let active = true;

    async function setupMap() {
      const [{ Map }] = await Promise.all([
        loadMapsLibrary(),
        loadMarkerLibrary(),
      ]);

      if (!active || !containerRef.current) {
        return;
      }

      mapRef.current = new Map(containerRef.current, {
        center: cityMeta[city].center,
        zoom: cityMeta[city].zoom,
        disableDefaultUI: true,
        draggable: true,
        gestureHandling: "greedy",
        mapId: googleMapsMapId,
        scrollwheel: true,
        zoomControl: true,
      });

      setReady(true);
    }

    setupMap();

    return () => {
      active = false;
    };
  }, [city]);

  useEffect(() => {
    if (!mapRef.current || !ready) {
      return;
    }

    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = places.map((place) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        anchorLeft: "-50%",
        anchorTop: "-50%",
        content: buildMarkerContent(
          timeSlotColors[place.timeSlot],
          selectedPlaceId === place._id ? 20 : 16,
        ),
        gmpClickable: true,
        map: mapRef.current,
        position: { lat: place.lat, lng: place.lng },
        title: place.name,
      });

      marker.addEventListener("gmp-click", () => {
        onSelectPlaceAction(place._id);
      });

      return marker;
    });
  }, [onSelectPlaceAction, places, ready, selectedPlaceId]);

  useEffect(() => {
    if (!mapRef.current || !ready) {
      return;
    }

    const selectedPlace = places.find((place) => place._id === selectedPlaceId);

    if (selectedPlace) {
      mapRef.current.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
      mapRef.current.setZoom(14);
      return;
    }

    mapRef.current.panTo(cityMeta[city].center);
    mapRef.current.setZoom(cityMeta[city].zoom);
  }, [city, places, ready, selectedPlaceId]);

  useEffect(() => {
    if (!mapRef.current || !ready || !currentPosition) {
      if (currentMarkerRef.current) {
        currentMarkerRef.current.map = null;
      }
      currentMarkerRef.current = null;
      return;
    }

    if (currentMarkerRef.current) {
      currentMarkerRef.current.map = null;
    }

    currentMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      anchorLeft: "-50%",
      anchorTop: "-50%",
      content: buildMarkerContent("#0f766e", 14),
      map: mapRef.current,
      position: {
        lat: currentPosition.latitude,
        lng: currentPosition.longitude,
      },
      title: "La tua posizione",
      zIndex: 999,
    });
  }, [currentPosition, ready]);

  if (!hasGoogleMapsKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-base-200/80 text-center text-sm text-base-content/70 backdrop-blur-sm">
        Missing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
    />
  );
}
