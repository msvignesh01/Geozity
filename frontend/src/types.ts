export interface Place {
  id: string;
  rank: number;
  name: string;
  category: string;
  lat: number;
  lon: number;
  distance_km: number;
  distance_label: string;
  address: string;
  opening_hours: string;
  phone: string | null;
  website: string | null;
  wiki_summary?: string | null;
  wiki_url?: string | null;
  osm_url: string;
}

export interface ResolvedLocation {
  label: string;
  lat: number;
  lon: number;
  source: string;
}

export interface ContextState {
  location_name: string;
  lat: number;
  lon: number;
  category: string;
}

export interface UserLocation {
  lat: number;
  lon: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  safety_notice?: string | null;
  places?: Place[];
  resolved_location?: ResolvedLocation;
  suggested_categories?: string[];
  status?: 'ready' | 'needs_location' | 'no_results' | 'unsupported_category' | 'location_not_found' | 'error';
}

export interface ChatApiResponse {
  status: 'ready' | 'needs_location' | 'no_results' | 'unsupported_category' | 'location_not_found' | 'error';
  reply: string;
  category?: string;
  safety_notice?: string | null;
  resolved_location?: ResolvedLocation;
  context?: ContextState;
  places?: Place[];
  suggested_categories?: string[];
  attribution: string;
}
