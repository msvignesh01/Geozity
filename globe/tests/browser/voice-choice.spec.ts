import { expect, test } from "@playwright/test";
import { encodeWav } from "../../src/voice";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/config", (route) =>
    route.fulfill({
      json: {
        voiceEnabled: true,
        speechEnabled: true,
        voiceProviders: ["elevenlabs", "sarvam"],
        mapStyleUrl: "https://tiles.openfreemap.org/styles/liberty",
      },
    }),
  );
  await page.route("**/api/location/search", (route) =>
    route.fulfill({
      json: {
        status: "ready",
        requestId: route.request().postDataJSON().requestId,
        summary: "Found one park.",
        aiMode: "rule_based",
        safetyNotice: null,
        resolvedLocation: { label: "Bengaluru", lat: 12.97, lon: 77.59 },
        contextToken: "controlled-browser-context",
        cached: false,
        places: [
          {
            id: "node/1",
            rank: 1,
            name: "Fixture Park",
            category: "park",
            lat: 12.97,
            lon: 77.59,
            address: null,
            openingHours: null,
            distanceMeters: 0,
            distanceLabel: "Approx. 0 km",
            osmUrl: "https://www.openstreetmap.org/node/1",
            wikiSummary: null,
            wikiUrl: null,
            retrievedAt: "2026-11-16T00:00:00Z",
          },
        ],
      },
    }),
  );
});

test("visitor chooses either voice; preference survives reload and stays separate from Sarvam", async ({
  page,
}) => {
  const requests: unknown[] = [];
  await page.route("**/api/voice/speak", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      contentType: "audio/wav",
      body: Buffer.from(encodeWav(new Float32Array(3200))),
    });
  });
  await page.goto("/");
  const picker = page.getByLabel("Reply voice", { exact: true });
  await expect(picker).toHaveValue("jessica");
  await page
    .getByRole("button", { name: "Parks in Bengaluru", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Read answer aloud · AI voice", exact: true })
    .click();
  await expect
    .poll(() => requests[0])
    .toMatchObject({ provider: "elevenlabs", voice: "jessica" });
  await picker.selectOption("sarah");
  await page
    .getByRole("button", { name: "Read answer aloud · AI voice", exact: true })
    .click();
  await expect
    .poll(() => requests[1])
    .toMatchObject({ provider: "elevenlabs", voice: "sarah" });
  await page.reload();
  await expect(picker).toHaveValue("sarah");
  await page
    .getByLabel("Voice service", { exact: true })
    .selectOption("sarvam");
  await expect(picker).toBeHidden();
  await page
    .getByRole("button", { name: "Parks in Bengaluru", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Read answer aloud · AI voice", exact: true })
    .click();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2]).toMatchObject({ provider: "sarvam" });
  expect(requests[2]).not.toHaveProperty("voice");
  await page
    .getByLabel("Voice service", { exact: true })
    .selectOption("elevenlabs");
  await expect(picker).toHaveValue("sarah");
});

test("an unsupported saved voice falls back to Jessica", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("geozity:reply-voice", "paid-voice-id"),
  );
  await page.goto("/");
  await expect(page.getByLabel("Reply voice", { exact: true })).toHaveValue(
    "jessica",
  );
});
