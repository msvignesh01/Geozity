import { useEffect, useRef, useState } from "react";
import type { Location, Place } from "../domain/contracts";
import type { Map as LibreMap, Marker } from "maplibre-gl";

export function Globe({
  places,
  location,
  selectedId,
  onSelect,
  medical,
  styleUrl,
}: {
  places: Place[];
  location: Location | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  medical: boolean;
  styleUrl: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const select = useRef(onSelect);
  select.current = onSelect;
  const rotating = useRef(true);
  const selected = useRef(selectedId);
  selected.current = selectedId;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    setFailed(false);
    setReady(false);
    setTileError(false);
    const preventRotation = () => {
      rotating.current = false;
    };
    const initialize = async () => {
      try {
        const libre = await import("maplibre-gl");
        const { default: workerUrl } =
          await import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url");
        libre.setWorkerUrl(workerUrl);
        if (disposed || !container.current) return;
        const instance = new libre.Map({
          container: container.current,
          style: styleUrl,
          center: [60, 18],
          zoom: container.current.clientHeight < 400 ? 0.4 : 1.5,
          attributionControl: false,
          canvasContextAttributes: { antialias: true },
        });
        map.current = instance;
        instance.addControl(
          new libre.NavigationControl({ showCompass: false }),
          "bottom-right",
        );
        instance.addControl(
          new libre.AttributionControl({ compact: true }),
          "bottom-left",
        );
        instance.on("style.load", () => {
          if (!disposed) {
            instance.setProjection({ type: "globe" });
            setReady(true);
          }
        });
        instance.on("error", () => {
          if (!disposed) setTileError(true);
        });
        instance.on("mousedown", preventRotation);
        instance.on("touchstart", preventRotation);
        instance.on("wheel", preventRotation);
        instance.getCanvas().addEventListener("webglcontextlost", () => {
          if (!disposed) setFailed(true);
        });
        observer = new ResizeObserver(() => instance.resize());
        observer.observe(container.current);
        let last = performance.now();
        const animate = (now: number) => {
          const seconds = Math.min((now - last) / 1000, 0.05);
          last = now;
          if (
            rotating.current &&
            !motion.matches &&
            !document.hidden &&
            !instance.isMoving() &&
            instance.getZoom() < 3
          )
            instance.setCenter([
              instance.getCenter().lng + seconds * 1.8,
              instance.getCenter().lat,
            ]);
          frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
      } catch {
        if (!disposed) setFailed(true);
      }
    };
    void initialize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [styleUrl, retry]);

  useEffect(() => {
    if (medical || location) rotating.current = false;
  }, [medical, location]);
  useEffect(() => {
    if (!ready || !map.current) return;
    const instance = map.current;
    let disposed = false;
    void import("maplibre-gl").then((libre) => {
      if (disposed) return;
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      for (const place of places) {
        const button = document.createElement("button");
        button.className = "globe-pin";
        button.textContent = String(place.rank);
        button.type = "button";
        button.setAttribute("aria-label", `Select ${place.name}`);
        button.dataset.placeId = place.id;
        button.classList.toggle("selected", selected.current === place.id);
        button.setAttribute(
          "aria-pressed",
          String(selected.current === place.id),
        );
        button.addEventListener("click", () => select.current(place.id));
        markers.current.push(
          new libre.Marker({ element: button })
            .setLngLat([place.lon, place.lat])
            .addTo(instance),
        );
      }
      if (!location) return;
      const reduced =
        medical || matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (places.length) {
        // Unwrap longitudes around the reference so antimeridian searches stay local.
        const lng = (lon: number) =>
          location.lon + (((lon - location.lon + 540) % 360) - 180);
        const bounds = new libre.LngLatBounds(
          [location.lon, location.lat],
          [location.lon, location.lat],
        );
        places.forEach((place) => bounds.extend([lng(place.lon), place.lat]));
        instance.fitBounds(bounds, {
          padding: { top: 80, bottom: 90, left: 60, right: 60 },
          maxZoom: 15,
          duration: reduced ? 0 : 1800,
        });
      } else
        instance.flyTo({
          center: [location.lon, location.lat],
          zoom: 12,
          duration: reduced ? 0 : 1500,
        });
    });
    return () => {
      disposed = true;
    };
  }, [places, location, ready, medical]);
  useEffect(() => {
    for (const marker of markers.current) {
      const button = marker.getElement();
      const active = button.dataset.placeId === selectedId;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    }
  }, [selectedId, places, ready]);

  return (
    <section className="world" aria-label="Interactive globe and place markers">
      <div ref={container} className="map-canvas" />
      {!location && (
        <div className="world-caption">
          <span>FOLLOW YOUR CURIOSITY</span>
          <p>
            A whole world.
            <br />
            Your next little adventure.
          </p>
        </div>
      )}
      {location && (
        <div className="area-label">
          <span>EXPLORING</span>
          <strong>{location.label}</strong>
        </div>
      )}
      {(failed || tileError) && (
        <div className="map-notice" role="status">
          {failed
            ? "The globe could not start on this device."
            : "Some map detail could not load."}{" "}
          Search and the place list still work.{" "}
          <button
            onClick={() => {
              setRetry((r) => r + 1);
            }}
          >
            Reload map
          </button>
        </div>
      )}
      <div className="map-credit">
        <a href="https://openfreemap.org/">OpenFreeMap</a> ·{" "}
        <a href="https://openmaptiles.org/">OpenMapTiles</a> ·{" "}
        <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a> ·{" "}
        <a href="https://www.geoapify.com/">Powered by Geoapify</a>
      </div>
    </section>
  );
}
