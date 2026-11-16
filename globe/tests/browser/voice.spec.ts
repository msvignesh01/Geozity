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
