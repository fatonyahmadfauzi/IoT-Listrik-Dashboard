const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist-public");
const sourceCssDir = path.join(rootDir, "public", "css");

const sourceMinCss = fs
  .readdirSync(sourceCssDir)
  .filter((file) => file.endsWith(".min.css"));

assert.deepStrictEqual(
  sourceMinCss,
  [],
  "public/css should stay as source CSS; generated .min.css files belong in dist-public only",
);

execFileSync(process.execPath, [path.join(rootDir, "scripts", "build-public-deploy.js")], {
  cwd: rootDir,
  stdio: "pipe",
});

for (const [page, cssFile] of [
  ["index.html", "index.critical.min.css"],
  ["features.html", "features.critical.min.css"],
  ["downloads.html", "downloads.critical.min.css"],
]) {
  const htmlPath = path.join(distDir, page);
  const cssPath = path.join(distDir, "css", cssFile);
  const html = fs.readFileSync(htmlPath, "utf8");

  assert(
    html.includes(`data-critical-css="${cssFile}"`),
    `${page} should inline ${cssFile}`,
  );
  assert(
    !html.includes(`href="/css/${cssFile}`),
    `${page} should not render-block on an external critical stylesheet`,
  );
  assert(
    !html.includes("/css/style.min.css"),
    `${page} should not render-block on the shared app stylesheet`,
  );
  assert(
    html.includes('data-delayed-clarity="wkpdqlv70s"'),
    `${page} should delay Clarity until after initial page load`,
  );
  assert(
    html.includes("Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,500,0,0") &&
      !html.includes("icon_names="),
    `${page} should load the stable Material Symbols variable font so icons do not render as text labels`,
  );
  assert(
    html.includes('data-desktop-cinematic-loader="20260506-desktop-only1"'),
    `${page} should lazy-load heavy cinematic scripts only on desktop-class devices`,
  );
  assert(
    !/<script[^>]+src=["']https:\/\/unpkg\.com\/lenis/i.test(html) &&
      !/<script[^>]+src=["']https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/gsap/i.test(html) &&
      !/<script[^>]+src=["']\/js\/cinematic-parallax\.js/i.test(html),
    `${page} should not load Lenis, GSAP, ScrollTrigger, or parallax directly before first render`,
  );
  assert(
    /<script[^>]+src=["']\/js\/scroll-reveal\.js[^"']*["'][^>]+defer/i.test(html),
    `${page} should keep the light reveal script deferred`,
  );
  assert(
    !html.includes('<script type="text/javascript">(function(c,l,a,r,i,t,y){c[a]=c[a]'),
    `${page} should not keep the original immediate Clarity bootstrap`,
  );
  assert(fs.existsSync(cssPath), `${cssFile} should be generated`);

  const css = fs.readFileSync(cssPath, "utf8");
  assert(
    css.includes("cine-ready") && css.includes("revealed"),
    `${cssFile} should keep cinematic reveal state selectors`,
  );
}

const fullCss = fs.statSync(path.join(distDir, "css", "style.min.css")).size;
const indexCss = fs.statSync(path.join(distDir, "css", "index.critical.min.css")).size;
const indexCriticalCss = fs.readFileSync(path.join(distDir, "css", "index.critical.min.css"), "utf8");

for (const file of [
  "style.min.css",
  "cinematic-animations.min.css",
  "responsive-system.min.css",
  "features.min.css",
  "downloads.min.css",
]) {
  assert(fs.existsSync(path.join(distDir, "css", file)), `${file} should be generated for deploy`);
}

for (const file of [
  "style.css",
  "cinematic-animations.css",
  "responsive-system.css",
  "features.css",
  "downloads.css",
]) {
  assert(
    !fs.existsSync(path.join(distDir, "css", file)),
    `${file} should not remain in dist-public when a .min.css deploy copy exists`,
  );
}

const appUsersHtml = fs.readFileSync(path.join(distDir, "app", "users.html"), "utf8");
assert(
  appUsersHtml.includes('data-delayed-clarity="wkpdqlv70s"') &&
    !appUsersHtml.includes('<script type="text/javascript">(function(c,l,a,r,i,t,y){c[a]=c[a]'),
  "app/users should delay Clarity instead of loading it during initial render",
);

assert(
  indexCss < fullCss * 0.65,
  `index critical CSS should be substantially smaller than style.min.css (${indexCss} vs ${fullCss})`,
);

assert(
  indexCriticalCss.includes("[data-cine-hero] .landing-badge,[data-cine-hero] h1") &&
    indexCriticalCss.lastIndexOf("[data-cine-hero] .landing-badge,[data-cine-hero] h1") >
      indexCriticalCss.indexOf("[data-cine-hero] h1{opacity:0") &&
    indexCriticalCss.slice(indexCriticalCss.lastIndexOf("[data-cine-hero] .landing-badge,[data-cine-hero] h1")).includes("opacity:1;transform:none"),
  "index critical CSS should keep homepage LCP hero text visible before cinematic JS runs",
);

console.log("build-public-deploy test OK");
