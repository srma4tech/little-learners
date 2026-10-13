import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = "https://srma4tech.github.io/little-learners/";
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

async function enterGuestFlow(page) {
  const start = page.getByRole("button", { name: /let's start/i });
  if (await start.isVisible().catch(() => false)) await start.click();
  const guest = page.getByRole("button", { name: /skip, continue as guest/i });
  if (await guest.isVisible().catch(() => false)) await guest.click();
  const name = page.locator("#nm");
  if (await name.isVisible().catch(() => false)) await name.fill("QA Kid");
  const finish = page.getByRole("button", { name: /start learning/i });
  if (await finish.isVisible().catch(() => false)) await finish.click();
  await page.getByRole("button", { name: /alphabets/i }).first().waitFor({ state: "visible", timeout: 15000 });
}

try {
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    page.on("pageerror", error => errors.push({ width, type: "pageerror", message: error.message, stack: error.stack || "" }));
    page.on("console", message => {
      if (message.type() === "error") errors.push({ width, type: "console", message: message.text() });
    });
    page.on("requestfailed", request => {
      const failed = request.failure()?.errorText || "request failed";
      if (!/accounts\.google\.com|googleapis\.com|gstatic\.com/.test(request.url())) {
        errors.push({ width, type: "requestfailed", url: request.url(), message: failed });
      }
    });

    const url = baseUrl + "?ci-smoke=" + Date.now() + "-" + width;
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (!response || !response.ok()) throw new Error("Site returned HTTP " + (response?.status() ?? "no response"));
    await page.locator("#app").waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(() => !!document.querySelector("#app")?.innerText.trim(), { timeout: 15000 });
    const title = await page.title();
    if (!title.includes("Little Learners")) throw new Error("Unexpected page title: " + title);
    await checkOverflow(page, width, "welcome");

    await enterGuestFlow(page);
    await checkOverflow(page, width, "home");
    const tiles = page.locator("#app .tile");
    if (await tiles.count() < 7) throw new Error("Expected all learning categories on home");
    await page.screenshot({ path: path.join(out, `ui-${width}-home.png`), fullPage: true });

    await page.getByRole("button", { name: /alphabets/i }).first().click();
    await page.locator("#app .card").first().waitFor({ state: "visible", timeout: 10000 });
    await checkOverflow(page, width, "category");
    if (await page.locator("#app .card").count() < 20) throw new Error("Alphabet learning cards did not render");
    await page.getByRole("button", { name: /play/i }).click();
    await page.locator("#app .opt").first().waitFor({ state: "visible", timeout: 10000 });
    if (await page.locator("#app .opt").count() !== 3) throw new Error("Quiz did not render three answer choices");
    await checkOverflow(page, width, "quiz");
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

    await page.getByRole("button", { name: /back/i }).click();
    await page.getByRole("button", { name: /open stickers/i }).click();
    await page.getByText(/my stickers/i).waitFor({ state: "visible", timeout: 10000 });
    await checkOverflow(page, width, "stickers");

    await page.getByRole("button", { name: /open parent settings/i }).first().click();
    const equation = (await page.locator("#app .big").innerText()).match(/(\d+)\s*\+\s*(\d+)/);
    if (!equation) throw new Error("Parent gate arithmetic challenge did not render");
    const answer = Number(equation[1]) + Number(equation[2]);
    await page.locator("#app .opt").filter({ hasText: new RegExp("^" + answer + "$") }).first().click();
    await page.getByText(/parent corner/i).waitFor({ state: "visible", timeout: 10000 });
    await page.getByText(/who is playing/i).waitFor({ state: "visible", timeout: 10000 });
    await checkOverflow(page, width, "parent-settings");
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
