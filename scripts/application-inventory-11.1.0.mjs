#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";

const BUILD_VERSION = "11.1.0";
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const root = path.resolve(argValue("--root", process.cwd()));
const outDir = path.resolve(root, argValue("--out", "artifacts/build-11.1.0"));
const policyPath = path.resolve(
  root,
  argValue("--policy", "config/application-inventory-policy-11.1.0.json"),
);

if (!fs.existsSync(policyPath)) {
  console.error(`Missing inventory policy: ${policyPath}`);
  process.exit(1);
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
if (policy.buildVersion !== BUILD_VERSION) {
  console.error(`Policy build version ${policy.buildVersion} does not match ${BUILD_VERSION}.`);
  process.exit(1);
}

const toPosix = (value) => value.split(path.sep).join("/");
const relative = (value) => toPosix(path.relative(root, value));
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const now = new Date().toISOString();

const excluded = new Set(policy.excludedDirectories || []);
const sourceExtensions = new Set(policy.sourceExtensions || []);
const integrationProviders = (policy.integrationProviders || []).map((value) => value.toLowerCase());

function isExcluded(fullPath) {
  const rel = relative(fullPath);
  if (!rel || rel === ".") return false;
  const parts = rel.split("/");
  return parts.some((part, index) => {
    const joined = parts.slice(0, index + 1).join("/");
    return excluded.has(part) || excluded.has(joined);
  });
}

function walk(directory) {
  const results = [];
  if (!fs.existsSync(directory)) return results;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (isExcluded(fullPath)) continue;
    if (entry.isDirectory()) results.push(...walk(fullPath));
    else if (entry.isFile()) results.push(fullPath);
  }
  return results;
}

function readText(file) {
  try {
    const stat = fs.statSync(file);
    if (stat.size > 2_500_000) return "";
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(fileName, rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }
  fs.writeFileSync(path.join(outDir, fileName), `${lines.join("\n")}\n`, "utf8");
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/&[a-zA-Z0-9#]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function attributeValue(attrs, name) {
  const patterns = [
    new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"),
    new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i"),
    new RegExp(`${name}\\s*=\\s*\\{\\s*["'\`]([^"'\`]*)["'\`]\\s*\\}`, "i"),
  ];
  for (const pattern of patterns) {
    const match = attrs.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function normalizeSegment(segment) {
  if (!segment || segment === "app" || segment === "pages") return "";
  if (segment.startsWith("@")) return "";
  if (/^\([^)]*\)$/.test(segment)) return "";
  segment = segment.replace(/^\(\.\.\.\)/, "").replace(/^\(\.\.\)/, "").replace(/^\(\.\)/, "");
  const optionalCatchAll = segment.match(/^\[\[\.\.\.(.+)\]\]$/);
  if (optionalCatchAll) return `*?${optionalCatchAll[1]}`;
  const catchAll = segment.match(/^\[\.\.\.(.+)\]$/);
  if (catchAll) return `*${catchAll[1]}`;
  const dynamic = segment.match(/^\[(.+)\]$/);
  if (dynamic) return `:${dynamic[1]}`;
  return segment;
}

function routeFromAppFile(relPath) {
  const parts = relPath.split("/");
  const fileName = parts.pop();
  parts.shift();
  const segments = parts.map(normalizeSegment).filter(Boolean);
  return `/${segments.join("/")}`.replace(/\/+/g, "/") || "/";
}

function routeFromPagesFile(relPath) {
  const parts = relPath.split("/");
  parts.shift();
  let fileName = parts.pop() || "";
  fileName = fileName.replace(/\.(jsx?|tsx?)$/, "");
  if (fileName !== "index") parts.push(fileName);
  const segments = parts.map(normalizeSegment).filter(Boolean);
  return `/${segments.join("/")}`.replace(/\/+/g, "/") || "/";
}

function nearestBoundary(routeFile, boundaryName) {
  const appRoot = path.join(root, "app");
  let current = path.dirname(routeFile);
  while (current.startsWith(appRoot)) {
    for (const extension of ["tsx", "ts", "jsx", "js"]) {
      const candidate = path.join(current, `${boundaryName}.${extension}`);
      if (fs.existsSync(candidate)) return relative(candidate);
    }
    if (current === appRoot) break;
    current = path.dirname(current);
  }
  return "";
}

function extractTitle(content) {
  const h1 = content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return cleanText(h1[1]);
  const metadata = content.match(/title\s*:\s*["'`]([^"'`]+)["'`]/i);
  if (metadata) return metadata[1].trim();
  return "";
}

function extractMethods(content) {
  const methods = new Set();
  for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)) {
    methods.add(match[1]);
  }
  for (const match of content.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=/g)) {
    methods.add(match[1]);
  }
  return [...methods].sort();
}

function extractExportedFunctions(content) {
  const names = new Set();
  for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.add(match[1]);
  for (const match of content.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=/g)) names.add(match[1]);
  return [...names].sort();
}

function extractRoleEvidence(content) {
  const roles = new Set();
  const aliases = {
    ADMIN: ["ADMIN", "admin"],
    OWNER: ["OWNER", "owner"],
    KM: ["KM", "KITCHEN_MANAGER", "kitchen manager"],
    KC: ["KC", "KITCHEN_COORDINATOR", "kitchen coordinator"],
    PITMASTER: ["PITMASTER", "pitmaster"],
    VIEWER: ["VIEWER", "viewer", "READ_ONLY", "read-only"],
  };
  for (const [role, tokens] of Object.entries(aliases)) {
    if (tokens.some((token) => content.toLowerCase().includes(token.toLowerCase()))) roles.add(role);
  }
  for (const match of content.matchAll(/(?:requireRole|hasRole|allowedRoles|roles)\s*\(?\s*\[?([\s\S]{0,240}?)[\]\)]/g)) {
    const block = match[1];
    for (const quoted of block.matchAll(/["'`]([A-Z_]{2,40})["'`]/g)) roles.add(quoted[1]);
  }
  return [...roles].sort();
}

function staticRoutePattern(route) {
  return route
    .replace(/\/:\w+/g, "/[^/]+")
    .replace(/\/\*\?\w+/g, "(?:/.*)?")
    .replace(/\/\*\w+/g, "/.*");
}

function routeCanResolve(target, routeSet) {
  if (!target.startsWith("/")) return true;
  const clean = target.split(/[?#]/)[0] || "/";
  if (routeSet.has(clean)) return true;
  for (const candidate of routeSet) {
    try {
      const pattern = new RegExp(`^${staticRoutePattern(candidate)}$`);
      if (pattern.test(clean)) return true;
    } catch {}
  }
  return false;
}

const allFiles = walk(root);
const sourceFiles = allFiles.filter((file) => sourceExtensions.has(path.extname(file).toLowerCase()));
const codeFiles = sourceFiles.filter((file) => [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(path.extname(file).toLowerCase()));
const cache = new Map(codeFiles.map((file) => [file, readText(file)]));

const routes = [];
for (const file of codeFiles) {
  const rel = relative(file);
  const appMatch = rel.match(/^app\/.*\/?(page|route)\.(js|jsx|ts|tsx)$/) || rel.match(/^app\/(page|route)\.(js|jsx|ts|tsx)$/);
  const pagesMatch = rel.match(/^pages\/.*\.(js|jsx|ts|tsx)$/);
  if (!appMatch && !pagesMatch) continue;
  if (pagesMatch && /(^|\/)_(app|document|error)\./.test(rel)) continue;

  const content = cache.get(file) || "";
  let kind = "screen";
  let route = "";
  if (appMatch) {
    kind = appMatch[1] === "route" ? "api" : "screen";
    route = routeFromAppFile(rel);
  } else {
    route = routeFromPagesFile(rel);
    kind = route.startsWith("/api/") ? "api" : "screen";
  }

  const routeId = sha256(`${kind}:${route}:${rel}`).slice(0, 16);
  routes.push({
    routeId,
    route,
    kind,
    sourceFile: rel,
    title: extractTitle(content),
    methods: kind === "api" ? extractMethods(content).join("|") : "",
    exportedFunctions: extractExportedFunctions(content).join("|"),
    roleEvidence: extractRoleEvidence(content).join("|"),
    hasLoadingBoundary: appMatch ? Boolean(nearestBoundary(file, "loading")) : false,
    loadingBoundaryFile: appMatch ? nearestBoundary(file, "loading") : "",
    hasErrorBoundary: appMatch ? Boolean(nearestBoundary(file, "error") || nearestBoundary(file, "global-error")) : false,
    errorBoundaryFile: appMatch ? (nearestBoundary(file, "error") || nearestBoundary(file, "global-error")) : "",
    hasNotFoundBoundary: appMatch ? Boolean(nearestBoundary(file, "not-found")) : false,
    notFoundBoundaryFile: appMatch ? nearestBoundary(file, "not-found") : "",
    usesServerActions: /["']use server["']/.test(content),
    lineCount: content ? content.split(/\r?\n/).length : 0,
    contentHash: sha256(content),
  });
}

routes.sort((a, b) => a.route.localeCompare(b.route) || a.kind.localeCompare(b.kind) || a.sourceFile.localeCompare(b.sourceFile));
const screenRoutes = routes.filter((row) => row.kind === "screen");
const apiRoutes = routes.filter((row) => row.kind === "api");
const routeSet = new Set(screenRoutes.map((row) => row.route));

const controls = [];
const forms = [];
const navigation = [];
const serverActions = [];
const envMap = new Map();
const featureFlags = new Map();

function addControl(file, tag, attrs, body, index) {
  const rel = relative(file);
  const aria = attributeValue(attrs, "aria-label");
  const title = attributeValue(attrs, "title");
  const name = attributeValue(attrs, "name");
  const placeholder = attributeValue(attrs, "placeholder");
  const type = attributeValue(attrs, "type") || (tag.toLowerCase() === "button" ? "button" : "");
  const visible = cleanText(body);
  const label = aria || visible || title || name || placeholder;
  const interactiveEvidence = [
    tag,
    /\bonClick\s*=/.test(attrs) ? "onClick" : "",
    /\bonChange\s*=/.test(attrs) ? "onChange" : "",
    /\bonKeyDown\s*=/.test(attrs) ? "onKeyDown" : "",
    attributeValue(attrs, "role"),
  ].filter(Boolean).join("|");
  controls.push({
    controlId: sha256(`${rel}:${index}:${tag}:${attrs.slice(0, 120)}`).slice(0, 16),
    sourceFile: rel,
    tag,
    type,
    label,
    ariaLabel: aria,
    accessibleNamePresent: Boolean(label),
    interactiveEvidence,
    disabledEvidence: /\bdisabled(?:\s|=|>)/.test(attrs),
    testId: attributeValue(attrs, "data-testid"),
    href: attributeValue(attrs, "href"),
  });
}

for (const file of codeFiles) {
  const content = cache.get(file) || "";
  const rel = relative(file);

  let controlIndex = 0;
  const paired = /<(button|a|Link|select|textarea|summary)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of content.matchAll(paired)) {
    addControl(file, match[1], match[2], match[3], controlIndex++);
  }
  const selfClosing = /<(input|button|a|Link|select|textarea)\b([^>]*?)(?:\/>|>)/gi;
  for (const match of content.matchAll(selfClosing)) {
    addControl(file, match[1], match[2], "", controlIndex++);
  }
  const customInteractive = /<([A-Z][A-Za-z0-9_.]*)\b([^>]*(?:onClick|onSubmit|role\s*=\s*["'](?:button|menuitem|tab|switch)["'])[^>]*)>/g;
  for (const match of content.matchAll(customInteractive)) {
    addControl(file, match[1], match[2], "", controlIndex++);
  }

  let formIndex = 0;
  for (const match of content.matchAll(/<form\b([^>]*)>/gi)) {
    const attrs = match[1];
    forms.push({
      formId: sha256(`${rel}:form:${formIndex++}:${attrs}`).slice(0, 16),
      sourceFile: rel,
      action: attributeValue(attrs, "action"),
      method: (attributeValue(attrs, "method") || "GET").toUpperCase(),
      ariaLabel: attributeValue(attrs, "aria-label"),
      hasSubmitHandler: /\bonSubmit\s*=/.test(attrs),
      hasServerActionReference: /\baction\s*=\s*\{/.test(attrs),
    });
  }

  for (const match of content.matchAll(/(?:href|to)\s*=\s*(?:\{\s*)?["'`]([^"'`]+)["'`](?:\s*\})?/g)) {
    const target = match[1];
    navigation.push({
      navigationId: sha256(`${rel}:${match.index}:${target}`).slice(0, 16),
      sourceFile: rel,
      mechanism: "href",
      target,
      internalStatic: target.startsWith("/") && !target.includes("${") && !target.includes("["),
      resolves: "",
    });
  }
  for (const match of content.matchAll(/(?:router\.(?:push|replace)|redirect|permanentRedirect)\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) {
    const target = match[1];
    navigation.push({
      navigationId: sha256(`${rel}:${match.index}:${target}`).slice(0, 16),
      sourceFile: rel,
      mechanism: match[0].split("(")[0].trim(),
      target,
      internalStatic: target.startsWith("/") && !target.includes("${") && !target.includes("["),
      resolves: "",
    });
  }

  if (/["']use server["']/.test(content)) {
    const exported = extractExportedFunctions(content);
    if (exported.length === 0) {
      serverActions.push({
        actionId: sha256(`${rel}:server-action-file`).slice(0, 16),
        sourceFile: rel,
        actionName: "(unresolved export)",
      });
    } else {
      for (const name of exported) {
        serverActions.push({
          actionId: sha256(`${rel}:${name}`).slice(0, 16),
          sourceFile: rel,
          actionName: name,
        });
      }
    }
  }

  for (const match of content.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
    const key = match[1];
    if (!envMap.has(key)) envMap.set(key, new Set());
    envMap.get(key).add(rel);
    if (/(?:_ENABLED|_FLAG|_MODE|FEATURE_)/.test(key)) {
      if (!featureFlags.has(key)) featureFlags.set(key, new Set());
      featureFlags.get(key).add(rel);
    }
  }
}

for (const row of navigation) {
  row.resolves = row.internalStatic ? routeCanResolve(row.target, routeSet) : "";
}

const renderText = fs.existsSync(path.join(root, "render.yaml")) ? readText(path.join(root, "render.yaml")) : "";
for (const match of renderText.matchAll(/-\s+key:\s*([A-Z][A-Z0-9_]*)/g)) {
  const key = match[1];
  if (!envMap.has(key)) envMap.set(key, new Set());
  envMap.get(key).add("render.yaml");
  if (/(?:_ENABLED|_FLAG|_MODE|FEATURE_)/.test(key)) {
    if (!featureFlags.has(key)) featureFlags.set(key, new Set());
    featureFlags.get(key).add("render.yaml");
  }
}
const envExample = path.join(root, ".env.example");
if (fs.existsSync(envExample)) {
  for (const line of readText(envExample).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/);
    if (match) {
      if (!envMap.has(match[1])) envMap.set(match[1], new Set());
      envMap.get(match[1]).add(".env.example");
    }
  }
}

const envInventory = [...envMap.entries()].map(([key, files]) => ({
  key,
  sourceFiles: [...files].sort().join("|"),
  secretLikely: /(?:SECRET|TOKEN|PASSWORD|KEY|DSN|AUTH|SID)/.test(key),
  publicClientVisible: key.startsWith("NEXT_PUBLIC_"),
})).sort((a, b) => a.key.localeCompare(b.key));

const featureFlagInventory = [...featureFlags.entries()].map(([key, files]) => ({
  key,
  sourceFiles: [...files].sort().join("|"),
})).sort((a, b) => a.key.localeCompare(b.key));

const integrations = [];
for (const provider of integrationProviders) {
  const evidence = new Set();
  for (const file of sourceFiles) {
    const rel = relative(file);
    const content = readText(file);
    if (rel.toLowerCase().includes(provider) || content.toLowerCase().includes(provider)) evidence.add(rel);
  }
  const envKeys = envInventory.filter((row) => row.key.toLowerCase().includes(provider)).map((row) => row.key);
  if (evidence.size || envKeys.length) {
    integrations.push({
      provider: provider.toUpperCase(),
      sourceFiles: [...evidence].sort().join("|"),
      environmentKeys: envKeys.join("|"),
      staticStatus: evidence.size ? "IMPLEMENTATION_EVIDENCE_FOUND" : "CONFIGURATION_ONLY",
      liveVerificationStatus: "PENDING",
    });
  }
}

const cronJobs = [];
let currentCron = null;
for (const line of renderText.split(/\r?\n/)) {
  if (/^\s*-\s+type:\s+cron\s*$/.test(line)) {
    currentCron = { name: "", schedule: "", startCommand: "", runtime: "", plan: "" };
    cronJobs.push(currentCron);
    continue;
  }
  if (!currentCron) continue;
  let match;
  if ((match = line.match(/^\s+name:\s+(.+)\s*$/))) currentCron.name = match[1].trim();
  else if ((match = line.match(/^\s+schedule:\s+["']?([^"']+)["']?\s*$/))) currentCron.schedule = match[1].trim();
  else if ((match = line.match(/^\s+startCommand:\s+(.+)\s*$/))) currentCron.startCommand = match[1].trim();
  else if ((match = line.match(/^\s+runtime:\s+(.+)\s*$/))) currentCron.runtime = match[1].trim();
  else if ((match = line.match(/^\s+plan:\s+(.+)\s*$/))) currentCron.plan = match[1].trim();
  else if (/^\s*-\s+type:\s+/.test(line)) currentCron = null;
}

const prismaModels = [];
const prismaEnums = [];
const prismaPath = path.join(root, "prisma", "schema.prisma");
if (fs.existsSync(prismaPath)) {
  const prismaText = readText(prismaPath);
  for (const match of prismaText.matchAll(/\bmodel\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\n\}/g)) {
    const fields = match[2]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@"))
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean);
    prismaModels.push({
      type: "model",
      name: match[1],
      fieldCount: fields.length,
      fields: fields.join("|"),
    });
  }
  for (const match of prismaText.matchAll(/\benum\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*?)\n\}/g)) {
    const values = match[2]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@"))
      .map((line) => line.split(/\s+/)[0])
      .filter(Boolean);
    prismaEnums.push({
      type: "enum",
      name: match[1],
      fieldCount: values.length,
      fields: values.join("|"),
    });
  }
}

const tests = allFiles
  .filter((file) => /(?:^|\/)(?:tests?|e2e|__tests__)(?:\/|$)|\.(?:test|spec)\.(?:js|jsx|ts|tsx|mjs|cjs)$/.test(relative(file)))
  .map((file) => ({
    sourceFile: relative(file),
    extension: path.extname(file),
    sizeBytes: fs.statSync(file).size,
  }))
  .sort((a, b) => a.sourceFile.localeCompare(b.sourceFile));

const dispositions = screenRoutes.map((row) => ({
  routeId: row.routeId,
  route: row.route,
  title: row.title,
  sourceFile: row.sourceFile,
  disposition: policy.defaultDisposition,
  rationale: policy.defaultDispositionRationale,
  verificationStatus: policy.defaultVerificationStatus,
  owner: "",
  targetBuild: "",
  evidenceLinks: "",
  defectIds: "",
}));

const roleMatrix = [];
for (const route of screenRoutes) {
  const evidenceRoles = new Set((route.roleEvidence || "").split("|").filter(Boolean));
  for (const role of policy.canonicalRoles || []) {
    roleMatrix.push({
      routeId: route.routeId,
      route: route.route,
      role,
      staticEvidence: evidenceRoles.has(role) ? "ROLE_TOKEN_FOUND" : "NO_EXPLICIT_TOKEN",
      expectedAccess: "REVIEW_REQUIRED",
      liveResult: "NOT_EXECUTED",
      tester: "",
      evidence: "",
      defectIds: "",
    });
  }
}

const liveAudit = [];
for (const route of screenRoutes) {
  for (const role of policy.canonicalRoles || []) {
    liveAudit.push({
      routeId: route.routeId,
      route: route.route,
      title: route.title,
      role,
      viewport: "DESKTOP_OR_TABLET",
      navigationEntry: "NOT_EXECUTED",
      pageLoads: "NOT_EXECUTED",
      primaryControls: "NOT_EXECUTED",
      formsAndValidation: "NOT_EXECUTED",
      loadingState: "NOT_EXECUTED",
      emptyState: "NOT_EXECUTED",
      errorState: "NOT_EXECUTED",
      keyboardAndTouch: "NOT_EXECUTED",
      authorization: "NOT_EXECUTED",
      disposition: policy.defaultDisposition,
      defects: "",
      screenshotPath: "",
      tester: "",
      testDate: "",
    });
  }
}

const findings = [];
const duplicateRouteKeys = new Map();
for (const route of routes) {
  const key = `${route.kind}:${route.route}`;
  if (!duplicateRouteKeys.has(key)) duplicateRouteKeys.set(key, []);
  duplicateRouteKeys.get(key).push(route.sourceFile);
}
for (const [key, files] of duplicateRouteKeys.entries()) {
  if (files.length > 1) {
    findings.push({
      severity: "P1",
      category: "DUPLICATE_ROUTE",
      subject: key,
      detail: files.join("|"),
      releaseBlocking: true,
    });
  }
}
for (const nav of navigation) {
  if (nav.internalStatic && nav.resolves === false) {
    findings.push({
      severity: "P2",
      category: "UNRESOLVED_STATIC_NAVIGATION",
      subject: nav.target,
      detail: nav.sourceFile,
      releaseBlocking: false,
    });
  }
}
for (const control of controls) {
  if (!control.accessibleNamePresent && !["input"].includes(control.tag.toLowerCase())) {
    findings.push({
      severity: "P2",
      category: "CONTROL_WITHOUT_STATIC_ACCESSIBLE_NAME",
      subject: control.controlId,
      detail: control.sourceFile,
      releaseBlocking: false,
    });
  }
}
for (const route of screenRoutes) {
  if (!route.hasErrorBoundary) {
    findings.push({
      severity: "P2",
      category: "NO_DETECTED_ERROR_BOUNDARY",
      subject: route.route,
      detail: route.sourceFile,
      releaseBlocking: false,
    });
  }
  if (!route.hasLoadingBoundary) {
    findings.push({
      severity: "P3",
      category: "NO_DETECTED_LOADING_BOUNDARY",
      subject: route.route,
      detail: route.sourceFile,
      releaseBlocking: false,
    });
  }
}

const inventory = {
  buildVersion: BUILD_VERSION,
  inventorySchemaVersion: policy.inventorySchemaVersion,
  generatedAt: now,
  repositoryRoot: ".",
  generator: "scripts/application-inventory-11.1.0.mjs",
  policy: {
    canonicalRoles: policy.canonicalRoles,
    allowedDispositions: policy.allowedDispositions,
    defaultDisposition: policy.defaultDisposition,
    defaultVerificationStatus: policy.defaultVerificationStatus,
  },
  counts: {
    filesScanned: allFiles.length,
    sourceFilesScanned: sourceFiles.length,
    codeFilesScanned: codeFiles.length,
    routes: routes.length,
    screens: screenRoutes.length,
    apiRoutes: apiRoutes.length,
    controls: controls.length,
    forms: forms.length,
    navigationTargets: navigation.length,
    serverActions: serverActions.length,
    roles: (policy.canonicalRoles || []).length,
    roleMatrixRows: roleMatrix.length,
    environmentVariables: envInventory.length,
    featureFlags: featureFlagInventory.length,
    integrations: integrations.length,
    cronJobs: cronJobs.length,
    prismaModels: prismaModels.length,
    prismaEnums: prismaEnums.length,
    testFiles: tests.length,
    findings: findings.length,
  },
  routes,
  controls,
  forms,
  navigation,
  serverActions,
  environmentVariables: envInventory,
  featureFlags: featureFlagInventory,
  integrations,
  cronJobs,
  prisma: [...prismaModels, ...prismaEnums],
  tests,
  screenDispositions: dispositions,
  roleMatrix,
  findings,
};

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, "application-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

writeCsv("route-inventory.csv", routes, [
  "routeId", "route", "kind", "sourceFile", "title", "methods", "exportedFunctions",
  "roleEvidence", "hasLoadingBoundary", "loadingBoundaryFile", "hasErrorBoundary",
  "errorBoundaryFile", "hasNotFoundBoundary", "notFoundBoundaryFile",
  "usesServerActions", "lineCount", "contentHash"
]);
writeCsv("control-inventory.csv", controls, [
  "controlId", "sourceFile", "tag", "type", "label", "ariaLabel",
  "accessibleNamePresent", "interactiveEvidence", "disabledEvidence", "testId", "href"
]);
writeCsv("form-inventory.csv", forms, [
  "formId", "sourceFile", "action", "method", "ariaLabel",
  "hasSubmitHandler", "hasServerActionReference"
]);
writeCsv("navigation-inventory.csv", navigation, [
  "navigationId", "sourceFile", "mechanism", "target", "internalStatic", "resolves"
]);
writeCsv("server-action-inventory.csv", serverActions, ["actionId", "sourceFile", "actionName"]);
writeCsv("environment-inventory.csv", envInventory, [
  "key", "sourceFiles", "secretLikely", "publicClientVisible"
]);
writeCsv("feature-flag-inventory.csv", featureFlagInventory, ["key", "sourceFiles"]);
writeCsv("integration-inventory.csv", integrations, [
  "provider", "sourceFiles", "environmentKeys", "staticStatus", "liveVerificationStatus"
]);
writeCsv("cron-inventory.csv", cronJobs, ["name", "schedule", "startCommand", "runtime", "plan"]);
writeCsv("prisma-inventory.csv", [...prismaModels, ...prismaEnums], [
  "type", "name", "fieldCount", "fields"
]);
writeCsv("test-inventory.csv", tests, ["sourceFile", "extension", "sizeBytes"]);
writeCsv("screen-disposition-register.csv", dispositions, [
  "routeId", "route", "title", "sourceFile", "disposition", "rationale",
  "verificationStatus", "owner", "targetBuild", "evidenceLinks", "defectIds"
]);
writeCsv("role-route-matrix.csv", roleMatrix, [
  "routeId", "route", "role", "staticEvidence", "expectedAccess",
  "liveResult", "tester", "evidence", "defectIds"
]);
writeCsv("live-screen-audit-workbook.csv", liveAudit, [
  "routeId", "route", "title", "role", "viewport", "navigationEntry", "pageLoads",
  "primaryControls", "formsAndValidation", "loadingState", "emptyState", "errorState",
  "keyboardAndTouch", "authorization", "disposition", "defects", "screenshotPath",
  "tester", "testDate"
]);
writeCsv("inventory-findings.csv", findings, [
  "severity", "category", "subject", "detail", "releaseBlocking"
]);

const summary = `# Build ${BUILD_VERSION} Application Inventory Summary

Generated: ${now}

## Baseline counts

| Inventory | Count |
|---|---:|
| Files scanned | ${inventory.counts.filesScanned} |
| Source files scanned | ${inventory.counts.sourceFilesScanned} |
| Code files scanned | ${inventory.counts.codeFilesScanned} |
| Screens | ${inventory.counts.screens} |
| API routes | ${inventory.counts.apiRoutes} |
| Controls | ${inventory.counts.controls} |
| Forms | ${inventory.counts.forms} |
| Navigation targets | ${inventory.counts.navigationTargets} |
| Server actions | ${inventory.counts.serverActions} |
| Canonical roles | ${inventory.counts.roles} |
| Role-route matrix rows | ${inventory.counts.roleMatrixRows} |
| Environment variables | ${inventory.counts.environmentVariables} |
| Feature flags | ${inventory.counts.featureFlags} |
| Integrations | ${inventory.counts.integrations} |
| Cron jobs | ${inventory.counts.cronJobs} |
| Prisma models | ${inventory.counts.prismaModels} |
| Prisma enums | ${inventory.counts.prismaEnums} |
| Test files | ${inventory.counts.testFiles} |
| Static findings | ${inventory.counts.findings} |

## Disposition rule

Every discovered screen is classified as **${policy.defaultDisposition}** for baseline preservation, with verification status **${policy.defaultVerificationStatus}**. This is not live acceptance. The disposition register must be revised to REFACTOR, REPLACE or REMOVE when role-based testing demonstrates that a different decision is required.

## Required human work

1. Execute every row in \`live-screen-audit-workbook.csv\`.
2. Complete \`role-route-matrix.csv\` using actual accounts for every canonical role.
3. Review static findings; create defects for confirmed failures.
4. Attach screenshots and deployed-build evidence.
5. Approve each final screen disposition.
6. Retain the complete evidence package with the exact Git commit and Render deploy.

## Exit decision

The generator proves inventory coverage of the repository. It does not prove deployed behavior. Build ${BUILD_VERSION} should not be signed off until the live audit and release evidence are complete.
`;
fs.writeFileSync(path.join(outDir, "inventory-summary.md"), summary, "utf8");

const requiredOutputFiles = fs.readdirSync(outDir).sort();
const hashes = {};
for (const fileName of requiredOutputFiles) {
  const fullPath = path.join(outDir, fileName);
  if (fs.statSync(fullPath).isFile()) hashes[fileName] = sha256(fs.readFileSync(fullPath));
}
const manifest = {
  buildVersion: BUILD_VERSION,
  generatedAt: now,
  algorithm: "sha256",
  files: hashes,
};
fs.writeFileSync(path.join(outDir, "inventory-hash-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Build ${BUILD_VERSION} application inventory generated.`);
for (const [key, value] of Object.entries(inventory.counts)) {
  console.log(`${key}: ${value}`);
}
console.log(`Output: ${relative(outDir)}`);
