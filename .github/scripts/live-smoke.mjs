import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const url = "https://srma4tech.github.io/little-learners/?ci-smoke=" + Date.now();
const out = "artifacts";
fs.mkdirSync(out, { recursive: true });
const errors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.on("pageerror", error => errors.push({ type: "pageerror", message: error.message, stack: error.stack || "" }));
page.on("console", message => {
  if (message.type() === "error") errors.push({ type: "console", message: message.text() });
});
page.on("requestfailed", request => {
  const failed = request.failure()?.errorText || "request failed";
  if (!request.url().includes("accounts.google.com") && !request.url().includes("googleapis.com")) {
    errors.push({ type: "requestfailed", url: request.url(), message: failed });
  }
});
let pageTitle = "";
let bodyText = "";
const checks = [];
try {
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  if (!response || !response.ok()) throw new Error("Site returned HTTP " + (response?.status() ?? "no response"));
  await page.waitForTimeout(5000);
  pageTitle = await page.title();
  bodyText = await page.locator("body").innerText();

  const app = page.locator("#app");
  if (await app.count() !== 1) throw new Error("Expected exactly one #app learning container");
  await page.waitForFunction(() => {
    const root = document.querySelector("#app");
    return !!root && root.innerText.trim().length > 0;
  }, { timeout: 15000 });
  checks.push({ name: "app-container-rendered", passed: true });

  const startButton = page.getByRole("button", { name: /let's start/i });
  if (await startButton.isVisible().catch(() => false)) {
    checks.push({ name: "welcome-onboarding-visible", passed: true });
  } else {
    const homeOrLearning = /Alphabets|Varnamala|Numbers|Who is playing\?|Who is learning\?/i.test(bodyText);
    if (!homeOrLearning) throw new Error("App container rendered, but no expected learning/onboarding content was found");
    checks.push({ name: "learning-or-onboarding-content-visible", passed: true });
  }

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  checks.push({ name: "no-mobile-horizontal-overflow", passed: !horizontalOverflow });
  if (horizontalOverflow) throw new Error("Mobile viewport has horizontal page overflow");

  await page.screenshot({ path: path.join(out, "live-home.png"), fullPage: true });
} catch (error) {
  errors.push({ type: "navigation", message: error.message, stack: error.stack || "" });
  try { await page.screenshot({ path: path.join(out, "live-home-failure.png"), fullPage: true }); } catch {}
}
fs.writeFileSync(path.join(out, "browser-errors.json"), JSON.stringify({ url, pageTitle, bodyText, checks, errors }, null, 2));
await browser.close();
console.log(JSON.stringify({ url, pageTitle, bodyText: bodyText.slice(0, 1000), checks, errorCount: errors.length, errors }, null, 2));
if (!pageTitle.includes("Little Learners")) process.exitCode = 1;
if (errors.some(e => e.type === "pageerror" || /getContext|Uncaught TypeError/i.test(e.message || ""))) process.exitCode = 1;
