#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const APP_JSON_PATH = path.join(ROOT, "app.json");
const CLOUD_DIR = path.join(ROOT, "cloudfunctions");
const PAGES_DIR = path.join(ROOT, "pages");

const CODE_EXTENSIONS = new Set([".js", ".ts", ".wxml"]);
const EXCLUDED_DIRS = new Set(["node_modules", ".git", ".kiro", "miniprogram", "tests", "docs", "scripts"]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (_err) {
    return false;
  }
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(startDir, out = []) {
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

function lineAt(source, charIndex) {
  return source.slice(0, charIndex).split(/\r?\n/).length;
}

function safeJsonParse(filePath) {
  try {
    return JSON.parse(readUtf8(filePath));
  } catch (err) {
    throw new Error(`Parse JSON failed: ${toPosix(path.relative(ROOT, filePath))}\n${err.message}`);
  }
}

function loadDeclaredRoutes() {
  if (!exists(APP_JSON_PATH)) {
    throw new Error("app.json not found in project root");
  }

  const appConfig = safeJsonParse(APP_JSON_PATH);
  const routes = new Set();
  const pages = Array.isArray(appConfig.pages) ? appConfig.pages : [];
  for (const route of pages) {
    if (typeof route === "string" && route.trim()) {
      routes.add(route.trim());
    }
  }

  const subPackages = Array.isArray(appConfig.subPackages)
    ? appConfig.subPackages
    : Array.isArray(appConfig.subpackages)
      ? appConfig.subpackages
      : [];

  for (const pkg of subPackages) {
    if (!pkg || typeof pkg !== "object") {
      continue;
    }
    const root = typeof pkg.root === "string" ? pkg.root.replace(/\/+$/, "") : "";
    const pkgPages = Array.isArray(pkg.pages) ? pkg.pages : [];
    for (const page of pkgPages) {
      if (typeof page !== "string" || !page.trim()) {
        continue;
      }
      routes.add(root ? `${root}/${page}` : page);
    }
  }

  return routes;
}

function checkDeclaredRouteFiles(declaredRoutes) {
  const missing = [];
  for (const route of declaredRoutes) {
    const base = path.join(ROOT, route);
    const hasScript = exists(`${base}.js`) || exists(`${base}.ts`);
    const hasWxml = exists(`${base}.wxml`);
    const hasJson = exists(`${base}.json`);
    if (!hasScript || !hasWxml || !hasJson) {
      missing.push({
        route,
        hasScript,
        hasWxml,
        hasJson
      });
    }
  }
  return missing;
}

function findUnregisteredPages(declaredRoutes) {
  if (!exists(PAGES_DIR)) {
    return [];
  }

  const candidates = [];
  const allFiles = walkFiles(PAGES_DIR).filter((filePath) => filePath.endsWith(".json"));
  for (const jsonFile of allFiles) {
    const basePath = jsonFile.slice(0, -".json".length);
    if (!exists(`${basePath}.wxml`)) {
      continue;
    }

    const route = toPosix(path.relative(ROOT, basePath));
    if (!route.startsWith("pages/")) {
      continue;
    }

    let jsonConfig = {};
    try {
      jsonConfig = safeJsonParse(jsonFile);
    } catch (_err) {
      // Keep page discovery best-effort; parse errors are reported elsewhere.
    }

    if (jsonConfig && jsonConfig.component === true) {
      continue;
    }

    if (!declaredRoutes.has(route)) {
      candidates.push(route);
    }
  }

  candidates.sort();
  return candidates;
}

function normalizeRouteFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return null;
  }
  const url = rawUrl.trim();
  if (!url) {
    return null;
  }
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("plugin://")) {
    return null;
  }
  if (url.includes("${")) {
    return null;
  }

  const noQuery = url.split("?")[0].split("#")[0].trim();
  if (!noQuery) {
    return null;
  }
  const cleaned = noQuery.replace(/^\/+/, "");
  if (!cleaned.startsWith("pages/")) {
    return null;
  }
  return cleaned;
}

function scanNavigationTargets(declaredRoutes) {
  const issues = [];
  const files = walkFiles(ROOT).filter((filePath) => CODE_EXTENSIONS.has(path.extname(filePath)));
  const urlPattern = /url\s*:\s*["'`]([^"'`]+)["'`]/g;

  for (const filePath of files) {
    const content = readUtf8(filePath);
    let match;
    while ((match = urlPattern.exec(content)) !== null) {
      const rawUrl = match[1];
      const route = normalizeRouteFromUrl(rawUrl);
      if (!route) {
        continue;
      }
      if (!declaredRoutes.has(route)) {
        issues.push({
          file: toPosix(path.relative(ROOT, filePath)),
          line: lineAt(content, match.index),
          rawUrl,
          route
        });
      }
    }
  }
  return issues;
}

function listCloudFunctions() {
  if (!exists(CLOUD_DIR)) {
    return new Set();
  }
  const names = fs
    .readdirSync(CLOUD_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  return new Set(names);
}

function scanCloudFunctionCalls(definedCloudFunctions) {
  const issues = [];
  const files = walkFiles(ROOT).filter((filePath) => CODE_EXTENSIONS.has(path.extname(filePath)));
  const callPattern =
    /wx\.cloud\.callFunction\s*\(\s*\{[\s\S]*?name\s*:\s*["'`]([^"'`]+)["'`][\s\S]*?\}\s*\)/g;
  const helperPattern = /(?:^|[^\w.])callFunction\s*\(\s*["'`]([^"'`]+)["'`]/g;

  for (const filePath of files) {
    const content = readUtf8(filePath);
    const seen = new Set();

    let match;
    while ((match = callPattern.exec(content)) !== null) {
      const cloudName = match[1].trim();
      if (!cloudName || cloudName.includes("${")) continue;
      const key = `${cloudName}@${match.index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!definedCloudFunctions.has(cloudName)) {
        issues.push({
          file: toPosix(path.relative(ROOT, filePath)),
          line: lineAt(content, match.index),
          name: cloudName
        });
      }
    }

    while ((match = helperPattern.exec(content)) !== null) {
      const cloudName = match[1].trim();
      if (!cloudName || cloudName.includes("${")) continue;
      const key = `${cloudName}@${match.index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!definedCloudFunctions.has(cloudName)) {
        issues.push({
          file: toPosix(path.relative(ROOT, filePath)),
          line: lineAt(content, match.index),
          name: cloudName
        });
      }
    }
  }

  return issues;
}

function printSection(title, items, formatter) {
  console.log(`\n[${title}] ${items.length}`);
  if (items.length === 0) {
    console.log("  - none");
    return;
  }
  for (const item of items) {
    console.log(`  - ${formatter(item)}`);
  }
}

function run() {
  const declaredRoutes = loadDeclaredRoutes();
  const declaredRouteFileIssues = checkDeclaredRouteFiles(declaredRoutes);
  const unregisteredPages = findUnregisteredPages(declaredRoutes);
  const badNavigationTargets = scanNavigationTargets(declaredRoutes);
  const cloudFunctions = listCloudFunctions();
  const missingCloudFunctionCalls = scanCloudFunctionCalls(cloudFunctions);

  console.log("Mini Program Integrity Audit");
  console.log(`Project: ${ROOT}`);
  console.log(`Declared routes: ${declaredRoutes.size}`);
  console.log(`Cloud functions: ${cloudFunctions.size}`);

  printSection("Declared route files missing", declaredRouteFileIssues, (item) => {
    const missingParts = [];
    if (!item.hasScript) missingParts.push("script");
    if (!item.hasWxml) missingParts.push("wxml");
    if (!item.hasJson) missingParts.push("json");
    return `${item.route} -> missing: ${missingParts.join(", ")}`;
  });

  printSection("Pages exist but not declared in app.json", unregisteredPages, (route) => route);

  printSection("Navigation targets not declared", badNavigationTargets, (item) => {
    return `${item.file}:${item.line} -> ${item.rawUrl}`;
  });

  printSection("wx.cloud.callFunction names missing in cloudfunctions/", missingCloudFunctionCalls, (item) => {
    return `${item.file}:${item.line} -> ${item.name}`;
  });
}

run();
