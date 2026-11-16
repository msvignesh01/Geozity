# Current browser-check scope — 16 November 2026

The `h1-h2-h3` branch passed all 42 controlled desktop/mobile browser cases in `globe/tests/browser/search.spec.ts`, `outing.spec.ts` and `voice.spec.ts`, configured by `globe/playwright.config.ts`. Run `pnpm test:browser` inside `globe/`. API responses are intercepted and microphone input is synthetic: this proves UI behavior, not live-provider or physical-phone acceptance. Coverage includes search/refinement/clarification, safe medical/unsupported states, map fallback, quota/timeout recovery, outing review/removal/reset, hold-to-talk, editable voice-to-planner input, permission failures, interrupted uploads and mute/late-playback prevention.

For a human check, open https://geozity-globe.vercel.app, choose Parks in Bengaluru, confirm numbered cards/pins, select a card, ask Cafes instead and choose Start fresh. Use consenting adult voice testers only. Choose a provider and consent, record a short question, review the editable transcript and explicitly submit. Check playback and denied permissions separately; typing must remain possible. These live checks consume allowances; never substitute fixtures on the public app.

Physical-phone, first-time human usability, accents and noisy mixed-language speech remain pending. Test the new outing and expanded voice controls locally with matching `h1-h2-h3` source/API; this branch does not release them to production.

---

## Earlier browser checks retained

# Browser regression checks

These checks supplement the automated suites. The controlled checks were performed through the real browser interface on 14 November 2026, with the React website submitting HTTP requests to Flask. Only upstream provider responses were replaced in the separate fixture process. They do not prove live-provider availability.

## Controlled setup

Do not run this beside the normal product on port 5000. Start `backend/tests/browser_server.py --fixtures` using the project's Python environment, then run `pnpm dev` in `frontend`. Open http://127.0.0.1:5173/. Every returned place is clearly named **Fixture**. The fixture entrypoint binds only to loopback and requires an explicit flag. Stop both processes after these checks. Restart the normal product using `scripts/start-local.ps1` for real searches.

## Cases and observed outcomes

| Action | Expected and observed behavior |
| --- | --- |
| Search `parks in London` | Two fixture cards and two numbered place pins appear, with one selected card. |
| Select the second card by keyboard or click | Rank 2 becomes active and its matching popup opens. |
| Search `cafes instead` | The reference area remains London; category changes to cafe. |
| Search `parks in Empty` | The response is `no_results`; no old numbered place pins remain. |
| Search `hospitals in Offline` | A provider retry message and medical caution appear; no numbered pins remain. |
| Clear memory, then search `pharmacies near me` | A location question and medical caution appear. |
| Reply `in London` | The pending pharmacy search completes around London. |
| Search `bowling balls`, then choose `+library` | Unsupported-category suggestions appear; the library button sends a valid follow-up and returns libraries in London. |
| Search `parks in Slow`, immediately clear memory | The current pins and context clear; the delayed response does not restore them. |
| Search parks in London, then museums in Paris; select an earlier London card | The earlier results, selected pin, and London conversation reference are restored together. Only one card is selected. |
| Inspect fixture address containing `<img ... onerror=...>` | The string is visible literally in both card and popup; no injected image element exists. |
| Inspect the fixture's `javascript:` website | No unsafe website link is rendered. |
| Check at 360 × 800 CSS pixels | Page content is 360 pixels wide; the input remains in bounds, and the map has a visible 400-pixel-high area. Returning to desktop resets the temporary viewport override. |
| Resize a selected real-result popup from desktop to phone | Popup height adapts and the selected place title remains readable inside the map. |

Leaflet may briefly retain a closing popup in the DOM during its fade animation; assertions about popup content should target the active popup after the state settles rather than reading the first transient node immediately after a click.

## Live product checks

Run the normal single-server command and open http://127.0.0.1:5000/. The normal application must show real OpenStreetMap names, never **Fixture** records. Search `Museums in London`, choose a card and confirm its corresponding numbered pin, then try `parks instead`.

Device GPS permission and an actual physical-device location were not exercised by the agent. The server coordinate paths are covered automatically. To check the browser/device integration yourself, choose **Use my GPS**, approve only if desired, then ask `parks near me`. Denying permission should leave named-city searches usable.

Reduced-motion behavior is implemented in map, selection, scrolling, and CSS animation paths; a complete operating-system assistive-technology assessment was not performed. This is not a full accessibility certification.
