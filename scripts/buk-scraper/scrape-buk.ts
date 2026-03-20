import { chromium, Browser, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://renearavena.starter.buk.cl";
const OUTPUT_DIR = path.join(__dirname, "output");

interface ScrapedRoute {
  url: string;
  title: string;
  menuSection: string;
  subLinks: string[];
  apiCalls: string[];
  formFields: string[];
  tables: { headers: string[]; rowCount: number }[];
  screenshots: string;
}

interface BukStructure {
  timestamp: string;
  baseUrl: string;
  routes: ScrapedRoute[];
  apiEndpoints: string[];
  navigationMenu: Record<string, string[]>;
}

async function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const screenshotsDir = path.join(OUTPUT_DIR, "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
}

async function login(page: Page): Promise<boolean> {
  console.log("[LOGIN] Navigating to login page...");
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });

  await page.screenshot({
    path: path.join(OUTPUT_DIR, "screenshots", "01-login-page.png"),
    fullPage: true,
  });

  // STEP 1: Enter email (Buk uses two-step login)
  console.log("[LOGIN] Step 1: Entering email...");
  const emailInput = await page.$('input[name="user[email]"], #user_email, input[type="email"]');
  if (!emailInput) {
    console.log("[LOGIN] Could not find email input");
    const html = await page.content();
    fs.writeFileSync(path.join(OUTPUT_DIR, "login-page.html"), html);
    return false;
  }

  await emailInput.fill(process.env.BUK_EMAIL || "manuel.aravenal@gmail.com");

  // Click "Siguiente" button
  const nextBtn = await page.$('input[type="submit"], button[type="submit"]');
  if (nextBtn) {
    console.log("[LOGIN] Clicking 'Siguiente'...");
    await nextBtn.click();
  }

  await page.waitForLoadState("networkidle", { timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, "screenshots", "01b-after-email.png"),
    fullPage: true,
  });

  // STEP 2: Enter password
  console.log("[LOGIN] Step 2: Entering password...");
  const passwordInput = await page.$('input[type="password"], input[name="user[password]"], #user_password');
  if (!passwordInput) {
    console.log("[LOGIN] Could not find password input. Saving page HTML...");
    const html = await page.content();
    fs.writeFileSync(path.join(OUTPUT_DIR, "password-page.html"), html);
    return false;
  }

  await passwordInput.fill(process.env.BUK_PASSWORD || "campero440");

  // Click login/submit button
  const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
  if (submitBtn) {
    console.log("[LOGIN] Clicking login button...");
    await submitBtn.click();
  }

  await page.waitForLoadState("networkidle", { timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, "screenshots", "02-after-login.png"),
    fullPage: true,
  });

  const currentUrl = page.url();
  console.log(`[LOGIN] Current URL after login: ${currentUrl}`);

  const isLoggedIn =
    !currentUrl.includes("sign_in") && !currentUrl.includes("login");
  if (isLoggedIn) {
    console.log("[LOGIN] Login successful!");
  } else {
    console.log("[LOGIN] Login may have failed. Saving page state...");
    const html = await page.content();
    fs.writeFileSync(path.join(OUTPUT_DIR, "after-login.html"), html);
  }

  return isLoggedIn;
}

async function extractNavigationMenu(
  page: Page
): Promise<Record<string, string[]>> {
  console.log("[NAV] Extracting navigation menu...");
  const menu: Record<string, string[]> = {};

  // Extract all navigation links
  const navData = await page.evaluate(() => {
    const result: Record<string, string[]> = {};

    // Try sidebar navigation (common in Buk)
    const sidebarSelectors = [
      "nav",
      ".sidebar",
      ".side-menu",
      '[role="navigation"]',
      ".main-menu",
      "#sidebar",
      ".left-sidebar",
    ];

    for (const sel of sidebarSelectors) {
      const sidebar = document.querySelector(sel);
      if (sidebar) {
        const links = sidebar.querySelectorAll("a");
        const sectionName = sel;
        result[sectionName] = [];
        links.forEach((link) => {
          const href = link.getAttribute("href") || "";
          const text = link.textContent?.trim() || "";
          if (href && text) {
            result[sectionName].push(`${text} -> ${href}`);
          }
        });
      }
    }

    // Also get ALL links on the page
    const allLinks = document.querySelectorAll("a[href]");
    result["all_links"] = [];
    allLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const text = link.textContent?.trim() || "";
      if (href && !href.startsWith("#") && !href.startsWith("javascript")) {
        result["all_links"].push(`${text} -> ${href}`);
      }
    });

    return result;
  });

  return navData;
}

async function interceptApiCalls(page: Page): Promise<string[]> {
  const apiCalls: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (
      url.includes("/api/") ||
      url.includes(".json") ||
      request.resourceType() === "xhr" ||
      request.resourceType() === "fetch"
    ) {
      const method = request.method();
      apiCalls.push(`${method} ${url}`);
    }
  });

  return apiCalls;
}

async function extractTableStructure(
  page: Page
): Promise<{ headers: string[]; rowCount: number }[]> {
  return await page.evaluate(() => {
    const tables: { headers: string[]; rowCount: number }[] = [];
    document.querySelectorAll("table").forEach((table) => {
      const headers: string[] = [];
      table.querySelectorAll("th").forEach((th) => {
        headers.push(th.textContent?.trim() || "");
      });
      const rowCount = table.querySelectorAll("tbody tr").length;
      if (headers.length > 0 || rowCount > 0) {
        tables.push({ headers, rowCount });
      }
    });
    return tables;
  });
}

async function extractFormFields(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const fields: string[] = [];
    const inputs = document.querySelectorAll(
      "input, select, textarea, [contenteditable]"
    );
    inputs.forEach((input) => {
      const name =
        input.getAttribute("name") ||
        input.getAttribute("id") ||
        input.getAttribute("placeholder") ||
        "";
      const type = input.getAttribute("type") || input.tagName.toLowerCase();
      const label = input.closest("label")?.textContent?.trim() || "";
      const ariaLabel = input.getAttribute("aria-label") || "";

      // Try to find associated label
      const id = input.getAttribute("id");
      const associatedLabel = id
        ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim()
        : "";

      if (name || label || ariaLabel || associatedLabel) {
        fields.push(
          `[${type}] name="${name}" label="${label || associatedLabel || ariaLabel}"`
        );
      }
    });
    return fields;
  });
}

async function extractSubLinks(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const links: string[] = [];
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent?.trim() || "";
      if (
        href &&
        !href.startsWith("#") &&
        !href.startsWith("javascript") &&
        !href.startsWith("mailto")
      ) {
        links.push(`${text} -> ${href}`);
      }
    });
    return [...new Set(links)];
  });
}

async function scrapePage(
  page: Page,
  url: string,
  menuSection: string,
  apiCalls: string[]
): Promise<ScrapedRoute> {
  console.log(`[SCRAPE] Visiting: ${url}`);

  const startApiCount = apiCalls.length;

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    console.log(`[SCRAPE] Timeout on ${url}, continuing anyway...`);
  }

  await page.waitForTimeout(2000);

  const title = await page.title();
  const screenshotName = url
    .replace(BASE_URL, "")
    .replace(/\//g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  const screenshotPath = path.join(
    OUTPUT_DIR,
    "screenshots",
    `page_${screenshotName || "home"}.png`
  );

  await page.screenshot({ path: screenshotPath, fullPage: true });

  const newApiCalls = apiCalls.slice(startApiCount);
  const tables = await extractTableStructure(page);
  const formFields = await extractFormFields(page);
  const subLinks = await extractSubLinks(page);

  return {
    url,
    title,
    menuSection,
    subLinks,
    apiCalls: newApiCalls,
    formFields,
    tables,
    screenshots: screenshotPath,
  };
}

async function discoverRoutes(page: Page): Promise<string[]> {
  // Get all internal links from the current page
  const links = await page.evaluate((baseUrl: string) => {
    const allLinks: string[] = [];
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (
        (href.startsWith("/") || href.startsWith(baseUrl)) &&
        !href.includes("sign_out") &&
        !href.includes("logout")
      ) {
        const fullUrl = href.startsWith("/") ? `${baseUrl}${href}` : href;
        allLinks.push(fullUrl);
      }
    });
    return [...new Set(allLinks)];
  }, BASE_URL);

  return links;
}

async function main() {
  await ensureOutputDir();

  console.log("=== BUK PLATFORM SCRAPER ===");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log("");

  const browser = await chromium.launch({
    headless: false, // Set to true for headless mode
    slowMo: 500,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "es-CL",
  });

  const page = await context.newPage();

  // Set up API call interception
  const apiCalls: string[] = [];
  const allApiEndpoints = new Set<string>();

  page.on("request", (request) => {
    const url = request.url();
    const method = request.method();
    if (
      url.includes("/api/") ||
      url.includes(".json") ||
      (request.resourceType() === "xhr" && !url.includes("assets")) ||
      (request.resourceType() === "fetch" && !url.includes("assets"))
    ) {
      const entry = `${method} ${url}`;
      apiCalls.push(entry);
      allApiEndpoints.add(entry);
    }
  });

  // Also capture response data for API calls
  const apiResponses: Record<string, any> = {};
  page.on("response", async (response) => {
    const url = response.url();
    if (
      (url.includes("/api/") || url.includes(".json")) &&
      !url.includes("assets")
    ) {
      try {
        const contentType = response.headers()["content-type"] || "";
        if (contentType.includes("json")) {
          const body = await response.json();
          // Store a sample (first response per endpoint pattern)
          const pattern = url
            .replace(/\/\d+/g, "/:id")
            .replace(/\?.*$/, "");
          if (!apiResponses[pattern]) {
            apiResponses[pattern] = {
              url: url,
              status: response.status(),
              sample: JSON.stringify(body).substring(0, 2000),
            };
          }
        }
      } catch {
        // ignore non-json responses
      }
    }
  });

  // Step 1: Login
  const loggedIn = await login(page);
  if (!loggedIn) {
    console.log("[ERROR] Login failed. Check credentials and selectors.");
    console.log("[INFO] Saved login page HTML for debugging.");
    await browser.close();
    return;
  }

  // Step 2: Extract main navigation
  const navigationMenu = await extractNavigationMenu(page);
  console.log("\n[NAV] Navigation menu extracted:");
  console.log(JSON.stringify(navigationMenu, null, 2).substring(0, 1000));

  // Step 3: Discover all routes
  const discoveredRoutes = await discoverRoutes(page);
  console.log(`\n[ROUTES] Discovered ${discoveredRoutes.length} routes`);

  // Step 4: Visit each route and extract data
  const scrapedRoutes: ScrapedRoute[] = [];
  const visitedUrls = new Set<string>();

  // First scrape the dashboard/home
  const homeRoute = await scrapePage(page, page.url(), "dashboard", apiCalls);
  scrapedRoutes.push(homeRoute);
  visitedUrls.add(page.url());

  // Then visit each discovered route
  for (const route of discoveredRoutes) {
    if (visitedUrls.has(route)) continue;
    if (route.includes("sign_out") || route.includes("logout")) continue;

    visitedUrls.add(route);

    try {
      const routeData = await scrapePage(page, route, "discovered", apiCalls);
      scrapedRoutes.push(routeData);

      // Discover sub-routes from this page
      const subRoutes = await discoverRoutes(page);
      for (const subRoute of subRoutes) {
        if (!visitedUrls.has(subRoute) && !discoveredRoutes.includes(subRoute)) {
          discoveredRoutes.push(subRoute);
        }
      }
    } catch (error) {
      console.log(`[ERROR] Failed to scrape ${route}: ${error}`);
    }

    // Safety: limit to 100 pages
    if (scrapedRoutes.length >= 100) {
      console.log("[LIMIT] Reached 100 pages limit");
      break;
    }
  }

  // Step 5: Compile results
  const structure: BukStructure = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    routes: scrapedRoutes,
    apiEndpoints: [...allApiEndpoints],
    navigationMenu,
  };

  // Save main structure
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "buk-structure.json"),
    JSON.stringify(structure, null, 2)
  );

  // Save API responses
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "api-responses.json"),
    JSON.stringify(apiResponses, null, 2)
  );

  // Save human-readable summary
  let summary = `# BUK Platform Structure Analysis\n`;
  summary += `Generated: ${structure.timestamp}\n`;
  summary += `Base URL: ${structure.baseUrl}\n\n`;

  summary += `## Navigation Menu\n`;
  for (const [section, items] of Object.entries(structure.navigationMenu)) {
    summary += `\n### ${section}\n`;
    items.forEach((item) => (summary += `- ${item}\n`));
  }

  summary += `\n## Discovered Routes (${structure.routes.length})\n`;
  for (const route of structure.routes) {
    summary += `\n### ${route.title || route.url}\n`;
    summary += `- URL: ${route.url}\n`;
    summary += `- Section: ${route.menuSection}\n`;
    if (route.tables.length > 0) {
      summary += `- Tables:\n`;
      route.tables.forEach((t, i) => {
        summary += `  - Table ${i + 1}: ${t.headers.join(", ")} (${t.rowCount} rows)\n`;
      });
    }
    if (route.formFields.length > 0) {
      summary += `- Form Fields:\n`;
      route.formFields.forEach((f) => (summary += `  - ${f}\n`));
    }
    if (route.apiCalls.length > 0) {
      summary += `- API Calls:\n`;
      route.apiCalls.forEach((a) => (summary += `  - ${a}\n`));
    }
  }

  summary += `\n## All API Endpoints (${structure.apiEndpoints.length})\n`;
  structure.apiEndpoints.forEach((ep) => (summary += `- ${ep}\n`));

  summary += `\n## API Response Samples\n`;
  for (const [pattern, data] of Object.entries(apiResponses)) {
    summary += `\n### ${pattern}\n`;
    summary += `- Status: ${data.status}\n`;
    summary += `- Sample: ${data.sample}\n`;
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, "buk-analysis.md"), summary);

  console.log(`\n=== SCRAPING COMPLETE ===`);
  console.log(`Routes scraped: ${scrapedRoutes.length}`);
  console.log(`API endpoints found: ${allApiEndpoints.size}`);
  console.log(`Output saved to: ${OUTPUT_DIR}`);

  await browser.close();
}

main().catch(console.error);
