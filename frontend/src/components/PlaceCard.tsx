import React, { useEffect, useRef } from 'react';
import { Place } from '../types';
import { MapPin, Clock, Phone, Globe, BookOpen, ExternalLink } from 'lucide-react';
import { safeHttpUrl } from '../safe-url';

interface PlaceCardProps {
  place: Place;
  isSelected: boolean;
  onSelect: (place: Place) => void;
  disabled?: boolean;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, isSelected, onSelect, disabled = false }) => {
  const website = safeHttpUrl(place.website);
  const wikiUrl = safeHttpUrl(place.wiki_url);
  const osmUrl = safeHttpUrl(place.osm_url);
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (isSelected) cardRef.current?.scrollIntoView({
      block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [isSelected]);
  return (
    <article
      ref={cardRef}
      onClick={(event) => {
        if (!disabled && !(event.target instanceof Element && event.target.closest('a, button'))) onSelect(place);
      }}
      className={`p-4 rounded-xl transition-all duration-200 cursor-pointer border ${
        isSelected
          ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shrink-0 ${
              isSelected ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            {place.rank}
          </span>
          <h2 className="font-semibold text-slate-900 text-sm leading-snug">
            <button type="button" onClick={() => onSelect(place)} disabled={disabled}
              aria-pressed={isSelected} aria-label={`Show ${place.name} on map`}
              className="text-left hover:underline disabled:opacity-50">
              {place.name}
            </button>
          </h2>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
          {place.category}
        </span>
      </div>

      {/* Distance Badge */}
      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200/60">
        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>{place.distance_label}</span>
      </div>

      {/* Street Address */}
      <div className="mt-2 text-xs text-slate-600 flex items-start gap-1.5">
        <span className="font-medium text-slate-700 shrink-0">Address:</span>
        <span className="leading-relaxed">{place.address}</span>
      </div>

      {/* Opening Hours */}
      <div className="mt-1.5 text-xs text-slate-600 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className={place.opening_hours.includes('not listed') ? 'italic text-slate-400' : 'text-slate-700 font-medium'}>
          {place.opening_hours}
        </span>
      </div>

      {/* Optional Contact Details */}
      {(place.phone || website) && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
          {place.phone && (
            <a
              href={`tel:${place.phone.replace(/[^+0-9,;*#]/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 transition-colors"
            >
              <Phone className="w-3 h-3" />
              <span>{place.phone}</span>
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
            >
              <Globe className="w-3 h-3" />
              <span>Official Website</span>
            </a>
          )}
        </div>
      )}

      {/* Wikipedia Summary Badge when present */}
      {place.wiki_summary && (
        <div className="mt-3 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            <span>Wikipedia Summary</span>
          </div>
          <p className="text-amber-950 leading-relaxed">{place.wiki_summary}</p>
          {wikiUrl && (
            <a
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 hover:text-amber-950 hover:underline"
            >
              <span>Read article</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* OSM Source Link */}
      {osmUrl && <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] text-slate-600 hover:text-slate-800 flex items-center gap-1 hover:underline"
        >
          <span>OpenStreetMap ID: {place.id}</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>}
    </article>
  );
};
