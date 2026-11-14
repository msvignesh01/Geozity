import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage, Place, ResolvedLocation, ContextState, UserLocation } from './types';
import { requestChat, waitForSearchService } from './api';
import { ChatPanel } from './components/ChatPanel';
import { MapView } from './components/MapView';

const timestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const INITIAL_MESSAGE: ChatMessage = {
  id: 'msg_init', sender: 'assistant',
  text: "Hello! Welcome to Geozity. Ask me questions like 'nearest hospital to MG Road, Bengaluru', 'parks near me', or 'museums in London'. I search community-maintained OpenStreetMap data and show numbered pins, straight-line distances, available addresses, and linked Wikipedia information. Your chosen search area is shared with map providers. Device location is optional.",
  timestamp: timestamp(),
};

export const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [currentContext, setCurrentContext] = useState<ContextState | null>(null);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const gpsPending = useRef(false);

  useEffect(() => () => { activeRequest.current?.abort(); }, []);

  const handleSendMessage = async (text: string) => {
    const message = text.trim();
    if (!message || activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    let preparing = true;
    let timeout = window.setTimeout(() => controller.abort('timeout'), 75000);
    setMessages((previous) => [...previous, {
      id: crypto.randomUUID(), sender: 'user', text: message, timestamp: timestamp(),
    }]);
    setIsLoading(true);
    setIsStarting(true);
    // A pending search must not leave the previous results looking current.
    setPlaces([]);
    setSelectedPlace(null);
    setResolvedLocation(null);
    try {
      await waitForSearchService(controller.signal);
      if (activeRequest.current !== controller) return;
      preparing = false;
      setIsStarting(false);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => controller.abort('timeout'), 90000);
      const data = await requestChat({
        message, user_location: userLocation, last_context: currentContext, pending_category: pendingCategory,
      }, controller.signal);
      if (activeRequest.current !== controller) return;
      const assistant: ChatMessage = {
        id: crypto.randomUUID(), sender: 'assistant', text: data.reply, timestamp: timestamp(),
        safety_notice: data.safety_notice, places: data.places, resolved_location: data.resolved_location,
        suggested_categories: data.suggested_categories, status: data.status,
      };
      setMessages((previous) => [...previous, assistant]);
      if (data.context) setCurrentContext(data.context);
      setPendingCategory(data.status === 'needs_location' ? data.category ?? null : null);
      setResolvedLocation(data.resolved_location ?? null);
      setPlaces(data.places ?? []);
      setSelectedPlace(data.places?.[0] ?? null);
    } catch (error: unknown) {
      if (activeRequest.current !== controller) return;
      const reply = controller.signal.aborted
        ? preparing
          ? 'The search service is taking longer to start. Please try again shortly.'
          : 'The search took too long. Please try again or search a nearby neighborhood.'
        : error instanceof Error ? error.message : 'The search could not be completed. Please try again.';
      setMessages((previous) => [...previous, {
        id: crypto.randomUUID(), sender: 'assistant', text: reply, timestamp: timestamp(), status: 'error',
      }]);
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsLoading(false);
        setIsStarting(false);
      }
    }
  };

  const handleRequestGPS = () => {
    if (gpsPending.current) return;
    const notice = (text: string) => setMessages((previous) => [...previous, {
      id: crypto.randomUUID(), sender: 'assistant', text, timestamp: timestamp(),
    }]);
    if (!navigator.geolocation) {
      notice('Device location is unavailable in this browser. Please type a city or neighborhood.');
      return;
    }
    gpsPending.current = true;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        gpsPending.current = false;
        setIsLocating(false);
        setUserLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
        notice("Device location is ready. You can now ask 'parks near me' or 'nearest hospital'.");
      },
      () => {
        gpsPending.current = false;
        setIsLocating(false);
        notice('Device location was denied or unavailable. You can still search by city or neighborhood.');
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleClearContext = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setIsLoading(false);
    setIsStarting(false);
    setCurrentContext(null);
    setPendingCategory(null);
    setResolvedLocation(null);
    setPlaces([]);
    setSelectedPlace(null);
    setMessages((previous) => [...previous, {
      id: crypto.randomUUID(), sender: 'assistant', timestamp: timestamp(),
      text: 'Conversational memory cleared. You can start a fresh search anywhere worldwide.',
    }]);
  };

  const handleSelectPlace = useCallback((place: Place) => setSelectedPlace(place), []);
  const handleSelectHistoricalPlace = (place: Place) => {
    if (activeRequest.current) return;
    const message = [...messages].reverse().find((entry) => entry.places?.includes(place));
    if (!message?.places || !message.resolved_location) return;
    setPlaces(message.places);
    setResolvedLocation(message.resolved_location);
    setCurrentContext({
      location_name: message.resolved_location.label, lat: message.resolved_location.lat,
      lon: message.resolved_location.lon, category: place.category,
    });
    setPendingCategory(null);
    setSelectedPlace(place);
  };

  return (
    <main className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden bg-slate-100">
      <div className="w-full md:w-[460px] lg:w-[500px] h-1/2 md:h-full min-h-0 z-10 shrink-0">
        <ChatPanel
          messages={messages} isLoading={isLoading} isStarting={isStarting} isLocating={isLocating} userLocation={userLocation}
          currentContext={currentContext} canClear={isLoading || !!currentContext || !!pendingCategory}
          selectedPlace={selectedPlace} onSendMessage={handleSendMessage} onRequestGPS={handleRequestGPS}
          onClearContext={handleClearContext} onSelectPlace={handleSelectHistoricalPlace}
        />
      </div>
      <div className="flex-1 min-h-0 relative z-0">
        <MapView places={places} resolvedLocation={resolvedLocation} selectedPlace={selectedPlace} onSelectPlace={handleSelectPlace} />
      </div>
    </main>
  );
};
