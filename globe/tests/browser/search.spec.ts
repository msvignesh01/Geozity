import { expect, test } from "@playwright/test";
import type { Place } from "../../src/domain/contracts";
const place: Place = {
  id: "node/1",
  rank: 1,
  name: "Cubbon Park",
  category: "park",
  lat: 12.976,
  lon: 77.59,
  distanceMeters: 1000,
  distanceLabel: "Approx. 1.0 km straight-line from Bengaluru",
  address: "Bengaluru, India",
  openingHours: null,
  osmUrl: "https://www.openstreetmap.org/node/1",
  wikiSummary: "A public park in Bengaluru.",
  wikiUrl: "https://en.wikipedia.org/wiki/Cubbon_Park",
  retrievedAt: "2026-11-14T16:00:00Z",
};
test.beforeEach(async ({ page }) => {
  await page.route("**/api/config", (route) =>
    route.fulfill({
      json: {
        voiceEnabled: false,
        speechEnabled: false,
        mapStyleUrl: "https://tiles.openfreemap.org/styles/liberty",
      },
    }),
  );
});
test("guest search, follow-up, cards, and honest hours", async ({ page }) => {
  const received: unknown[] = [];
  await page.route("**/api/location/search", async (route) => {
    const body = route.request().postDataJSON();
    received.push(body);
    await route.fulfill({
      json: {
        requestId: body.requestId,
        status: "ready",
        summary: "Found 1 park near Bengaluru.",
        aiMode: "rule_based",
        safetyNotice: null,
        resolvedLocation: { label: "Bengaluru", lat: 12.97, lon: 77.59 },
        contextToken: "test-browser-context",
        places: [place],
        cached: false,
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Parks in Bengaluru", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "1 places to explore" }),
  ).toBeVisible();
  await expect(page.getByText("Opening hours not listed")).toBeVisible();
  const card = page.getByRole("button", { name: /Cubbon Park.*straight-line/ });
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Ask Geozity", { exact: true }).fill("cafes instead");
  await page.getByRole("button", { name: "Find places" }).click();
  expect(received[1]).toMatchObject({
    question: "cafes instead",
    contextToken: "test-browser-context",
  });
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((el) => el.clientWidth),
  );
  await page.screenshot({
    path: `test-results/geozity-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("location clarification choices submit the selected token", async ({
  page,
}) => {
  let choice: string | null = null;
  await page.route("**/api/location/search", async (route) => {
    const body = route.request().postDataJSON();
    choice = body.choiceToken;
    await route.fulfill({
      json: body.choiceToken
        ? {
            requestId: body.requestId,
            status: "no_results",
            summary: "No parks returned for this area.",
            resolvedLocation: {
              label: "Springfield, Illinois",
              lat: 39.78,
              lon: -89.65,
            },
            contextToken: "confirmed",
            radiusMeters: 5000,
          }
        : {
            requestId: body.requestId,
            status: "needs_clarification",
            question: "Which location did you mean?",
            choices: [
              { label: "Springfield, Illinois", token: "illinois-choice" },
              {
                label: "Springfield, Massachusetts",
                token: "massachusetts-choice",
              },
            ],
            contextToken: "pending",
          },
    });
  });
  await page.goto("/");
  await page
    .getByLabel("Ask Geozity", { exact: true })
    .fill("Parks in Springfield");
  await page.getByRole("button", { name: "Find places" }).click();
  await page
    .getByRole("button", { name: "Springfield, Illinois", exact: true })
    .click();
  await expect(
    page.getByText("No parks returned for this area.", { exact: true }),
  ).toBeVisible();
  expect(choice).toBe("illinois-choice");
});
test("medical notice and provider names render as text, not HTML", async ({
  page,
}) => {
  await page.route("**/api/location/search", async (route) => {
    const body = route.request().postDataJSON();
    await route.fulfill({
      json: {
        requestId: body.requestId,
        status: "ready",
        summary: "Found hospitals.",
        aiMode: "rule_based",
        safetyNotice:
          "For a medical emergency, contact local emergency services immediately.",
        resolvedLocation: { label: "Bengaluru", lat: 12.97, lon: 77.59 },
        contextToken: "context",
        places: [
          {
            ...place,
            category: "hospital",
            name: "<img src=x onerror=alert(1)>",
          },
        ],
        cached: false,
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Nearest hospital to MG Road, Bengaluru",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      "For a medical emergency, contact local emergency services immediately.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".place img")).toHaveCount(0);
  await expect(
    page.getByText("<img src=x onerror=alert(1)>", { exact: true }),
  ).toBeVisible();
});
test("map failure keeps search usable, reset cancels stale responses", async ({
  page,
}) => {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.abort(),
  );
  await page.route("**/api/location/search", async (route) => {
    const body = route.request().postDataJSON();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route
      .fulfill({
        json: {
          requestId: body.requestId,
          status: "no_results",
          summary: "OLD RESPONSE",
          resolvedLocation: { label: "Bengaluru", lat: 12.97, lon: 77.59 },
          contextToken: "old",
          radiusMeters: 5000,
        },
      })
      .catch(() => {
        /* A canceled browser request can close before the fixture is delivered. */
      });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Parks in Bengaluru", exact: true })
    .click();
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(
    page.getByText("Search area and device location cleared.", { exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(700);
  await expect(page.getByText("OLD RESPONSE")).toHaveCount(0);
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toBeEnabled();
});
test("provider failures offer a retry and preserve text entry", async ({
  page,
}) => {
  await page.route("**/api/location/search", async (route) =>
    route.fulfill({
      status: 504,
      json: {
        requestId: route.request().postDataJSON().requestId,
        status: "failed",
        errorCode: "PROVIDER_TIMEOUT",
        message: "The service took too long. Please try again.",
        retryable: true,
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Museums in London", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Try this search again" }),
  ).toBeVisible();
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toBeEnabled();
});
