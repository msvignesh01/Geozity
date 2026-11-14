import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Place, ResolvedLocation } from '../types';
import { safeHttpUrl } from '../safe-url';

interface MapViewProps {
  places: Place[];
  resolvedLocation: ResolvedLocation | null;
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
}

function textElement(tag: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function addLink(container: HTMLElement, text: string, value: string | null | undefined) {
  const url = safeHttpUrl(value);
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = text;
  link.style.marginRight = '12px';
  container.append(link);
}

function placePopup(place: Place): HTMLElement {
  // Leaflet interprets strings as HTML. Use DOM text nodes for all remote data.
  const popup = document.createElement('div');
  popup.style.maxWidth = '260px';
  popup.append(textElement('strong', `${place.rank}. ${place.name}`));
  for (const text of [place.distance_label, `Address: ${place.address}`, `Hours: ${place.opening_hours}`]) {
    popup.append(textElement('p', text));
  }
  if (place.wiki_summary) popup.append(textElement('p', place.wiki_summary));
  addLink(popup, 'View on OSM', place.osm_url);
  addLink(popup, 'Wikipedia', place.wiki_url);
  return popup;
}

function pinIcon(rank: number, active: boolean): L.DivIcon {
  const badge = textElement('div', String(rank));
  badge.className = `custom-pin-badge${active ? ' active' : ''}`;
  return L.divIcon({ className: 'custom-pin-marker', html: badge, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] });
}

export const MapView: React.FC<MapViewProps> = ({ places, resolvedLocation, selectedPlace, onSelectPlace }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const centerRef = useRef<L.Marker | null>(null);
  const selectRef = useRef(onSelectPlace);
  const [tileError, setTileError] = useState(false);
  selectRef.current = onSelectPlace;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const map = L.map(container, {
      center: [12.9716, 77.5946], zoom: 13, zoomControl: true,
      zoomAnimation: !reduced, fadeAnimation: !reduced, markerZoomAnimation: !reduced,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).on('tileerror', () => setTileError(true)).addTo(map);
    const resize = new ResizeObserver(() => {
      map.invalidateSize({ animate: false, pan: false });
      for (const marker of Object.values(markersRef.current)) {
        const popup = marker.getPopup();
        if (popup && marker.isPopupOpen()) {
          popup.options.maxHeight = Math.max(100, Math.min(300, container.clientHeight - 100));
          popup.update();
        }
      }
    });
    resize.observe(container);
    mapRef.current = map;
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      centerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};
    centerRef.current?.remove();
    centerRef.current = null;
    const bounds = L.latLngBounds([]);
    if (resolvedLocation) {
      const center = document.createElement('div');
      center.className = 'custom-pin-center';
      center.title = resolvedLocation.label;
      const icon = L.divIcon({ className: 'custom-pin-marker', html: center, iconSize: [20, 20], iconAnchor: [10, 10] });
      const popup = document.createElement('div');
      popup.append(textElement('strong', 'Search Reference Point'), textElement('p', resolvedLocation.label));
      centerRef.current = L.marker([resolvedLocation.lat, resolvedLocation.lon], {
        icon, title: 'Search reference point', zIndexOffset: 100,
      }).addTo(map).bindPopup(popup);
      bounds.extend([resolvedLocation.lat, resolvedLocation.lon]);
    }
    for (const place of places) {
      const marker = L.marker([place.lat, place.lon], {
        icon: pinIcon(place.rank, false), title: `${place.rank}. ${place.name}`, alt: place.name,
      }).addTo(map).bindPopup(placePopup(place), {
        maxHeight: Math.max(100, Math.min(300, (containerRef.current?.clientHeight ?? 400) - 100)),
      });
      marker.on('click', () => selectRef.current(place));
      markersRef.current[place.id] = marker;
      bounds.extend([place.lat, place.lon]);
    }
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15, animate: false });
    }
  }, [places, resolvedLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const place of places) markersRef.current[place.id]?.setIcon(pinIcon(place.rank, selectedPlace?.id === place.id));
    if (!selectedPlace) {
      map.closePopup();
      return;
    }
    const marker = markersRef.current[selectedPlace.id];
    if (marker) {
      marker.openPopup();
      map.panTo([selectedPlace.lat, selectedPlace.lon], {
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, duration: 0.8,
      });
    }
  }, [selectedPlace, places, resolvedLocation]);

  return (
    <section aria-label="Places map" className="relative w-full h-full">
      <div ref={containerRef} aria-label="Interactive place results" className="w-full h-full z-0" />
      {tileError && <div role="status" className="absolute top-2 left-12 right-2 bg-amber-50 text-amber-950 p-2 text-xs z-10 rounded border border-amber-200">
        Some map tiles could not load. Place details and search results are still available.
      </div>}
      <div className="absolute top-2 right-2 bg-white/90 text-[10px] text-slate-600 px-2 py-1 rounded shadow-sm border border-slate-200 z-10 pointer-events-none">
        OpenStreetMap &bull; Nominatim &bull; Overpass &bull; Wikipedia
      </div>
    </section>
  );
};
