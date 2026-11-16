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
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.locator(".globe-pin")).toHaveCount(0);
  await expect(page.locator(".world-caption")).toBeVisible();
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toHaveValue("");
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
    .getByLabel("Ask Geozity", { exact: true })
    .fill("Museums in London");
  await page.getByRole("button", { name: "Find places", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Try this search again" }),
  ).toBeVisible();
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toHaveValue(
    "Museums in London",
  );
});

test("a completed search preserves a newer question typed while waiting", async ({
  page,
}) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/location/search", async (route) => {
    await waiting;
    await route.fulfill({
      json: {
        requestId: route.request().postDataJSON().requestId,
        status: "ready",
        summary: "Found 1 park near Bengaluru.",
        aiMode: "rule_based",
        safetyNotice: null,
        resolvedLocation: { label: "Bengaluru", lat: 12.97, lon: 77.59 },
        contextToken: "test-context",
        places: [place],
        cached: false,
      },
    });
  });
  await page.goto("/");
  const question = page.getByLabel("Ask Geozity", { exact: true });
  await question.fill("Parks in Bengaluru");
  const sent = page.waitForRequest("**/api/location/search");
  await page.getByRole("button", { name: "Find places", exact: true }).click();
  await sent;
  await question.fill("Museums in London");
  release();
  await expect(
    page.getByRole("heading", { name: "1 places to explore" }),
  ).toBeVisible();
  await expect(question).toHaveValue("Museums in London");
});

test("daily quota exhaustion keeps text and reset available without a retry loop", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/location/search", async (route) => {
    requests += 1;
    await route.fulfill({
      status: 429,
      json: {
        requestId: route.request().postDataJSON().requestId,
        status: "failed",
        errorCode: "QUOTA_REACHED",
        message:
          "Today’s usage allowance has been reached. Please return tomorrow.",
        retryable: false,
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Parks in Bengaluru", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Please return tomorrow.",
  );
  await expect(
    page.getByRole("button", { name: "Try this search again" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Ask Geozity", { exact: true })
    .fill("Museums in London");
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toHaveValue(
    "Museums in London",
  );
  expect(requests).toBe(1);
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".world-caption")).toBeVisible();
});

test("missing hospital location keeps the medical caution visible", async ({
  page,
}) => {
  await page.route("**/api/location/search", (route) =>
    route.fulfill({
      json: {
        requestId: route.request().postDataJSON().requestId,
        status: "needs_clarification",
        question: "Which city or neighborhood should I search?",
        choices: [],
        contextToken: "fixture",
      },
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("Ask Geozity", { exact: true })
    .fill("Nearest hospital");
  await page.getByRole("button", { name: "Find places", exact: true }).click();
  await expect(
    page.getByText(
      /For a medical emergency, contact local emergency services immediately/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Which city or neighborhood should I search?",
    }),
  ).toBeVisible();
});
test("unsupported requests offer working supported-search shortcuts", async ({
  page,
}) => {
  const questions: string[] = [];
  await page.route("**/api/location/search", (route) => {
    const body = route.request().postDataJSON();
    questions.push(body.question);
    return route.fulfill({
      json: {
        requestId: body.requestId,
        status: "failed",
        errorCode: "UNSUPPORTED_CATEGORY",
        message: "Choose a supported category.",
        retryable: false,
      },
    });
  });
  await page.goto("/");
  await page
    .getByLabel("Ask Geozity", { exact: true })
    .fill("Book a flight to Paris");
  await page.getByRole("button", { name: "Find places", exact: true }).click();
  await page
    .getByRole("button", { name: "Parks in Bengaluru", exact: true })
    .click();
  expect(questions).toEqual(["Book a flight to Paris", "Parks in Bengaluru"]);
});
