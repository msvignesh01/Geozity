import { expect, test } from "@playwright/test";
import {
  schedulePlan,
  type OutingInput,
  type Slot,
} from "../../src/domain/outing";
const input: OutingInput = {
  area: "Bengaluru",
  occasion: "Friends afternoon",
  localStart: "2026-11-21T14:00",
  timezone: "Asia/Kolkata",
  groupSize: 2,
  transport: "walk",
  durationMinutes: 240,
  budget: null,
  requirements: [],
  preferences: "",
  stops: [
    { category: "cafe", dwellMinutes: 45 },
    { category: "park", dwellMinutes: 45 },
    { category: "restaurant", dwellMinutes: 45 },
  ],
};
const location = { label: "Bengaluru", lat: 12.97, lon: 77.59 };
const slots: Slot[] = input.stops.map((s, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  ...s,
  selected: 0,
  candidates: [
    {
      id: `node/${i + 1}`,
      rank: i + 1,
      name: `Fixture stop ${i + 1}`,
      category: s.category,
      ...location,
      address: "Fixture address",
      openingHours: "24/7",
      distanceMeters: 100,
      distanceLabel: "Approx. straight-line",
      osmUrl: `https://www.openstreetmap.org/node/${i + 1}`,
      wikiSummary: null,
      wikiUrl: null,
      retrievedAt: "2026-11-16T00:00:00Z",
      evidence: {
        wheelchair: "unknown",
        vegetarian: "unknown",
        vegan: "unknown",
      },
    },
  ],
}));
const legs = slots.slice(1).map((s, i) => ({
  fromId: slots[i].id,
  toId: s.id,
  mode: "walk" as const,
  seconds: 600,
  meters: 700,
  verified: true,
  retrievedAt: "2026-11-16T00:00:00Z",
}));
const plan = schedulePlan(input, location, slots, legs);
test.beforeEach(async ({ page }) => {
  await page.route("**/api/config", (route) =>
    route.fulfill({
      json: {
        voiceEnabled: false,
        speechEnabled: false,
        voiceProviders: [],
        mapStyleUrl: "https://tiles.openfreemap.org/styles/liberty",
      },
    }),
  );
});
test("structured outing submits confirmed details and removal preserves other stops", async ({
  page,
}) => {
  let received: { requestId: string; input: OutingInput } = {
    requestId: "",
    input,
  };
  let edit: {
    requestId: string;
    planToken: string;
    stopId: string;
    action: string;
  } = { requestId: "", planToken: "", stopId: "", action: "" };
  await page.route("**/api/outing/create", async (route) => {
    received = route.request().postDataJSON();
    await route.fulfill({
      json: {
        requestId: received.requestId,
        status: "ready",
        plan,
        planToken: "fixture-plan-token",
      },
    });
  });
  await page.route("**/api/outing/edit", async (route) => {
    edit = route.request().postDataJSON();
    const remaining = schedulePlan(
      { ...input, stops: input.stops.slice(1) },
      location,
      slots.slice(1),
      legs.slice(1),
      2,
    );
    await route.fulfill({
      json: {
        requestId: edit.requestId,
        status: "ready",
        plan: remaining,
        planToken: "updated-plan-token",
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Plan an outing", exact: true })
    .click();
  await page
    .getByLabel("City or neighborhood", { exact: true })
    .fill(input.area);
  await page.getByLabel("Local start", { exact: true }).fill(input.localStart);
  await page.getByLabel("City timezone", { exact: true }).fill(input.timezone);
  await page
    .getByRole("button", { name: "Build my outing", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your checked outing" }),
  ).toBeVisible();
  expect(received.input.stops).toHaveLength(3);
  expect(received.input.transport).toBe("walk");
  await expect(page.getByText(/Costs, group availability/)).toBeVisible();
  await page
    .getByRole("button", { name: "Remove stop 1", exact: true })
    .click();
  expect(edit).toMatchObject({
    planToken: "fixture-plan-token",
    stopId: slots[0].id,
    action: "remove",
  });
  await expect(
    page.getByRole("heading", { name: "1. Fixture stop 2", exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("body").evaluate((el) => el.clientWidth),
  );
  await page.screenshot({
    path: `test-results/outing-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your checked outing" }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("City or neighborhood", { exact: true }),
  ).toHaveValue("");
});
test("description fills reviewable details without submitting or inventing a date", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/outing/create", (route) => {
    calls++;
    return route.abort();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Plan an outing", exact: true })
    .click();
  await page
    .getByLabel("Describe your outing (optional)")
    .fill("Coffee, a park and dinner in Indiranagar under ₹1,500");
  await page
    .getByRole("button", { name: "Fill details from description" })
    .click();
  await expect(
    page.getByLabel("City or neighborhood", { exact: true }),
  ).toHaveValue("Indiranagar");
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("1500");
  await expect(page.getByLabel("Budget requirement")).toHaveValue("must");
  await expect(page.getByLabel("Local start", { exact: true })).toHaveValue("");
  expect(calls).toBe(0);
});
