import { expect, test } from "@playwright/test";

/*
 * Visitor-journey coverage for the SEO/functional triage wave (gh#341, gh#343,
 * gh#322): the 404 recovery page, the homepage highlight slider's manual
 * controls, and news topic filtering. Each test asserts behavior the static
 * build guarantees, not CMS-driven content, so copy edits cannot break them.
 */

test("unknown routes land on the branded recovery page with working exits", async ({ page }) => {
  await page.goto("/a-route-that-does-not-exist/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("Page Not Found");

  for (const href of ["/", "/research/current-programs/", "/search/", "/news/"]) {
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  }

  await page.locator('main a[href="/search/"]').first().click();
  await expect(page).toHaveURL(/\/search\/$/);
  await expect(page.locator("main h1")).not.toBeEmpty();
  await expect(page.locator('main form[role="search"]')).toBeVisible();
});

test("homepage highlight slider advances manually with announced titles", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const slider = page.locator("[data-home-slider]");
  await expect(slider).toBeVisible();

  const activeTitle = () =>
    slider.locator('[data-slide][data-active="true"]').getAttribute("data-slide-title");
  const firstTitle = await activeTitle();
  expect(firstTitle, "slider should expose an active slide title").toBeTruthy();

  await slider.locator('[data-slider-action="next"]').click();
  await expect.poll(activeTitle, "next control should advance the slider").not.toBe(firstTitle);

  await slider.locator('[data-slider-action="previous"]').click();
  await expect.poll(activeTitle, "previous control should return to the first slide").toBe(firstTitle);

  const thirdTitle = await slider.locator("[data-slide]").nth(2).getAttribute("data-slide-title");
  await slider.locator("[data-slider-index]").nth(2).click();
  await expect.poll(activeTitle, "indicator should jump to the third slide").toBe(thirdTitle);
  await expect(slider.locator("[data-slider-index]").nth(2)).toHaveAttribute("aria-current", "true");
});

test("news topic filtering narrows the archive and announces the result", async ({ page }) => {
  await page.goto("/news/", { waitUntil: "domcontentloaded" });
  const totalCards = await page.locator("[data-topic-card]").count();
  expect(totalCards, "news index should render filterable brief cards").toBeGreaterThan(1);

  const topicButton = page.locator('[data-topic-filter]:not([data-topic-filter="all"])').first();
  const topic = await topicButton.getAttribute("data-topic-filter");
  expect(topic, "news index should offer at least one topic filter").toBeTruthy();

  await topicButton.click();
  await expect(page.locator("[data-topic-status]")).toContainText(topic!);

  const visibleTopics = await page
    .locator("[data-topic-card]:not([hidden])")
    .evaluateAll((cards) => cards.map((card) => card.getAttribute("data-topics") ?? ""));
  expect(visibleTopics.length).toBeGreaterThan(0);
  for (const topics of visibleTopics) {
    expect(topics.split(" | "), `visible card should carry topic ${topic}`).toContain(topic!);
  }

  await page.locator('[data-topic-filter="all"]').click();
  await expect(page.locator("[data-topic-card][hidden]")).toHaveCount(0);
});
