import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.LL_SMOKE_BASE_URL || "https://srma4tech.github.io/little-learners/";
// Derive the release markers from the checked-out source instead of maintaining
// duplicate constants that drift after routine releases.
const sourceHtml = fs.readFileSync("index.html", "utf8");
const sourceServiceWorker = fs.readFileSync("sw.js", "utf8");
const expectedVersion = sourceHtml.match(/2026\.\d{2}\.\d{2}\.\d+/)?.[0];
const expectedCache = sourceServiceWorker.match(/little-learners-v\d+/)?.[0];
if (!expectedVersion || !expectedCache) {
  throw new Error("Could not determine expected release version/cache from checked-out source.");
}
const out = "artifacts";
fs.mkdirSync(out, { recursive: true });
const errors = [];
const viewportResults = [];
const browser = await chromium.launch({ headless: true });

async function checkOverflow(page, width, screen) {
  const result = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    app: document.querySelector("#app")?.scrollWidth ?? 0
  }));
  const passed = result.document <= result.viewport + 2 && result.body <= result.viewport + 2;
  viewportResults.push({ width, screen, passed, ...result });
  if (!passed) throw new Error(`Horizontal overflow at ${width}px on ${screen}: ${JSON.stringify(result)}`);
}

async function waitForExpectedDeployment(page, width) {
  let lastVersion = "(footer version missing)";
  let lastCache = "(service worker not readable)";
  for (let attempt = 0; attempt < 12; attempt++) {
    const url = baseUrl + "?ci-smoke=" + Date.now() + "-" + width + "-" + attempt;
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (!response || !response.ok()) throw new Error("Site returned HTTP " + (response?.status() ?? "no response"));
    await page.locator("#app").waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(() => !!document.querySelector("#app")?.innerText.trim(), { timeout: 15000 });
    lastVersion = await page.locator(".footer-version").innerText().catch(() => "(footer version missing)");
    lastCache = await page.evaluate(async () => {
      try {
        const response = await fetch("./sw.js?deployment-check=" + Date.now(), { cache: "no-store" });
        return response.ok ? await response.text() : "HTTP " + response.status;
      } catch (error) { return String(error); }
    });
    if (lastVersion.includes(expectedVersion) && lastCache.includes(expectedCache)) return;
    if (attempt < 11) await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error("GitHub Pages did not serve the expected release after 120 seconds. Expected footer " + expectedVersion + " and cache " + expectedCache + "; observed " + lastVersion + " / " + (lastCache.match(/little-learners-v\d+/)?.[0] || lastCache.slice(0, 80)));
}

async function checkInteractiveControls(page, width, screen) {
  const result = await page.evaluate(() => [...document.querySelectorAll("#app button, header button, footer button, #app input, #app select, #app textarea")]
    .filter(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    })
    .map(element => ({
      tag: element.tagName.toLowerCase(),
      label: (element.getAttribute("aria-label") || element.getAttribute("title") || element.innerText || element.getAttribute("placeholder") || "").trim(),
      height: Math.round(element.getBoundingClientRect().height)
    })));
  const unnamed = result.filter(control => !control.label);
  const undersized = result.filter(control => ["button", "input", "select", "textarea"].includes(control.tag) && control.height < 40);
  viewportResults.push({ width, screen, controlCount: result.length, unnamedControls: unnamed.length, undersizedControls: undersized.length, passed: !unnamed.length && !undersized.length });
  if (unnamed.length || undersized.length) throw new Error("Accessibility/tap-target check failed at " + width + "px on " + screen + ": " + JSON.stringify({ unnamed, undersized }));
}

async function checkCompactHomeAndNavigation(page, width) {
  if (width > 400) return;
  const result = await page.evaluate(() => {
    const nav = document.querySelector(".footer-nav");
    const navRect = nav?.getBoundingClientRect();
    const buttons = [...(nav?.querySelectorAll("button") || [])];
    const labels = buttons.map(button => {
      const label = button.querySelector("span:last-child");
      return {
        label: label?.textContent?.trim() || "",
        fits: !!label && label.getBoundingClientRect().width <= button.getBoundingClientRect().width - 4,
        buttonFits: button.scrollWidth <= button.clientWidth + 1,
        hasSeparateIcon: !!button.querySelector('span[aria-hidden="true"]')
      };
    });
    const tiles = [...document.querySelectorAll("#app .tile")];
    const lastTile = tiles.at(-1)?.getBoundingClientRect();
    return {
      navVisible: !!nav && getComputedStyle(nav).display !== "none" && navRect.width > 0,
      navWithinViewport: !!navRect && navRect.top >= 0 && navRect.bottom <= window.innerHeight + 1,
      labels,
      tileCount: tiles.length,
      lastTileBottom: lastTile?.bottom ?? null,
      navTop: navRect?.top ?? null,
      homeTilesClearOfNavigation: !!lastTile && !!navRect && lastTile.bottom <= navRect.top - 4
    };
  });
  const labelsFit = result.labels.length === 4 && result.labels.every(label => label.fits && label.buttonFits && label.hasSeparateIcon);
  const passed = result.navVisible && result.navWithinViewport && labelsFit && result.homeTilesClearOfNavigation;
  viewportResults.push({ width, screen: "compact-home-navigation", passed, ...result });
  if (!passed) {
    throw new Error("Compact home/navigation layout failed at " + width + "px: " + JSON.stringify({ ...result, labelsFit }));
  }
}

async function checkAppLikeMobileShell(page, width) {
  if (width > 430) return;
  const originalHeight = 900;
  for (const height of [568, 667]) {
    await page.setViewportSize({ width, height });
    const result = await page.evaluate(() => {
      const app = document.querySelector("#app");
      const nav = document.querySelector(".footer-nav");
      const navRect = nav?.getBoundingClientRect();
      const appRect = app?.getBoundingClientRect();
      const lastTile = document.querySelector("#app .home-grid .tile:last-child")?.getBoundingClientRect();
      const bodyStyle = getComputedStyle(document.body);
      const appStyle = getComputedStyle(app);
      return {
        viewportHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        bodyHeight: document.body.getBoundingClientRect().height,
        bodyOverflowY: bodyStyle.overflowY,
        bodyDisplay: bodyStyle.display,
        appOverflowY: appStyle.overflowY,
        appFitsHome: !!app && app.scrollHeight <= app.clientHeight + 2,
        homeTilesAboveNavigation: !!lastTile && !!navRect && lastTile.bottom <= navRect.top - 4,
        navigationFixed: !!nav && getComputedStyle(nav).position === "fixed",
        navigationWithinViewport: !!navRect && navRect.top >= 0 && navRect.bottom <= window.innerHeight + 1,
        appViewport: appRect ? { top: appRect.top, bottom: appRect.bottom, height: appRect.height } : null
      };
    });
    const passed = result.documentHeight <= height + 2
      && result.bodyHeight <= height + 2
      && result.bodyOverflowY === "hidden"
      && result.bodyDisplay === "flex"
      && result.appOverflowY === "auto"
      && result.appFitsHome
      && result.homeTilesAboveNavigation
      && result.navigationFixed
      && result.navigationWithinViewport;
    viewportResults.push({ width, height, screen: "app-like-mobile-shell", passed, ...result });
    if (!passed) throw new Error("App-like mobile shell failed at " + width + "x" + height + ": " + JSON.stringify(result));
  }
  await page.setViewportSize({ width, height: originalHeight });
}

async function checkLastContentClearsNavigation(page, width, screen, selector) {
  if (width > 600) return;
  const result = await page.evaluate(async selector => {
    const app = document.querySelector("#app");
    const nav = document.querySelector(".footer-nav");
    const last = document.querySelector(selector);
    if (!app || !nav || !last) return { foundApp: !!app, foundNav: !!nav, foundLast: !!last };
    /* The active screen can contain nested scrollable regions. Drive the app's
       designated scroll container directly so this assertion tests the actual shell. */
    app.scrollTop = app.scrollHeight;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const lastRect = last.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    return {
      foundApp: true, foundNav: true, foundLast: true,
      lastBottom: lastRect.bottom, navTop: navRect.top,
      lastClearsNavigation: lastRect.bottom <= navRect.top - 4,
      appCanScroll: app.scrollHeight > app.clientHeight,
      appScrollTop: app.scrollTop,
      appScrollHeight: app.scrollHeight,
      appClientHeight: app.clientHeight,
      appBottom: app.getBoundingClientRect().bottom
    };
  }, selector);
  const passed = result.foundApp && result.foundNav && result.foundLast && result.lastClearsNavigation;
  viewportResults.push({ width, screen, passed, ...result });
  if (!passed) throw new Error(`${screen} final content is obscured by bottom navigation at ${width}px: ${JSON.stringify(result)}`);
}

async function enterGuestFlow(page) {
  // Wait for Firebase's initial auth-state callback so its guest-mode refresh
  // cannot rerender onboarding in the middle of the name-entry interaction.
  await page.waitForFunction(
    () => window.cloudStatus === "signed out" || window.fbStatus === "Firebase: failed to load",
    { timeout: 15000 }
  );
  const start = page.getByRole("button", { name: /let's start/i });
  if (await start.isVisible().catch(() => false)) await start.click();
  const guest = page.getByRole("button", { name: /skip, continue as guest/i });
  if (await guest.isVisible().catch(() => false)) await guest.click();
  const name = page.locator("#nm");
  if (await name.isVisible().catch(() => false)) await name.fill("QA Kid");
  const finish = page.getByRole("button", { name: /start learning/i });
  if (await finish.isVisible().catch(() => false)) await finish.click();
  await page.getByRole("button", { name: /alphabets/i }).first().waitFor({ state: "visible", timeout: 15000 });
  if (!(await page.locator("#kid").innerText()).includes("QA Kid")) {
    throw new Error("Guest onboarding did not save the configured child name before reload");
  }
}

try {
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    page.on("pageerror", error => errors.push({ width, type: "pageerror", message: error.message, stack: error.stack || "" }));
    page.on("console", message => {
      if (message.type() !== "error") return;
      const text = message.text();
      // CI intentionally runs in guest mode without the production Google OAuth
      // origin allowlist. Ignore only known Google Identity / blocked auth noise;
      // application JavaScript errors remain fatal.
      if (/\\[GSI_LOGGER\\].*origin is not allowed/i.test(text)) return;
      if (/Failed to load resource: the server responded with a status of 403/i.test(text)) return;
      errors.push({ width, type: "console", message: text });
    });
    page.on("requestfailed", request => {
      const failed = request.failure()?.errorText || "request failed";
      if (!/accounts\.google\.com|googleapis\.com|gstatic\.com/.test(request.url())) {
        errors.push({ width, type: "requestfailed", url: request.url(), message: failed });
      }
    });

    await waitForExpectedDeployment(page, width);
    const title = await page.title();
    if (!title.includes("Little Learners")) throw new Error("Unexpected page title: " + title);
    await checkOverflow(page, width, "welcome");
    await checkInteractiveControls(page, width, "welcome");
    await page.screenshot({ path: path.join(out, `ui-${width}-welcome.png`), fullPage: true });

    await enterGuestFlow(page);
    await checkOverflow(page, width, "home");
    await checkInteractiveControls(page, width, "home");
    const tiles = page.locator("#app .tile");
    if (await tiles.count() < 7) throw new Error("Expected all learning categories on home");
    await checkCompactHomeAndNavigation(page, width);
    await checkAppLikeMobileShell(page, width);
    await page.screenshot({ path: path.join(out, `ui-${width}-home.png`), fullPage: true });

    await page.getByRole("button", { name: /alphabets/i }).first().click();
    await page.locator("#app .card").first().waitFor({ state: "visible", timeout: 10000 });
    await checkOverflow(page, width, "category");
    await checkLastContentClearsNavigation(page, width, "alphabet-final-card", "#app .card:last-child");
    const categoryWrap = await page.locator(".category-title").evaluate(element => ({ overflowWrap: getComputedStyle(element).overflowWrap, wordBreak: getComputedStyle(element).wordBreak }));
    if (categoryWrap.overflowWrap === "anywhere" || categoryWrap.wordBreak === "break-all") throw new Error("Category heading can split words on narrow screens: " + JSON.stringify(categoryWrap));
    await checkInteractiveControls(page, width, "category");
    await page.screenshot({ path: path.join(out, `ui-${width}-category.png`), fullPage: true });
    if (await page.locator("#app .card").count() < 20) throw new Error("Alphabet learning cards did not render");
    await page.getByRole("button", { name: /play/i }).click();
    await page.locator("#app .opt").first().waitFor({ state: "visible", timeout: 10000 });
    if (await page.locator("#app .opt").count() !== 3) throw new Error("Quiz did not render three answer choices");
    await checkOverflow(page, width, "quiz");
    await checkInteractiveControls(page, width, "quiz");
    await page.screenshot({ path: path.join(out, `ui-${width}-quiz.png`), fullPage: true });
    const correctIndex = await page.evaluate(() => {
      const target = q.t.e;
      return [...document.querySelectorAll("#app .opt")].findIndex(button => button.textContent === target);
    });
    if (correctIndex < 0) throw new Error("Quiz answer matching the prompt was not found");
    await page.locator("#app .opt").nth(correctIndex).click();
    await page.getByText(/great job|new sticker/i).waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(150);
    if (!(await page.locator("#stars").innerText()).includes("1")) throw new Error("Correct quiz answer did not award a star");
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await page.locator("#app .tile").first().waitFor({ state: "visible", timeout: 15000 });
    if (!(await page.locator("#kid").innerText()).includes("QA Kid")) throw new Error("Guest profile did not persist after reload");
    if (!(await page.locator("#stars").innerText()).includes("1")) throw new Error("Guest progress did not persist after reload");
    await checkOverflow(page, width, "home-after-reload");
    await checkInteractiveControls(page, width, "home-after-reload");

    await page.getByRole("button", { name: /stickers/i }).click();
    await page.getByText(/my stickers/i).waitFor({ state: "visible", timeout: 10000 });
    await checkOverflow(page, width, "stickers");
    await checkInteractiveControls(page, width, "stickers");
    await page.screenshot({ path: path.join(out, `ui-${width}-stickers.png`), fullPage: true });

    await page.getByRole("button", { name: /open parent settings|parents/i }).first().click();
    const equation = (await page.locator("#app .big").innerText()).match(/(\d+)\s*\+\s*(\d+)/);
    if (!equation) throw new Error("Parent gate arithmetic challenge did not render");
    const answer = Number(equation[1]) + Number(equation[2]);
    await page.locator("#app .opt").filter({ hasText: new RegExp("^" + answer + "$") }).first().click();
    await page.getByText(/parent corner/i).waitFor({ state: "visible", timeout: 10000 });
    await page.getByText(/who is playing/i).waitFor({ state: "visible", timeout: 10000 });
    await checkOverflow(page, width, "parent-settings");
    await checkInteractiveControls(page, width, "parent-settings");
    await checkLastContentClearsNavigation(page, width, "parent-settings-final-control", "#app button:last-of-type");
    if (width <= 600) {
      const sync = page.locator("#app .sync-status");
      // Guest-mode CI has no authenticated cloud account, so the cloud-sync
      // card is intentionally absent. Validate it when the app actually renders it.
      if (await sync.count()) {
        await sync.first().waitFor({ state: "visible", timeout: 5000 });
        const syncText = await sync.first().textContent();
        for (const text of ["Cloud sync", "Last successful sync", "Automatic check"]) {
          if (!syncText.includes(text)) throw new Error("Cloud sync status is missing: " + text);
        }
        const syncLayout = await sync.first().evaluate(element => {
          const rect = element.getBoundingClientRect();
          const styles = getComputedStyle(element);
          return { width: rect.width, right: rect.right, viewport: innerWidth, display: styles.display };
        });
        if (syncLayout.right > syncLayout.viewport + 1 || syncLayout.width <= 0) throw new Error("Cloud sync status overflows mobile viewport: " + JSON.stringify(syncLayout));
      }
    }
    await page.screenshot({ path: path.join(out, `ui-${width}-parent.png`), fullPage: true });

    await page.close();
  }
} catch (error) {
  errors.push({ type: "navigation-or-assertion", message: error.message, stack: error.stack || "" });
} finally {
  fs.writeFileSync(path.join(out, "browser-errors.json"), JSON.stringify({ baseUrl, viewportResults, errors }, null, 2));
  await browser.close();
}

console.log(JSON.stringify({ viewportResults, errorCount: errors.length, errors }, null, 2));
if (errors.some(e => e.type === "pageerror" || e.type === "navigation-or-assertion" || /getContext|Uncaught TypeError/i.test(e.message || ""))) process.exitCode = 1;
if (viewportResults.some(v => !v.passed)) process.exitCode = 1;
