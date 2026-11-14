# User guide

## What Geozity does

Geozity helps a person find nearby places and landmarks using natural-language questions. The app is designed for quick local discovery, not for shopping carts, user profiles, or robust account management.

Supported categories include:

- hospitals
- parks
- cafes
- restaurants
- pharmacies
- museums
- attractions
- libraries
- supermarkets

Examples:

- "nearest hospital to MG Road, Bengaluru"
- "parks near me"
- "museums in London"
- "cafes instead"

## How to use the app

1. Open the app in the browser.
2. Type a query, or choose one of the suggested starter prompts.
3. If the request needs a location, either:
   - click "Use my GPS," or
   - type a city, neighborhood, or place name.
4. Review the returned list of near-by places.
5. Click a place on the map or in the list to focus the result.

## Important behavior to know

### Searching near your current location

If you choose "Use my GPS," the browser asks for the device location. That coordinate is used for the search radius, which is typically 5 km for the result set.

If GPS is denied, unavailable, or the browser does not support it, the app asks you to type a location instead.

### Follow-up questions

The UI keeps the last location and category in memory. That allows follow-ups such as:

- "cafes instead"
- "what about parks"
- "switch to pharmacies"

The app uses the last known search area unless the new query gives a different city or neighborhood.

### Supported place categories

The backend validates supported categories before searching. If the user asks for something outside that list, the API responds with an explicit "unsupported category" message and suggests valid categories.

### Safety notice

For hospital and pharmacy searches, the app appends a safety notice reminding the user to contact local emergency services in a medical emergency.

## Roles and permissions

This product currently has no user accounts or role-based permissions. There are no administrator, staff, or customer roles in the codebase.

In practical terms:

- every browser user can open the same search interface
- every request is treated as an anonymous public search
- no data is stored by account or role
- no private administration area exists in the current implementation

## What the app does not do

The current product does not include:

- saved user favorites
- bookings or reservations
- user reviews
- login or authentication
- a backend database for persistent records
- a private editing or admin dashboard

## Troubleshooting

### The search service is starting

When the hosted service is waking up, the app displays: “Waking up Geozity’s search service. This can take about a minute. Your search will start automatically.” Wait for the search to continue.

If startup does not finish, the app displays: “Geozity couldn’t finish starting the search service. Please send your search again to reconnect.” Send the search again to retry.

### The page says the search service is busy

This is a temporary concurrency limit in the Flask app. It can happen when multiple searches are queued at the same time. Try again after a moment.

### No results are returned

This is a valid result in the application logic. The app distinguishes between "no nearby matches" and "provider outage." If the search area is too small or the place type is uncommon, it can legitimately return no results.

### The map tiles do not load

The map UI shows a warning if some tiles fail to load, but the search results and place details remain available.

### Location is not found

This means the place or city name could not be resolved by the geocoding providers. Check the spelling or add a more specific location such as a city or neighborhood.

## Data sources and attribution

The app displays attribution to OpenStreetMap contributors, Nominatim, Overpass API, Photon, and Wikipedia/Wikidata when returning results or responses.

The project is built around public community-maintained map data and article summaries; it is not a closed or proprietary platform.
