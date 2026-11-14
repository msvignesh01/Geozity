import type { ChatApiResponse, ContextState, Place, ResolvedLocation } from './types';

export const CATEGORY_LABELS = {
  hospital: 'hospitals', park: 'parks', cafe: 'cafes', restaurant: 'restaurants',
  pharmacy: 'pharmacies', museum: 'museums', attraction: 'attractions',
  library: 'libraries', supermarket: 'supermarkets',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPoint(value: Record<string, unknown>): boolean {
  return typeof value.lat === 'number' && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90
    && typeof value.lon === 'number' && Number.isFinite(value.lon) && Math.abs(value.lon) <= 180;
}

function isPlace(value: unknown): value is Place {
  if (!isRecord(value) || !isPoint(value)) return false;
  const strings = ['id', 'name', 'category', 'distance_label', 'address', 'opening_hours', 'osm_url'];
  return strings.every((key) => typeof value[key] === 'string')
    && typeof value.rank === 'number' && Number.isInteger(value.rank) && value.rank > 0
    && typeof value.distance_km === 'number' && Number.isFinite(value.distance_km) && value.distance_km >= 0
    && ['phone', 'website'].every((key) => value[key] === null || typeof value[key] === 'string')
    && ['wiki_summary', 'wiki_url'].every((key) =>
      value[key] === undefined || value[key] === null || typeof value[key] === 'string');
}

function isResolved(value: unknown): value is ResolvedLocation {
  return isRecord(value) && isPoint(value) && typeof value.label === 'string' && typeof value.source === 'string';
}

function isContext(value: unknown): value is ContextState {
  return isRecord(value) && isPoint(value) && typeof value.location_name === 'string'
    && typeof value.category === 'string' && Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, value.category);
}

export function parseChatResponse(value: unknown): ChatApiResponse {
  const statuses = ['ready', 'needs_location', 'no_results', 'unsupported_category', 'location_not_found', 'error'];
  if (!isRecord(value) || typeof value.status !== 'string' || !statuses.includes(value.status)
      || typeof value.reply !== 'string' || !value.reply.trim() || typeof value.attribution !== 'string'
      || (value.safety_notice != null && typeof value.safety_notice !== 'string')
      || (value.category !== undefined && (typeof value.category !== 'string' || !Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, value.category)))
      || (value.places !== undefined && (!Array.isArray(value.places) || value.places.length > 10 || !value.places.every(isPlace)))
      || (value.context !== undefined && !isContext(value.context))
      || (value.resolved_location !== undefined && !isResolved(value.resolved_location))
      || (value.suggested_categories !== undefined && (!Array.isArray(value.suggested_categories) || value.suggested_categories.length > 9
        || !value.suggested_categories.every((category) => typeof category === 'string' && Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, category))))) {
    throw new Error('The search service returned an unreadable response. Please try again.');
  }
  if ((value.status === 'ready' && (!Array.isArray(value.places) || value.places.length === 0))
      || (value.status === 'no_results' && (!Array.isArray(value.places) || value.places.length !== 0))
      || (value.status !== 'ready' && Array.isArray(value.places) && value.places.length > 0)
      || (Array.isArray(value.places) && (new Set(value.places.map((place) => place.id)).size !== value.places.length
        || !value.places.every((place, index) => place.rank === index + 1)))
      || (['ready', 'no_results'].includes(value.status) && (!isResolved(value.resolved_location) || !isContext(value.context)))) {
    throw new Error('The search service returned incomplete results. Please try again.');
  }
  // All externally supplied fields are checked above; construct the typed result
  // without treating arbitrary JSON as a trusted application object.
  const result: ChatApiResponse = { status: 'error', reply: value.reply, attribution: value.attribution };
  switch (value.status) {
    case 'ready': case 'needs_location': case 'no_results': case 'unsupported_category': case 'location_not_found': case 'error':
      result.status = value.status;
  }
  if (typeof value.safety_notice === 'string') result.safety_notice = value.safety_notice;
  if (typeof value.category === 'string') result.category = value.category;
  if (Array.isArray(value.places) && value.places.every(isPlace)) result.places = value.places;
  if (isResolved(value.resolved_location)) result.resolved_location = value.resolved_location;
  if (isContext(value.context)) result.context = value.context;
  if (Array.isArray(value.suggested_categories)) {
    result.suggested_categories = value.suggested_categories.filter((item): item is string => typeof item === 'string');
  }
  return result;
}

export async function requestChat(
  payload: { message: string; user_location: { lat: number; lon: number } | null; last_context: ContextState | null; pending_category: string | null },
  signal: AbortSignal,
): Promise<ChatApiResponse> {
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal,
    });
  } catch (error: unknown) {
    if (signal.aborted) throw error;
    throw new Error('The search service could not be reached. Check your connection and try again.');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('The search service returned an unreadable response. Please try again.');
  }
  const result = parseChatResponse(body);
  if (!response.ok && result.status !== 'error') {
    throw new Error('The search could not be completed. Please try again.');
  }
  return result;
}
