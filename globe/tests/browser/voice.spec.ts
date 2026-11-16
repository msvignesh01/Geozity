import { expect, test } from "@playwright/test";

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
});

test("Indian-language selection uses Sarvam and asks for fresh consent after switching services", async ({
  page,
}) => {
  let provider = "";
  await page.route("**/api/voice/transcribe", async (route) => {
    provider = route.request().headers()["x-voice-provider"];
    await route.fulfill({
      json: { text: "Show parks near MG Road in Bengaluru." },
    });
  });
  await page.goto("/");
  await page
    .getByLabel("Voice service", { exact: true })
    .selectOption("sarvam");
  await expect(
    page.getByText(
      "Indian and mixed speech becomes editable English text. Review before sending.",
    ),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Record question", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Stop recording/ }),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /Stop recording/ }).click();
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toHaveValue(
    "Show parks near MG Road in Bengaluru.",
  );
  expect(provider).toBe("sarvam");
  await page
    .getByLabel("Voice service", { exact: true })
    .selectOption("elevenlabs");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Record question", exact: true }),
  ).toBeDisabled();
});
test("voice requires opt-in and transcription stays editable until sent", async ({
  page,
}) => {
  let searches = 0;
  await page.route("**/api/location/search", (route) => {
    searches += 1;
    return route.abort();
  });
  await page.route("**/api/voice/transcribe", async (route) => {
    expect(route.request().headers()["content-type"]).toBe("audio/wav");
    expect(route.request().postDataBuffer()!.subarray(0, 4).toString()).toBe(
      "RIFF",
    );
    await route.fulfill({ json: { text: "Parks in Bengaluru" } });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Record question", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Record question", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Stop recording/ }),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /Stop recording/ }).click();
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toHaveValue(
    "Parks in Bengaluru",
  );
  expect(searches).toBe(0);
  await page
    .getByLabel("Ask Geozity", { exact: true })
    .fill("Parks in Chennai");
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toHaveValue(
    "Parks in Chennai",
  );
});
test("cancel recording releases the microphone and does not upload audio", async ({
  page,
}) => {
  let uploads = 0;
  await page.route("**/api/voice/transcribe", (route) => {
    uploads += 1;
    return route.abort();
  });
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Record question", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Stop recording/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel recording", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Record question", exact: true }),
  ).toBeVisible();
  expect(uploads).toBe(0);
});

test("keyboard hold-to-talk releases into an editable transcript", async ({
  page,
}) => {
  await page.route("**/api/voice/transcribe", (route) =>
    route.fulfill({ json: { text: "Parks in Bengaluru" } }),
  );
  await page.goto("/");
  await page.getByRole("checkbox").check();
  const hold = page.getByRole("button", { name: "Hold to talk", exact: true });
  await hold.focus();
  await page.keyboard.down("Space");
  await expect(hold).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(600);
  await page.keyboard.up("Space");
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toHaveValue(
    "Parks in Bengaluru",
  );
  await expect(hold).toHaveAttribute("aria-pressed", "false");
});
test("canceling an interrupted upload ignores its late transcript", async ({
  page,
}) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let arrived!: () => void;
  const incoming = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  await page.route("**/api/voice/transcribe", async (route) => {
    arrived();
    await waiting;
    await route.fulfill({ json: { text: "Late transcript" } }).catch(() => {});
  });
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Record question", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Stop recording/ }),
  ).toBeVisible();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Stop recording/ }).click();
  await incoming;
  await page
    .getByRole("button", { name: "Cancel recording", exact: true })
    .click();
  release();
  await page.getByLabel("Ask Geozity", { exact: true }).fill("Keep this draft");
  await expect(page.getByLabel("Ask Geozity", { exact: true })).toHaveValue(
    "Keep this draft",
  );
});
test("voice transcript reaches outing review without sending a plan", async ({
  page,
}) => {
  let plans = 0;
  await page.route("**/api/outing/create", (route) => {
    plans++;
    return route.abort();
  });
  await page.route("**/api/voice/transcribe", (route) =>
    route.fulfill({ json: { text: "Coffee and a park in Bengaluru" } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Plan an outing", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Record question", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Stop recording/ }),
  ).toBeVisible();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /Stop recording/ }).click();
  await expect(page.getByLabel("Describe your outing (optional)")).toHaveValue(
    "Coffee and a park in Bengaluru",
  );
  await page
    .getByRole("button", { name: "Fill details from description" })
    .click();
  await expect(
    page.getByLabel("City or neighborhood", { exact: true }),
  ).toHaveValue("Bengaluru");
  expect(plans).toBe(0);
});
test("mute and zero volume disable spoken answers while text remains available", async ({
  page,
}) => {
  await page.route("**/api/location/search", (route) =>
    route.fulfill({
      json: {
        requestId: route.request().postDataJSON().requestId,
        status: "ready",
        summary: "A fixture answer",
        aiMode: "rule_based",
        safetyNotice: null,
        resolvedLocation: { label: "Bengaluru", lat: 12.97, lon: 77.59 },
        contextToken: "fixture",
        cached: false,
        places: [
          {
            id: "node/1",
            rank: 1,
            name: "Fixture park",
            category: "park",
            lat: 12.97,
            lon: 77.59,
            address: null,
            openingHours: null,
            distanceMeters: 0,
            distanceLabel: "Approx. straight-line",
            osmUrl: "https://www.openstreetmap.org/node/1",
            wikiSummary: null,
            wikiUrl: null,
            retrievedAt: "2026-11-16T00:00:00Z",
          },
        ],
      },
    }),
  );
  let speech = 0;
  await page.route("**/api/voice/speak", (route) => {
    speech++;
    return route.abort();
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Parks in Bengaluru", exact: true })
    .click();
  const read = page.getByRole("button", {
    name: "Read answer aloud · AI voice",
    exact: true,
  });
  await expect(read).toBeEnabled();
  await page.getByRole("button", { name: "Mute voice", exact: true }).click();
  await expect(read).toBeDisabled();
  await expect(
    page.getByText("A fixture answer", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Unmute voice", exact: true }).click();
  await page.getByLabel("Voice volume", { exact: true }).fill("0");
  await expect(read).toBeDisabled();
  expect(speech).toBe(0);
});

test("muting cancels a pending spoken reply and prevents late playback", async ({
  page,
}) => {
  let plays = 0;
  await page.exposeFunction("recordFixturePlay", () => {
    plays++;
  });
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = async function () {
      await (
        window as unknown as { recordFixturePlay: () => Promise<void> }
      ).recordFixturePlay();
    };
  });
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const incoming = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/voice/speak", async (route) => {
    started();
    await waiting;
    await route
      .fulfill({ contentType: "audio/wav", body: Buffer.alloc(44) })
      .catch(() => {});
  });
  await page.route("**/api/location/search", (route) =>
    route.fulfill({
      json: {
        requestId: route.request().postDataJSON().requestId,
        status: "ready",
        summary: "Fixture summary",
        aiMode: "rule_based",
        safetyNotice: null,
        resolvedLocation: { label: "Bengaluru", lat: 12.97, lon: 77.59 },
        contextToken: "fixture",
        cached: false,
        places: [
          {
            id: "node/1",
            rank: 1,
            name: "Fixture park",
            category: "park",
            lat: 12.97,
            lon: 77.59,
            address: null,
            openingHours: null,
            distanceMeters: 0,
            distanceLabel: "Approx. straight-line",
            osmUrl: "https://www.openstreetmap.org/node/1",
            wikiSummary: null,
            wikiUrl: null,
            retrievedAt: "2026-11-16T00:00:00Z",
          },
        ],
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Parks in Bengaluru", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Read answer aloud · AI voice", exact: true })
    .click();
  await incoming;
  await page.getByRole("button", { name: "Mute voice", exact: true }).click();
  release();
  await expect(
    page.getByRole("button", { name: "Stop all speech", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Read answer aloud · AI voice",
      exact: true,
    }),
  ).toBeDisabled();
  expect(plays).toBe(0);
});

test("denied microphone permission leaves editable text and a usable retry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Fixture denied", "NotAllowedError");
    };
  });
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Record question", exact: true })
    .click();
  await expect(
    page.getByText(
      "Microphone access was denied. You can still type your question.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByLabel("Ask Geozity", { exact: true })
    .fill("Parks in Bengaluru");
  await expect(
    page.getByRole("button", { name: "Record question", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Find places", exact: true }),
  ).toBeEnabled();
});
test("releasing hold during permission setup cancels without uploading", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return original(constraints);
    };
  });
  let uploads = 0;
  await page.route("**/api/voice/transcribe", (route) => {
    uploads++;
    return route.abort();
  });
  await page.goto("/");
  await page.getByRole("checkbox").check();
  const hold = page.getByRole("button", { name: "Hold to talk", exact: true });
  await hold.focus();
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await page.waitForTimeout(400);
  await expect(
    page.getByRole("button", { name: "Record question", exact: true }),
  ).toBeEnabled();
  expect(uploads).toBe(0);
});
