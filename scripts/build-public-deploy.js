#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const postcss = require("postcss");
const selectorParser = require("postcss-selector-parser");

const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "public");
const outputDir = path.join(rootDir, "dist-public");
const CRITICAL_STYLE_VERSION = "20260505-inline1";
const CLARITY_ID = "wkpdqlv70s";
const DESKTOP_CINEMATIC_LOADER_VERSION = "20260506-desktop-only1";
const DESKTOP_CINEMATIC_SCRIPTS = [
  "https://unpkg.com/lenis@1.1.20/dist/lenis.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js",
  "/js/cinematic-parallax.js",
];

const MARKETING_PAGES = new Map([
  ["index.html", "index.critical.min.css"],
  ["features.html", "features.critical.min.css"],
  ["downloads.html", "downloads.critical.min.css"],
]);

const MARKETING_TOKEN_FILES = [
  "js/components/navbar.js",
  "js/components/footer.js",
];

const DYNAMIC_CLASSES = new Set([
  "active",
  "current",
  "downloads-page",
  "is-active",
  "is-loaded",
  "is-visible",
  "is-cine-active",
  "lenis",
  "lenis-smooth",
  "lenis-stopped",
  "menu-open",
  "nav-hidden",
  "open",
  "pwa-installed",
  "cine-ready",
  "revealed",
  "reveal-visible",
  "scrolled",
]);

const DYNAMIC_IDS = new Set(["menuBtn", "navLinks", "pwaInstallBtn"]);

const INDEX_LCP_SAFE_CSS = `
[data-cine-hero] .landing-badge,
[data-cine-hero] h1,
[data-cine-hero] .landing-title,
[data-cine-hero] .hero-desc,
[data-cine-hero] > p,
[data-cine-hero] .landing-subtitle,
[data-cine-hero] .clean-cta,
[data-cine-hero] .landing-cta {
  opacity: 1;
  transform: none;
}
`;

const SKIP_MINIFY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp3",
  ".wav",
  ".mp4",
  ".pdf",
  ".apk",
  ".exe",
  ".msi",
  ".zip",
  ".7z",
]);

function shouldSkipPublicCopy(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");

  if (normalized.startsWith("downloads/")) {
    const ext = path.extname(normalized).toLowerCase();
    if ([".exe", ".msi", ".apk", ".aab", ".7z"].includes(ext)) return true;
    if (normalized.includes("/node_modules/")) return true;
    if (normalized.endsWith("/package-lock.json")) return true;
    if (normalized.endsWith("/iot-listrik-dashboard-cli-linux")) return true;
  }

  return false;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function copyPublicTree() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  ensureDir(outputDir);

  for (const file of walk(sourceDir)) {
    const relative = path.relative(sourceDir, file);
    if (shouldSkipPublicCopy(relative)) continue;

    const target = path.join(outputDir, relative);
    ensureDir(path.dirname(target));
    fs.copyFileSync(file, target);
  }
}

function readTextIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function collectTokens(text) {
  const classes = new Set(DYNAMIC_CLASSES);
  const ids = new Set(DYNAMIC_IDS);

  for (const match of text.matchAll(/\bclass(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/gi)) {
    for (const token of match[1].split(/\s+/)) {
      const clean = token.trim();
      if (clean && !/[${}]/.test(clean)) classes.add(clean);
    }
  }

  for (const match of text.matchAll(/\bclassList\.(?:add|remove|toggle|contains)\(\s*["'`]([^"'`]+)["'`]/gi)) {
    classes.add(match[1]);
  }

  for (const match of text.matchAll(/\bid\s*=\s*["'`]([^"'`]+)["'`]/gi)) {
    ids.add(match[1]);
  }

  for (const match of text.matchAll(/#([a-zA-Z][\w-]*)/g)) {
    ids.add(match[1]);
  }

  return { classes, ids };
}

function collectMarketingTokens(html) {
  const componentText = MARKETING_TOKEN_FILES
    .map((relative) => readTextIfExists(path.join(sourceDir, relative)))
    .join("\n");

  return collectTokens(`${html}\n${componentText}`);
}

function stylesheetPathFromHref(href) {
  const cleanHref = href.split("?")[0];
  if (!cleanHref.startsWith("/css/")) return null;

  const basename = path.basename(cleanHref);
  const sourceName = basename.endsWith(".min.css")
    ? basename.replace(/\.min\.css$/i, ".css")
    : basename;
  const sourcePath = path.join(sourceDir, "css", sourceName);
  const outputPath = path.join(outputDir, cleanHref.replace(/^\//, ""));

  if (fs.existsSync(sourcePath)) return sourcePath;
  if (fs.existsSync(outputPath)) return outputPath;
  return null;
}

async function generateMinifiedCssVariants() {
  const cssDir = path.join(outputDir, "css");
  if (!fs.existsSync(cssDir)) return [];

  const outputs = [];
  for (const entry of fs.readdirSync(cssDir, { withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".css") ||
      entry.name.endsWith(".min.css") ||
      entry.name.endsWith(".purged.css")
    ) {
      continue;
    }

    const sourcePath = path.join(cssDir, entry.name);
    const source = fs.readFileSync(sourcePath, "utf8");
    const result = await esbuild.transform(source, {
      loader: "css",
      minify: true,
      legalComments: "none",
    });

    const parsed = path.parse(sourcePath);
    const targetPath = path.join(parsed.dir, `${parsed.name}.min.css`);
    fs.writeFileSync(targetPath, result.code, "utf8");
    outputs.push(path.relative(outputDir, targetPath));
  }

  return outputs;
}

function getLocalStylesheets(html) {
  const files = [];
  const seen = new Set();
  const linkRe = /<link\b[^>]*>/gi;

  for (const match of html.matchAll(linkRe)) {
    const tag = match[0];
    if (!/\brel\s*=\s*["']stylesheet["']/i.test(tag)) continue;

    const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    const cssPath = stylesheetPathFromHref(hrefMatch[1]);
    if (!cssPath || seen.has(cssPath)) continue;

    seen.add(cssPath);
    files.push(cssPath);
  }

  return files;
}

function selectorUsesKnownTokens(selector, tokens) {
  let classes = [];
  let ids = [];

  try {
    selectorParser((selectors) => {
      selectors.walkClasses((node) => classes.push(node.value));
      selectors.walkIds((node) => ids.push(node.value));
    }).processSync(selector);
  } catch {
    return true;
  }

  if (classes.length === 0 && ids.length === 0) return true;

  return (
    classes.every((name) => tokens.classes.has(name)) &&
    ids.every((name) => tokens.ids.has(name))
  );
}

function purgeCssForPage(css, tokens) {
  const root = postcss.parse(css);

  root.walkRules((rule) => {
    const keptSelectors = rule.selectors.filter((selector) => selectorUsesKnownTokens(selector, tokens));

    if (keptSelectors.length === 0) {
      rule.remove();
      return;
    }

    rule.selectors = keptSelectors;
  });

  root.walkAtRules((rule) => {
    if (["keyframes", "-webkit-keyframes", "font-face"].includes(rule.name)) return;
    if (rule.nodes && rule.nodes.length === 0) rule.remove();
  });

  return root.toString();
}

function replaceMarketingStyles(html, cssFile, criticalCss) {
  let injected = false;
  const criticalStyle = `<style data-critical-css="${cssFile}" data-critical-version="${CRITICAL_STYLE_VERSION}">${criticalCss}</style>`;

  const withoutNoscript = html.replace(
    /\s*<noscript>\s*<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])(?=[^>]*\bhref\s*=\s*["']\/css\/[^"']+["'])[^>]*>\s*<\/noscript>/gi,
    "",
  );

  const next = withoutNoscript.replace(
    /\s*<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])(?=[^>]*\bhref\s*=\s*["']\/css\/[^"']+["'])[^>]*>/gi,
    () => {
      if (injected) return "";
      injected = true;
      return `\n    ${criticalStyle}`;
    },
  );

  if (injected) return next;
  return next.replace(/<\/head>/i, `    ${criticalStyle}\n  </head>`);
}

async function generateMarketingCriticalStyles() {
  for (const [page, cssFile] of MARKETING_PAGES) {
    const htmlPath = path.join(outputDir, page);
    if (!fs.existsSync(htmlPath)) continue;

    const html = fs.readFileSync(htmlPath, "utf8");
    const cssSources = getLocalStylesheets(html);
    const combinedCss = cssSources.map((file) => fs.readFileSync(file, "utf8")).join("\n");
    const tokens = collectMarketingTokens(html);
    const purgedCss = purgeCssForPage(combinedCss, tokens);
    const pageCss = page === "index.html" ? `${purgedCss}\n${INDEX_LCP_SAFE_CSS}` : purgedCss;
    const minified = await esbuild.transform(pageCss, {
      loader: "css",
      minify: true,
      legalComments: "none",
    });

    const target = path.join(outputDir, "css", cssFile);
    ensureDir(path.dirname(target));
    fs.writeFileSync(target, minified.code, "utf8");
    fs.writeFileSync(htmlPath, replaceMarketingStyles(html, cssFile, minified.code), "utf8");
  }
}

function protectBlocks(html) {
  const blocks = [];
  const token = (index) => `___HTML_PROTECTED_BLOCK_${index}___`;
  const protectedHtml = html.replace(
    /<(script|style|pre|textarea)\b[\s\S]*?<\/\1>/gi,
    (match) => {
      const index = blocks.push(match) - 1;
      return token(index);
    },
  );

  return {
    html: protectedHtml,
    restore(value) {
      return value.replace(/___HTML_PROTECTED_BLOCK_(\d+)___/g, (_, index) => blocks[Number(index)]);
    },
  };
}

function deferCinematicScripts(html) {
  return html.replace(/<script\b([^>]*\bsrc=["']([^"']+)["'][^>]*)><\/script>/gi, (match, attrs, src) => {
    const normalized = src.toLowerCase();
    const shouldDefer =
      normalized.includes("/js/scroll-reveal.js") ||
      normalized.includes("/js/cinematic-parallax.js") ||
      normalized.includes("unpkg.com/lenis") ||
      normalized.includes("cdnjs.cloudflare.com/ajax/libs/gsap/");

    if (!shouldDefer || /\b(?:defer|async)\b/i.test(attrs) || /\btype=["']module["']/i.test(attrs)) {
      return match;
    }

    return `<script${attrs} defer></script>`;
  });
}

function gateDesktopCinematicScripts(html, relativePath) {
  const isMarketingPage = MARKETING_PAGES.has(relativePath.replace(/\\/g, "/"));
  if (!isMarketingPage || html.includes("data-desktop-cinematic-loader")) return html;

  let removedAny = false;
  const withoutHeavyScripts = html.replace(
    /<script\b([^>]*\bsrc=["']([^"']+)["'][^>]*)><\/script>\s*/gi,
    (match, attrs, src) => {
      const normalized = src.toLowerCase();
      const isHeavyCinematic =
        normalized.includes("unpkg.com/lenis") ||
        normalized.includes("cdnjs.cloudflare.com/ajax/libs/gsap/") ||
        normalized.includes("/js/cinematic-parallax.js");

      if (!isHeavyCinematic) return match;

      removedAny = true;
      return "";
    },
  );

  if (!removedAny) return html;

  const scriptsJson = JSON.stringify(DESKTOP_CINEMATIC_SCRIPTS);
  const loader = `<script data-desktop-cinematic-loader="${DESKTOP_CINEMATIC_LOADER_VERSION}">(function(){var canAnimate=window.matchMedia&&window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches;if(!canAnimate)return;var scripts=${scriptsJson};var started=false;function load(i){if(i>=scripts.length)return;var s=document.createElement("script");s.src=scripts[i];s.async=false;s.onload=function(){load(i+1)};s.onerror=function(){load(i+1)};document.head.appendChild(s)}function start(){if(started)return;started=true;load(0)}if("requestIdleCallback"in window){requestIdleCallback(start,{timeout:1800})}else if(document.readyState==="complete"){setTimeout(start,300)}else{window.addEventListener("load",function(){setTimeout(start,300)},{once:true})}})();</script>`;

  return withoutHeavyScripts.replace(/<\/body>/i, `${loader}</body>`);
}

function stabilizeMarketingStyles(html, relativePath) {
  const isMarketingPage = ["index.html", "features.html", "downloads.html"].includes(relativePath.replace(/\\/g, "/"));
  if (!isMarketingPage) return html;

  return html.replace(
    /<link\s+rel=["']stylesheet["']\s+href=["']([^"']*\/css\/style\.min\.css[^"']*)["']\s+media=["']print["']\s+onload=["']this\.media='all'["']\s*\/?>/gi,
    '<link rel="stylesheet" href="$1" />',
  );
}

function delayClarity(html) {
  if (html.includes("data-delayed-clarity")) return html;

  const delayedClarity = `<script data-delayed-clarity="${CLARITY_ID}">window.addEventListener("load",function(){setTimeout(function(){(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");},2500);});</script>`;

  return html.replace(
    /<script\s+type=["']text\/javascript["']>\s*\(function\(c,l,a,r,i,t,y\)\{[\s\S]*?\}\)\(window,\s*document,\s*["']clarity["'],\s*["']script["'],\s*["']wkpdqlv70s["']\);\s*<\/script>/i,
    delayedClarity,
  );
}

function rewriteCssLinksToMinified(html) {
  const toMinified = (match, prefix, name, query = "") => {
      if (name.endsWith(".min")) return match;
      const minPath = path.join(outputDir, "css", `${name}.min.css`);
      if (!fs.existsSync(minPath)) return match;
      return `${prefix}/css/${name}.min.css${query}`;
  };

  return html
    .replace(
      /(href=["'])\/css\/([a-z0-9_-]+)\.css(\?[^"']*)?/gi,
      toMinified,
    )
    .replace(
      /(url\(\s*["']?)\/css\/([a-z0-9_-]+)\.css(\?[^"')\s]*)?/gi,
      toMinified,
    )
    .replace(
      /(["'])\/css\/([a-z0-9_-]+)\.css(\?[^"']*)?\1/gi,
      (match, quote, name, query = "") => {
        const next = toMinified(match, quote, name, query);
        return next === match ? match : `${next}${quote}`;
      },
  );
}

function minifyHtml(html, relativePath) {
  let next = gateDesktopCinematicScripts(html, relativePath);
  next = deferCinematicScripts(next);
  next = stabilizeMarketingStyles(next, relativePath);
  next = delayClarity(next);
  next = rewriteCssLinksToMinified(next);

  const protectedBlocks = protectBlocks(next);
  next = protectedBlocks.html;
  next = next.replace(/<!--(?!\[if|\s*<!|\s*<!\[endif)[\s\S]*?-->/g, "");
  next = next.replace(/>\s+</g, "><");
  next = next.replace(/[ \t]{2,}/g, " ");
  next = next.replace(/\n{2,}/g, "\n");
  next = next.trim();
  return protectedBlocks.restore(next);
}

async function minifyGeneratedFiles() {
  const files = walk(outputDir);
  let cssCount = 0;
  let jsCount = 0;
  let htmlCount = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (SKIP_MINIFY_EXTENSIONS.has(ext)) continue;

    const relative = path.relative(outputDir, file);

    if (ext === ".css") {
      const source = rewriteCssLinksToMinified(fs.readFileSync(file, "utf8"));
      const result = await esbuild.transform(source, {
        loader: "css",
        minify: true,
        legalComments: "none",
      });
      fs.writeFileSync(file, result.code, "utf8");
      cssCount += 1;
      continue;
    }

    if (ext === ".js" && !file.endsWith(".min.js")) {
      const source = rewriteCssLinksToMinified(fs.readFileSync(file, "utf8"));
      const result = await esbuild.transform(source, {
        loader: "js",
        minify: true,
        legalComments: "none",
        target: "es2020",
      });
      fs.writeFileSync(file, result.code, "utf8");
      jsCount += 1;
      continue;
    }

    if (ext === ".html") {
      const source = fs.readFileSync(file, "utf8");
      fs.writeFileSync(file, minifyHtml(source, relative), "utf8");
      htmlCount += 1;
    }
  }

  return { cssCount, jsCount, htmlCount };
}

function removeDistCssSourceDuplicates() {
  const cssDir = path.join(outputDir, "css");
  if (!fs.existsSync(cssDir)) return 0;

  let removed = 0;
  for (const entry of fs.readdirSync(cssDir, { withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".css") ||
      entry.name.endsWith(".min.css")
    ) {
      continue;
    }

    const parsed = path.parse(entry.name);
    const minPath = path.join(cssDir, `${parsed.name}.min.css`);
    if (!fs.existsSync(minPath)) continue;

    fs.rmSync(path.join(cssDir, entry.name), { force: true });
    removed += 1;
  }

  return removed;
}

async function main() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing public source directory: ${sourceDir}`);
  }

  copyPublicTree();
  await generateMinifiedCssVariants();
  await generateMarketingCriticalStyles();
  const counts = await minifyGeneratedFiles();
  const removedCssDuplicates = removeDistCssSourceDuplicates();

  console.log(
    `Deploy build ready in dist-public: ${counts.htmlCount} HTML, ${counts.cssCount} CSS, ${counts.jsCount} JS files optimized, ${removedCssDuplicates} duplicate source CSS files removed.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
