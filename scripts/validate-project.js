#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const acorn = require("acorn");

const DEFAULT_JSON_FILES = [
  "package.json",
  "vercel.json",
  "firebase.json",
  "database.rules.json",
  "app-version.json",
  "public/app-version.json",
  "public/manifest.json",
  "public/app/manifest.json",
  "public/manifest-simulator.json",
  "public/simulator/manifest.json",
  "functions/package.json",
];

const ADMIN_PAGES = [
  "login.html",
  "dashboard.html",
  "history.html",
  "settings.html",
  "telegram.html",
  "discord.html",
  "users.html",
];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function pathExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function walkFiles(dir, predicate = () => true) {
  if (!pathExists(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist", "build", "release-build", ".gradle"].includes(entry.name)) continue;
      out.push(...walkFiles(full, predicate));
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function rel(rootDir, filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/");
}

function addError(errors, message) {
  errors.push(message);
}

function addWarning(warnings, message) {
  warnings.push(message);
}

function parseJsonFile(rootDir, relativePath, errors) {
  const filePath = path.join(rootDir, relativePath);
  if (!pathExists(filePath)) return null;
  try {
    return JSON.parse(readText(filePath));
  } catch (error) {
    addError(errors, `${relativePath}: invalid JSON (${error.message})`);
    return null;
  }
}

function validateJsonFiles(rootDir, errors) {
  for (const file of DEFAULT_JSON_FILES) {
    parseJsonFile(rootDir, file, errors);
  }
}

function isExternalRef(value) {
  return (
    !value ||
    value.startsWith("#") ||
    value.startsWith("data:") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("javascript:") ||
    value.startsWith("blob:") ||
    value.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
  );
}

function stripUrlDecorations(value) {
  return String(value || "").split("#")[0].split("?")[0].trim();
}

function publicCandidatePaths(rootDir, htmlFile, ref) {
  const publicDir = path.join(rootDir, "public");
  const cleanRef = stripUrlDecorations(ref);
  if (!cleanRef || isExternalRef(cleanRef)) return [];

  if (cleanRef.startsWith("/api/")) {
    const apiName = cleanRef.replace(/^\/api\//, "").replace(/^(.+?)\/.*$/, "$1");
    return [path.join(rootDir, "api", `${apiName}.js`)];
  }

  const basePath = cleanRef.startsWith("/")
    ? path.join(publicDir, cleanRef.slice(1))
    : path.resolve(path.dirname(htmlFile), cleanRef);

  const candidates = [basePath];
  if (!path.extname(basePath)) {
    candidates.push(`${basePath}.html`);
    candidates.push(path.join(basePath, "index.html"));
  }
  return candidates;
}

function refExists(rootDir, htmlFile, ref) {
  const candidates = publicCandidatePaths(rootDir, htmlFile, ref);
  if (!candidates.length) return true;
  return candidates.some(pathExists);
}

function extractHtmlRefs(html) {
  const refs = [];
  const attrPattern = /\b(?:src|href)=["']([^"']+)["']/gi;
  let match;
  while ((match = attrPattern.exec(html))) {
    refs.push(match[1]);
  }
  return refs;
}

function validateHtmlFiles(rootDir, errors, warnings) {
  const publicDir = path.join(rootDir, "public");
  const htmlFiles = walkFiles(publicDir, (file) => file.endsWith(".html"));

  for (const file of htmlFiles) {
    const html = readText(file);
    const relative = rel(rootDir, file);
    const lower = html.toLowerCase();
    const fileName = path.basename(file).toLowerCase();

    if (/^google[a-z0-9]+\.html$/.test(fileName) && lower.trim().startsWith("google-site-verification:")) {
      continue;
    }

    if (!lower.includes("<!doctype html")) addWarning(warnings, `${relative}: missing <!doctype html>`);
    if (!lower.includes("<html")) addError(errors, `${relative}: missing <html> tag`);
    if (!lower.includes("<head")) addError(errors, `${relative}: missing <head> tag`);
    if (!lower.includes("<body")) addError(errors, `${relative}: missing <body> tag`);

    for (const ref of extractHtmlRefs(html)) {
      if (!refExists(rootDir, file, ref)) {
        addError(errors, `${relative}: broken asset/link reference "${ref}"`);
      }
    }
  }
}

function validateManifestAssets(rootDir, errors) {
  const manifestFiles = [
    "public/manifest.json",
    "public/app/manifest.json",
    "public/manifest-simulator.json",
    "public/simulator/manifest.json",
  ];

  for (const manifestPath of manifestFiles) {
    const manifest = parseJsonFile(rootDir, manifestPath, errors);
    if (!manifest) continue;

    const manifestFile = path.join(rootDir, manifestPath);
    const refs = [];
    if (manifest.start_url) refs.push(manifest.start_url);
    if (Array.isArray(manifest.icons)) refs.push(...manifest.icons.map((icon) => icon && icon.src).filter(Boolean));
    if (Array.isArray(manifest.shortcuts)) {
      for (const shortcut of manifest.shortcuts) {
        if (shortcut.url) refs.push(shortcut.url);
        if (Array.isArray(shortcut.icons)) refs.push(...shortcut.icons.map((icon) => icon && icon.src).filter(Boolean));
      }
    }

    for (const ref of refs) {
      if (!refExists(rootDir, manifestFile, ref)) {
        addError(errors, `${manifestPath}: broken manifest reference "${ref}"`);
      }
    }
  }
}

const ROOT_ADMIN_REDIRECTS = {
  "/login": "/app/login",
  "/login.html": "/app/login",
  "/dashboard": "/app/dashboard",
  "/dashboard.html": "/app/dashboard",
  "/history": "/app/history",
  "/history.html": "/app/history",
  "/settings": "/app/settings",
  "/settings.html": "/app/settings",
  "/telegram": "/app/telegram",
  "/telegram.html": "/app/telegram",
  "/discord": "/app/discord",
  "/discord.html": "/app/discord",
  "/users": "/app/users",
  "/users.html": "/app/users",
};

function validateAdminAppPages(rootDir, errors, warnings) {
  for (const page of ADMIN_PAGES) {
    const appPage = path.join(rootDir, "public", "app", page);
    if (!pathExists(appPage)) addError(errors, `public/app/${page}: missing /app admin page`);

    const rootPage = path.join(rootDir, "public", page);
    if (pathExists(rootPage)) {
      addWarning(warnings, `public/${page}: root admin duplicate exists; prefer /app/${page}`);
    }
  }
}

function validateVercelConfig(rootDir, errors) {
  const vercel = parseJsonFile(rootDir, "vercel.json", errors);
  if (!vercel) return;

  if (!Array.isArray(vercel.rewrites)) {
    addError(errors, "vercel.json: rewrites must be an array");
    return;
  }

  const redirects = Array.isArray(vercel.redirects) ? vercel.redirects : [];
  const redirectMap = new Map(
    redirects
      .filter((redirect) => redirect && redirect.source && redirect.destination)
      .map((redirect) => [redirect.source, redirect.destination])
  );

  for (const [source, destination] of Object.entries(ROOT_ADMIN_REDIRECTS)) {
    if (redirectMap.get(source) !== destination) {
      addError(errors, `vercel.json: missing redirect ${source} -> ${destination}`);
    }
  }

  const vercelFile = path.join(rootDir, "vercel.json");
  for (const rewrite of vercel.rewrites) {
    if (!rewrite || !rewrite.source || !rewrite.destination) {
      addError(errors, "vercel.json: each rewrite needs source and destination");
      continue;
    }
    if (!refExists(rootDir, vercelFile, rewrite.destination)) {
      addError(errors, `vercel.json: rewrite destination missing "${rewrite.destination}"`);
    }
  }

  const globalHeaders = Array.isArray(vercel.headers)
    ? vercel.headers.find((entry) => entry && entry.source === "/(.*)")
    : null;
  const cspHeader = globalHeaders && Array.isArray(globalHeaders.headers)
    ? globalHeaders.headers.find((header) => header && header.key === "Content-Security-Policy")
    : null;
  const csp = cspHeader && typeof cspHeader.value === "string" ? cspHeader.value : "";

  for (const requiredSource of ["https://*.firebaseio.com", "https://*.firebasedatabase.app"]) {
    if (!csp.includes(`script-src`) || !csp.includes(requiredSource)) {
      addError(errors, `vercel.json: CSP script-src must allow Firebase RTDB long-polling source "${requiredSource}"`);
    }
  }
}

function validateAutoLearningCoverage(rootDir, errors) {
  const requiredSnippets = [
    ["public/app/settings.html", "autoLearningSection"],
    ["public/app/settings.html", "inpLearningDuration"],
    ["public/app/settings.html", "startAutoLearningBtn"],
    ["public/js/settings.js", "startAutoLearning"],
    ["public/js/settings.js", "settings/autoLearning"],
    ["hardware/config.h", "autoLearningActive"],
    ["hardware/config.example.h", "autoLearningActive"],
    ["hardware/firebase_handler.h", "autoLearning/active"],
    ["hardware/firebase_handler.h", "writeAutoLearningResult"],
    ["hardware/main/main.ino", "handleAutoLearning"],
    ["database.rules.json", "\"autoLearning\""],
  ];

  for (const [relativePath, snippet] of requiredSnippets) {
    const filePath = path.join(rootDir, relativePath);
    if (!pathExists(filePath)) {
      addError(errors, `${relativePath}: required for auto-learning coverage`);
      continue;
    }
    if (!readText(filePath).includes(snippet)) {
      addError(errors, `${relativePath}: missing auto-learning snippet "${snippet}"`);
    }
  }
}

function validateJavaScriptSyntax(rootDir, errors) {
  const functionsFile = path.join(rootDir, "functions", "index.js");
  if (pathExists(functionsFile)) {
    const result = spawnSync(process.execPath, ["--check", functionsFile], {
      cwd: rootDir,
      encoding: "utf8",
    });
    if (result.status !== 0) {
      addError(errors, `${rel(rootDir, functionsFile)}: syntax check failed\n${(result.stderr || result.stdout).trim()}`);
    }
  }

  const apiFiles = walkFiles(path.join(rootDir, "api"), (file) => file.endsWith(".js"));
  for (const file of apiFiles) {
    try {
      acorn.parse(readText(file), {
        ecmaVersion: "latest",
        sourceType: "module",
        allowHashBang: true,
      });
    } catch (error) {
      addError(errors, `${rel(rootDir, file)}: syntax check failed (${error.message})`);
    }
  }
}

function validateProject(options = {}) {
  const rootDir = path.resolve(options.rootDir || path.join(__dirname, ".."));
  const errors = [];
  const warnings = [];

  validateJsonFiles(rootDir, errors);
  validateHtmlFiles(rootDir, errors, warnings);
  validateManifestAssets(rootDir, errors);
  validateAdminAppPages(rootDir, errors, warnings);
  validateVercelConfig(rootDir, errors);
  validateAutoLearningCoverage(rootDir, errors);
  validateJavaScriptSyntax(rootDir, errors);

  if (!options.silent) {
    for (const warning of warnings) console.warn(`[WARN] ${warning}`);
    for (const error of errors) console.error(`[ERROR] ${error}`);
    if (errors.length) {
      console.error(`\nProject validation failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
    } else {
      console.log(`Project validation passed: 0 errors, ${warnings.length} warning(s).`);
    }
  }

  return { errors, warnings };
}

if (require.main === module) {
  const result = validateProject();
  process.exit(result.errors.length ? 1 : 0);
}

module.exports = {
  validateProject,
  extractHtmlRefs,
  publicCandidatePaths,
};
