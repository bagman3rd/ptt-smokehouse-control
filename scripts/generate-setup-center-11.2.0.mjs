#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BUILD = "11.2.0";
const root = process.cwd();
const appRoot = path.join(root, "app");
const contractPath = path.join(root, "config", "ptt-master-data-contract-11.2.0.json");

if (!fs.existsSync(appRoot)) {
  console.error("FAIL — app directory not found.");
  process.exit(1);
}
if (!fs.existsSync(contractPath)) {
  console.error("FAIL — master-data contract not found.");
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const extensions = ["js", "jsx", "ts", "tsx"];

function walk(dir) {
  const rows = [];
  if (!fs.existsSync(dir)) return rows;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) rows.push(...walk(full));
    else if (entry.isFile()) rows.push(full);
  }
  return rows;
}

function segment(value) {
  if (/^\([^)]*\)$/.test(value) || value.startsWith("@")) return "";
  const optional = value.match(/^\[\[\.\.\.(.+)\]\]$/);
  if (optional) return `*?${optional[1]}`;
  const catchAll = value.match(/^\[\.\.\.(.+)\]$/);
  if (catchAll) return `*${catchAll[1]}`;
  const dynamic = value.match(/^\[(.+)\]$/);
  if (dynamic) return `:${dynamic[1]}`;
  return value;
}

function routeFromPage(file) {
  const rel = path.relative(appRoot, file).split(path.sep);
  rel.pop();
  const parts = rel.map(segment).filter(Boolean);
  return `/${parts.join("/")}`.replace(/\/+/g, "/") || "/";
}

const routes = [...new Set(
  walk(appRoot)
    .filter((file) => extensions.some((ext) => file.endsWith(`/page.${ext}`) || file.endsWith(`\\page.${ext}`)))
    .map(routeFromPage)
)].sort();

const preferred = {
  restaurant: ["/admin/restaurant", "/admin/restaurants", "/admin/settings", "/onboarding"],
  locations: ["/admin/locations", "/admin/location", "/onboarding"],
  products: ["/admin/products", "/admin/catalog", "/products"],
  units: ["/admin/products", "/admin/catalog", "/admin/settings"],
  smokers: ["/admin/smokers", "/smokers"],
  cookWindows: ["/admin/smokers", "/admin/equipment", "/admin/schedule"],
  roles: ["/admin/users", "/admin/roles", "/admin/team", "/users"],
  onboarding: ["/onboarding", "/admin/onboarding", "/setup"]
};

function selectRoute(capability) {
  const exact = (preferred[capability.id] || []).find((candidate) => routes.includes(candidate));
  if (exact) return exact;
  const tokenMatch = routes.find((route) =>
    capability.routeTokens.some((token) => route.toLowerCase().includes(token.toLowerCase()))
  );
  return tokenMatch || "";
}

const sections = contract.requiredCapabilities.map((capability) => {
  const href = selectRoute(capability);
  return {
    id: capability.id,
    title: capability.label,
    status: href ? "AVAILABLE" : "REVIEW REQUIRED",
    href,
    note: href
      ? `Detected application route: ${href}`
      : "No matching route was detected. Review the Build 11.2.0 capability map before release."
  };
});

let routeDir = path.join(appRoot, "admin", "setup-center");
let routePath = "/admin/setup-center";
const existingPage = path.join(routeDir, "page.tsx");
if (fs.existsSync(existingPage)) {
  const existing = fs.readFileSync(existingPage, "utf8");
  if (!existing.includes("BUILD_11_2_0_GENERATED")) {
    routeDir = path.join(appRoot, "admin", "setup-center-1120");
    routePath = "/admin/setup-center-1120";
  }
}
fs.mkdirSync(routeDir, { recursive: true });

const page = `// BUILD_11_2_0_GENERATED
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup Center | PTT Smokehouse Control",
  description: "Build 11.2.0 setup and master-data readiness center."
};

const sections = ${JSON.stringify(sections, null, 2)} as const;

const operatingRules = ${JSON.stringify(contract.operatingRules, null, 2)} as const;

export default function SetupCenterPage() {
  const available = sections.filter((section) => section.href).length;
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 18px 56px" }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Build ${BUILD}
        </p>
        <h1 style={{ margin: "8px 0 10px", fontSize: "clamp(2rem, 5vw, 3.4rem)", lineHeight: 1.04 }}>
          Setup and Master Data
        </h1>
        <p style={{ maxWidth: 820, fontSize: 18, lineHeight: 1.55 }}>
          Configure and validate the restaurant, location, products, units, smokers, cook windows and roles
          through approved application workflows. Direct database editing is not an accepted setup method.
        </p>
        <p style={{ fontWeight: 800 }}>{available} of {sections.length} setup capabilities have a detected application route.</p>
      </header>

      <section aria-labelledby="setup-capabilities">
        <h2 id="setup-capabilities">Setup capabilities</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {sections.map((section) => (
            <article
              key={section.id}
              style={{
                border: "1px solid currentColor",
                borderRadius: 16,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                minHeight: 190
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.06em" }}>{section.status}</span>
              <h3 style={{ margin: 0 }}>{section.title}</h3>
              <p style={{ margin: 0, lineHeight: 1.5, flexGrow: 1 }}>{section.note}</p>
              {section.href ? (
                <Link href={section.href} style={{ fontWeight: 900 }}>
                  Open {section.title}
                </Link>
              ) : (
                <span aria-label={\`\${section.title} route is not currently detected\`} style={{ fontWeight: 800 }}>
                  Route not detected
                </span>
              )}
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="operating-baseline" style={{ marginTop: 32 }}>
        <h2 id="operating-baseline">PTT operating baseline</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "minmax(170px, 260px) 1fr", gap: "10px 18px" }}>
          <dt style={{ fontWeight: 900 }}>Timezone</dt><dd style={{ margin: 0 }}>{operatingRules.timezone}</dd>
          <dt style={{ fontWeight: 900 }}>Service hours</dt><dd style={{ margin: 0 }}>{operatingRules.serviceHours.open}–{operatingRules.serviceHours.close}, daily</dd>
          <dt style={{ fontWeight: 900 }}>Carryover lookback</dt><dd style={{ margin: 0 }}>{operatingRules.carryoverLookbackDays} days visible; prior-day credit only</dd>
          <dt style={{ fontWeight: 900 }}>Sunday rule</dt><dd style={{ margin: 0 }}>{operatingRules.sundayPlanningRule}</dd>
        </dl>
      </section>

      <section aria-labelledby="completion-rule" style={{ marginTop: 32 }}>
        <h2 id="completion-rule">Completion rule</h2>
        <p style={{ lineHeight: 1.6 }}>
          Build ${BUILD} is complete only after the fresh-tenant UAT workbook passes in staging,
          every required capability is configured without direct database edits, role restrictions are verified,
          and release evidence is tied to the exact deployed revision.
        </p>
      </section>
    </main>
  );
}
`;

fs.writeFileSync(path.join(routeDir, "page.tsx"), page, "utf8");

const artifactDir = path.join(root, "artifacts", "build-11.2.0");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "setup-center-route.json"),
  `${JSON.stringify({ buildVersion: BUILD, route: routePath, sections, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  "utf8"
);

console.log(`PASS — generated Build ${BUILD} Setup Center at ${routePath}`);
