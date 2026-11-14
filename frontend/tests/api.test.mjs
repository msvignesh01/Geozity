import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Exercise the actual TypeScript modules with the existing compiler and Node
// test runner. No additional test library or generated source files are needed.
const modules = new Map();
async function moduleUrl(path) {
  const sourceUrl = new URL(path, import.meta.url);
  if (modules.has(sourceUrl.href)) return modules.get(sourceUrl.href);
  const source = await readFile(sourceUrl, 'utf8');
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    fileName: fileURLToPath(sourceUrl),
  });
  const imports = [...outputText.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)];
  for (const match of imports) {
    const name = match[1];
    const resolved = name.startsWith('.')
      ? await moduleUrl(new URL(`${name}.ts`, sourceUrl).href)
      : import.meta.resolve(name);
    outputText = outputText.replace(match[0], match[0].replace(name, resolved));
  }
  const result = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  modules.set(sourceUrl.href, result);
  return result;
}

const { parseChatResponse, requestChat, CATEGORY_LABELS } = await import(await moduleUrl('../src/api.ts'));
const { safeHttpUrl } = await import(await moduleUrl('../src/safe-url.ts'));
const { PlaceCard } = await import(await moduleUrl('../src/components/PlaceCard.tsx'));
const place = {
  id: 'node/1', rank: 1, name: '<script>unsafe</script>', category: 'park', lat: 51.5, lon: -0.1,
  distance_km: 0.1, distance_label: 'Approx. 100 m straight-line from London',
  address: 'London', opening_hours: '24/7', phone: null, website: null,
  osm_url: 'https://www.openstreetmap.org/node/1',
};
const resolved = { label: 'London', lat: 51.5, lon: -0.1, source: 'OpenStreetMap' };
const context = { location_name: 'London', lat: 51.5, lon: -0.1, category: 'park' };
const ready = { status: 'ready', reply: 'Found a place.', attribution: 'OSM', places: [place], resolved_location: resolved, context };

test('accepts complete, real response shapes for every status', () => {
  assert.deepEqual(parseChatResponse(ready), ready);
  for (const status of ['needs_location', 'unsupported_category', 'location_not_found', 'error']) {
    assert.equal(parseChatResponse({ status, reply: 'Please retry.', attribution: 'OSM' }).status, status);
  }
  assert.equal(parseChatResponse({ ...ready, status: 'no_results', places: [] }).places.length, 0);
});

for (const value of [null, [], {}, { ...ready, status: 'unknown' }, { ...ready, reply: 4 },
  { ...ready, places: [] }, { ...ready, context: null }, { ...ready, places: [{ ...place, lat: NaN }] },
  { ...ready, places: [{ ...place, lon: 181 }] }, { ...ready, places: [{ ...place, opening_hours: null }] },
  { ...ready, suggested_categories: ['librarys'] }, { ...ready, places: Array(11).fill(place) },
  { ...ready, context: { ...context, category: 'unknown' } }, { ...ready, resolved_location: { ...resolved, lat: Infinity } }]) {
  test(`rejects malformed server data: ${JSON.stringify(value)?.slice(0, 100)}`, () => {
    assert.throws(() => parseChatResponse(value));
  });
}

test('rejects misleading empty states and conflicting marker identities', () => {
  assert.throws(() => parseChatResponse({ ...ready, status: 'no_results' }));
  assert.throws(() => parseChatResponse({ ...ready, places: [place, { ...place, rank: 2 }] }));
  assert.throws(() => parseChatResponse({ ...ready, places: [{ ...place, rank: 2 }] }));
  assert.throws(() => parseChatResponse({ ...ready, status: 'error' }));
  assert.throws(() => parseChatResponse({ ...ready, places: [{ ...place, phone: undefined }] }));
  assert.throws(() => parseChatResponse({ ...ready, places: [{ ...place, website: undefined }] }));
});

test('validates all suggested category keys and correct irregular plurals', () => {
  const value = parseChatResponse({ status: 'unsupported_category', reply: 'Choose a category.', attribution: 'OSM', suggested_categories: Object.keys(CATEGORY_LABELS) });
  assert.equal(value.suggested_categories.length, 9);
  assert.equal(CATEGORY_LABELS.pharmacy, 'pharmacies');
  assert.equal(CATEGORY_LABELS.library, 'libraries');
});

for (const value of ['javascript:alert(1)', 'data:text/html,unsafe', '//example.com', 'https://user:pass@example.com', 'https://example.com/\nunsafe', null]) {
  test(`suppresses unsafe links ${value}`, () => assert.equal(safeHttpUrl(value), null));
}

test('preserves valid HTTP and HTTPS links', () => {
  assert.equal(safeHttpUrl('https://example.com/path'), 'https://example.com/path');
  assert.equal(safeHttpUrl('http://example.com'), 'http://example.com/');
});

test('place selection is a keyboard-accessible button and remote names are escaped', () => {
  const html = renderToStaticMarkup(React.createElement(PlaceCard, {
    place: { ...place, website: 'javascript:alert(1)', wiki_url: 'data:text/html,bad', wiki_summary: '<img onerror=bad>' },
    isSelected: true, onSelect() {}, disabled: true,
  }));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes('disabled=""'));
  assert.ok(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('href="data:'));
  assert.ok(!html.includes('<img'));
});

const payload = { message: 'parks in London', user_location: null, last_context: null, pending_category: null };
test('preserves the server retry message on a failed search', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: 'error', reply: 'Search is busy. Please try again shortly.', attribution: 'OSM' }), { status: 503 }));
  const data = await requestChat(payload, new AbortController().signal);
  assert.equal(data.status, 'error');
  assert.match(data.reply, /busy/);
});

test('submits only the existing conversation payload and cancellation signal', async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, '/api/chat');
    assert.deepEqual(JSON.parse(init.body), payload);
    assert.equal(init.signal, controller.signal);
    return new Response(JSON.stringify(ready));
  });
  assert.equal((await requestChat(payload, controller.signal)).status, 'ready');
});

test('unreadable errors and lost connections become useful messages', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('<html>Proxy error</html>', { status: 502 }));
  await assert.rejects(requestChat(payload, new AbortController().signal), /unreadable/);
  fetch.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(requestChat(payload, new AbortController().signal), /could not be reached/);
});

test('a failed HTTP response cannot claim success', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(ready), { status: 500 }));
  await assert.rejects(requestChat(payload, new AbortController().signal), /could not be completed/);
});
