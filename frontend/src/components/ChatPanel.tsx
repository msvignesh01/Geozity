import React, { useState, useRef, useEffect } from 'react';
import { Place, ChatMessage, UserLocation, ContextState } from '../types';
import { PlaceCard } from './PlaceCard';
import { Send, AlertTriangle, Sparkles, RotateCcw, Navigation } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isLocating: boolean;
  canClear: boolean;
  userLocation: UserLocation | null;
  currentContext: ContextState | null;
  selectedPlace: Place | null;
  onSendMessage: (text: string) => void;
  onRequestGPS: () => void;
  onClearContext: () => void;
  onSelectPlace: (place: Place) => void;
}

const SAMPLE_PROMPTS = [
  'Nearest hospital to MG Road, Bengaluru',
  'Parks in Cubbon Park area, Bengaluru',
  'Museums in London',
  'Cafes near Shinjuku, Tokyo',
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  isLocating,
  canClear,
  userLocation,
  currentContext,
  selectedPlace,
  onSendMessage,
  onRequestGPS,
  onClearContext,
  onSelectPlace,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Geozity
              </h1>
              <p className="text-xs text-slate-500">
                Live OpenStreetMap &bull; Leaflet &bull; Wikipedia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* GPS Toggle Button */}
            <button
              onClick={onRequestGPS}
              disabled={isLocating}
              type="button"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                userLocation
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title={userLocation ? 'GPS active' : 'Click to use device coordinates'}
            >
              <Navigation className={`w-3.5 h-3.5 ${userLocation ? 'text-emerald-600 animate-pulse' : 'text-slate-500'}`} />
              <span>{isLocating ? 'Locating...' : userLocation ? 'GPS Active' : 'Use my GPS'}</span>
            </button>

            {/* Clear Context Button */}
            {canClear && (
              <button
                onClick={onClearContext}
                type="button"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                title="Clear conversational memory"
                aria-label="Clear conversational memory"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active Memory Indicator */}
        {currentContext && (
          <div className="mt-2.5 px-2.5 py-1 bg-blue-50 border border-blue-200/60 rounded-md flex items-center justify-between text-[11px] text-blue-800">
            <span className="truncate">
              <strong>Context:</strong> {currentContext.location_name} ({currentContext.category})
            </span>
            <span className="text-blue-500 shrink-0 ml-2">Remembers city</span>
          </div>
        )}
      </div>

      {/* Message Stream */}
      <div role="log" aria-label="Search conversation" aria-live="polite" aria-relevant="additions" className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* User Bubble */}
            {msg.sender === 'user' ? (
              <div className="bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] text-sm shadow-sm leading-relaxed">
                {msg.text}
              </div>
            ) : (
              /* Assistant Bubble */
              <div className="space-y-3 max-w-[95%]">
                <div className="bg-white border border-slate-200 p-3.5 rounded-2xl rounded-tl-sm text-sm text-slate-800 shadow-sm leading-relaxed">
                  {msg.text}
                </div>

                {/* Safety Warning Banner for Emergency Categories */}
                {msg.safety_notice && (
                  <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl text-xs text-amber-900 flex items-start gap-2 shadow-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{msg.safety_notice}</span>
                  </div>
                )}

                {/* Suggested Categories when user asks for unsupported place */}
                {msg.suggested_categories && msg.suggested_categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggested_categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        disabled={isLoading}
                        onClick={() => onSendMessage(currentContext ? `${cat} instead` : `${cat} near me`)}
                        className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 transition-colors shadow-2xs"
                      >
                        +{cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Returned Places List */}
                {msg.places && msg.places.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
                      {msg.places.length} OpenStreetMap places
                    </div>
                    {msg.places.map((place) => (
                      <PlaceCard
                        key={place.id}
                        place={place}
                        isSelected={selectedPlace === place}
                        onSelect={onSelectPlace}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div role="status" className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-sm max-w-[70%] text-xs text-slate-500 shadow-sm animate-pulse">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
            <span className="ml-1 font-medium">Searching OpenStreetMap &amp; Wikipedia...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Starters (shown above input) */}
      <div className="px-4 py-2 border-t border-slate-200/80 bg-slate-100/70 shrink-0">
        <div className="text-[11px] font-medium text-slate-500 mb-1.5">Try asking:</div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSendMessage(prompt)}
              disabled={isLoading}
              className="text-xs whitespace-nowrap px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-colors shrink-0 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            aria-label="Ask for places"
            maxLength={1000}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              currentContext
                ? `Ask about ${currentContext.location_name} or type 'cafes instead'`
                : "Ask 'nearest hospital to MG Road' or 'parks near me'..."
            }
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50"
          />
          <button
            type="submit"
            aria-label="Send question"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors shadow-sm shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
