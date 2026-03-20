import { chromium, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://renearavena.starter.buk.cl";
const OUTPUT_DIR = path.join(__dirname, "output");

interface EmployeeField {
  section: string;
  label: string;
  name: string;
  type: string;
  required: boolean;
  options?: string[];
  value?: string;
}

interface EmployeeStructure {
  timestamp: string;
  personalDataFields: EmployeeField[];
  contractFields: EmployeeField[];
  payrollFields: EmployeeField[];
  attendanceFields: EmployeeField[];
  documentsFields: EmployeeField[];
  tabs: string[];
  allFields: EmployeeField[];
}

async function login(page: Page): Promise<boolean> {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });

  // Step 1: Email
  const emailInput = await page.$('input[name="user[email]"], #user_email, input[type="email"]');
  if (!emailInput) return false;

  await emailInput.fill(process.env.BUK_EMAIL || "manuel.aravenal@gmail.com");
  const nextBtn = await page.$('input[type="submit"], button[type="submit"]');
  if (nextBtn) await nextBtn.click();

  await page.waitForLoadState("networkidle", { timeout: 30000 });
  await page.waitForTimeout(3000);

  // Step 2: Password
  const passwordInput = await page.$('input[type="password"], input[name="user[password]"], #user_password');
  if (!passwordInput) return false;

  await passwordInput.fill(process.env.BUK_PASSWORD || "campero440");
  const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
  if (submitBtn) await submitBtn.click();

  await page.waitForLoadState("networkidle", { timeout: 30000 });
  await page.waitForTimeout(3000);

  return !page.url().includes("sign_in") && !page.url().includes("login");
}

async function extractFieldsFromPage(
  page: Page,
  section: string
): Promise<EmployeeField[]> {
  return await page.evaluate((sectionName: string) => {
    const fields: EmployeeField[] = [];

    // Extract from form inputs
    document
      .querySelectorAll("input, select, textarea")
      .forEach((input: Element) => {
        const el = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        const name = el.getAttribute("name") || "";
        const id = el.getAttribute("id") || "";
        const type = el.getAttribute("type") || el.tagName.toLowerCase();
        const required =
          el.hasAttribute("required") ||
          el.getAttribute("aria-required") === "true";
        const placeholder = el.getAttribute("placeholder") || "";

        // Find label
        let label = "";
        const labelEl = el.closest("label") || (id ? document.querySelector(`label[for="${id}"]`) : null);
        if (labelEl) label = labelEl.textContent?.trim() || "";
        if (!label) {
          const wrapper = el.closest(".form-group, .field, .input-wrapper, [class*='field']");
          if (wrapper) {
            const wrapperLabel = wrapper.querySelector("label, .label, [class*='label']");
            if (wrapperLabel) label = wrapperLabel.textContent?.trim() || "";
          }
        }
        if (!label) label = placeholder;

        // Get select options
        let options: string[] | undefined;
        if (el.tagName === "SELECT") {
          options = [];
          (el as HTMLSelectElement).querySelectorAll("option").forEach((opt) => {
            const val = opt.textContent?.trim() || "";
            if (val) options!.push(val);
          });
        }

        // Get current value
        const value = el.value || "";

        if (name || label || id) {
          fields.push({
            section: sectionName,
            label: label || name || id,
            name: name || id,
            type,
            required,
            options,
            value: type === "password" ? "***" : value,
          });
        }
      });

    // Also extract read-only display fields (common in Buk employee views)
    document
      .querySelectorAll(
        ".detail-row, .info-row, [class*='detail'], [class*='field-display'], dl dt, .data-pair"
      )
      .forEach((row) => {
        const label =
          row.querySelector(
            ".label, dt, [class*='label'], [class*='key']"
          )?.textContent?.trim() || "";
        const value =
          row.querySelector(
            ".value, dd, [class*='value'], [class*='data']"
          )?.textContent?.trim() || "";
        if (label) {
          fields.push({
            section: sectionName,
            label,
            name: label.toLowerCase().replace(/\s+/g, "_"),
            type: "display",
            required: false,
            value,
          });
        }
      });

    return fields;
  }, section);
}

async function navigateToEmployeeSection(page: Page): Promise<string[]> {
  // Try to find the People/Employees section
  const peopleSelectors = [
    'a[href*="people"]',
    'a[href*="personas"]',
    'a[href*="employees"]',
    'a[href*="colaboradores"]',
    'a:has-text("Personas")',
    'a:has-text("Colaboradores")',
    'a:has-text("People")',
  ];

  for (const sel of peopleSelectors) {
    const link = await page.$(sel);
    if (link) {
      console.log(`[NAV] Found people section: ${sel}`);
      await link.click();
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      await page.waitForTimeout(2000);
      break;
    }
  }

  // Get list of employees
  const employees = await page.evaluate(() => {
    const links: string[] = [];
    document.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (
        href.includes("/people/") ||
        href.includes("/employees/") ||
        href.includes("/colaboradores/")
      ) {
        links.push(href);
      }
    });
    return [...new Set(links)];
  });

  return employees;
}

async function scrapeEmployeeTabs(page: Page): Promise<string[]> {
  // Find all tabs in employee detail view
  return await page.evaluate(() => {
    const tabs: string[] = [];
    document
      .querySelectorAll(
        '.tab, [role="tab"], .nav-tab, .tabs a, [class*="tab-item"], .tab-link'
      )
      .forEach((tab) => {
        const text = tab.textContent?.trim() || "";
        const href =
          tab.getAttribute("href") ||
          tab.getAttribute("data-target") ||
          "";
        if (text) tabs.push(`${text} -> ${href}`);
      });
    return tabs;
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "es-CL",
  });
  const page = await context.newPage();

  // Track API calls
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (
      url.includes("/api/") ||
      url.includes(".json") ||
      request.resourceType() === "xhr" ||
      request.resourceType() === "fetch"
    ) {
      if (!url.includes("assets")) {
        apiCalls.push(`${request.method()} ${url}`);
      }
    }
  });

  console.log("=== BUK EMPLOYEE STRUCTURE SCRAPER ===\n");

  const loggedIn = await login(page);
  if (!loggedIn) {
    console.log("Login failed!");
    await browser.close();
    return;
  }

  console.log("[OK] Logged in\n");

  // Navigate to employees
  const employeeLinks = await navigateToEmployeeSection(page);
  console.log(`[EMPLOYEES] Found ${employeeLinks.length} employee links`);

  const allFields: EmployeeField[] = [];
  const allTabs: string[] = [];

  // Visit first employee to extract structure
  if (employeeLinks.length > 0) {
    const firstEmployee = employeeLinks[0].startsWith("http")
      ? employeeLinks[0]
      : `${BASE_URL}${employeeLinks[0]}`;

    console.log(`[EMPLOYEE] Visiting: ${firstEmployee}`);
    await page.goto(firstEmployee, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, "screenshots", "employee-detail.png"),
      fullPage: true,
    });

    // Get tabs
    const tabs = await scrapeEmployeeTabs(page);
    console.log(`[TABS] Found ${tabs.length} tabs:`, tabs);
    allTabs.push(...tabs);

    // Extract fields from main view
    const mainFields = await extractFieldsFromPage(page, "main");
    allFields.push(...mainFields);

    // Click each tab and extract fields
    const tabElements = await page.$$(
      '.tab, [role="tab"], .nav-tab, .tabs a, [class*="tab-item"]'
    );
    for (const tabEl of tabElements) {
      const tabName = (await tabEl.textContent())?.trim() || "unknown";
      console.log(`[TAB] Clicking: ${tabName}`);

      try {
        await tabEl.click();
        await page.waitForLoadState("networkidle", { timeout: 10000 });
        await page.waitForTimeout(1500);

        const tabFields = await extractFieldsFromPage(page, tabName);
        allFields.push(...tabFields);

        await page.screenshot({
          path: path.join(
            OUTPUT_DIR,
            "screenshots",
            `employee-tab-${tabName.replace(/\s+/g, "-")}.png`
          ),
          fullPage: true,
        });
      } catch (error) {
        console.log(`[TAB] Error on tab ${tabName}: ${error}`);
      }
    }
  }

  // Also try to navigate to payroll/remuneraciones section
  const payrollSelectors = [
    'a[href*="payroll"]',
    'a[href*="remuneraciones"]',
    'a[href*="liquidacion"]',
    'a:has-text("Remuneraciones")',
    'a:has-text("Liquidaciones")',
  ];

  for (const sel of payrollSelectors) {
    const link = await page.$(sel);
    if (link) {
      console.log(`[PAYROLL] Found payroll section: ${sel}`);
      await link.click();
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      await page.waitForTimeout(2000);

      const payrollFields = await extractFieldsFromPage(page, "payroll");
      allFields.push(...payrollFields);

      await page.screenshot({
        path: path.join(OUTPUT_DIR, "screenshots", "payroll-section.png"),
        fullPage: true,
      });
      break;
    }
  }

  // Try attendance section
  const attendanceSelectors = [
    'a[href*="attendance"]',
    'a[href*="asistencia"]',
    'a:has-text("Asistencia")',
  ];

  for (const sel of attendanceSelectors) {
    const link = await page.$(sel);
    if (link) {
      console.log(`[ATTENDANCE] Found attendance section: ${sel}`);
      await link.click();
      await page.waitForLoadState("networkidle", { timeout: 15000 });
      await page.waitForTimeout(2000);

      const attendanceFields = await extractFieldsFromPage(page, "attendance");
      allFields.push(...attendanceFields);

      await page.screenshot({
        path: path.join(OUTPUT_DIR, "screenshots", "attendance-section.png"),
        fullPage: true,
      });
      break;
    }
  }

  // Compile and save
  const structure: EmployeeStructure = {
    timestamp: new Date().toISOString(),
    personalDataFields: allFields.filter((f) =>
      ["main", "personal", "datos personales"].includes(f.section.toLowerCase())
    ),
    contractFields: allFields.filter((f) =>
      f.section.toLowerCase().includes("contrat")
    ),
    payrollFields: allFields.filter((f) =>
      ["payroll", "remuneraciones", "liquidacion"].some((s) =>
        f.section.toLowerCase().includes(s)
      )
    ),
    attendanceFields: allFields.filter((f) =>
      ["attendance", "asistencia"].some((s) =>
        f.section.toLowerCase().includes(s)
      )
    ),
    documentsFields: allFields.filter((f) =>
      f.section.toLowerCase().includes("document")
    ),
    tabs: allTabs,
    allFields,
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "employee-structure.json"),
    JSON.stringify(structure, null, 2)
  );

  // Save API calls
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "employee-api-calls.json"),
    JSON.stringify([...new Set(apiCalls)], null, 2)
  );

  // Generate summary
  let summary = `# Employee Data Structure Analysis\n\n`;
  summary += `Generated: ${structure.timestamp}\n\n`;

  summary += `## Tabs Found (${structure.tabs.length})\n`;
  structure.tabs.forEach((t) => (summary += `- ${t}\n`));

  summary += `\n## All Fields (${allFields.length})\n\n`;

  const sections = [...new Set(allFields.map((f) => f.section))];
  for (const section of sections) {
    const sectionFields = allFields.filter((f) => f.section === section);
    summary += `### ${section} (${sectionFields.length} fields)\n`;
    summary += `| Label | Name | Type | Required | Options |\n`;
    summary += `|-------|------|------|----------|--------|\n`;
    sectionFields.forEach((f) => {
      summary += `| ${f.label} | ${f.name} | ${f.type} | ${f.required} | ${f.options?.join(", ") || "-"} |\n`;
    });
    summary += `\n`;
  }

  summary += `\n## API Calls Intercepted (${apiCalls.length})\n`;
  [...new Set(apiCalls)].forEach((a) => (summary += `- ${a}\n`));

  fs.writeFileSync(path.join(OUTPUT_DIR, "employee-analysis.md"), summary);

  console.log(`\n=== COMPLETE ===`);
  console.log(`Total fields: ${allFields.length}`);
  console.log(`API calls: ${apiCalls.length}`);

  await browser.close();
}

main().catch(console.error);
