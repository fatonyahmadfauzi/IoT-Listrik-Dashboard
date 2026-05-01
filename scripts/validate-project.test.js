const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const validator = require("./validate-project");

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "iot-validate-"));
  fs.mkdirSync(path.join(root, "public", "css"), { recursive: true });
  fs.mkdirSync(path.join(root, "public", "js"), { recursive: true });
  fs.mkdirSync(path.join(root, "public", "app"), { recursive: true });
  fs.mkdirSync(path.join(root, "functions"), { recursive: true });
  fs.mkdirSync(path.join(root, "api"), { recursive: true });
  fs.mkdirSync(path.join(root, "hardware", "main"), { recursive: true });

  fs.writeFileSync(path.join(root, "public", "index.html"), [
    "<!doctype html>",
    "<html><head>",
    '<link rel="stylesheet" href="/css/style.css?v=1">',
    '<script type="module" src="./js/app.js"></script>',
    "</head><body></body></html>",
  ].join("\n"));
  fs.writeFileSync(path.join(root, "public", "css", "style.css"), "body{}");
  fs.writeFileSync(path.join(root, "public", "js", "app.js"), "console.info('ok');");
  for (const page of ["login", "dashboard", "history", "settings", "telegram", "discord", "users"]) {
    const body = page === "settings"
      ? "settings autoLearningSection inpLearningDuration startAutoLearningBtn"
      : page;
    const html = `<!doctype html><html><head><title>${page}</title></head><body>${body}</body></html>`;
    fs.writeFileSync(path.join(root, "public", `${page}.html`), html);
    fs.writeFileSync(path.join(root, "public", "app", `${page}.html`), html);
  }
  fs.writeFileSync(path.join(root, "vercel.json"), JSON.stringify({
    headers: [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' https://*.firebaseio.com https://*.firebasedatabase.app;",
          },
        ],
      },
    ],
    rewrites: [
      { source: "/dashboard", destination: "/index.html" },
      { source: "/api/test", destination: "/api/test" },
    ],
  }));
  fs.writeFileSync(path.join(root, "database.rules.json"), "{\"autoLearning\":true}");
  fs.writeFileSync(path.join(root, "app-version.json"), "{}");
  fs.writeFileSync(path.join(root, "firebase.json"), "{}");
  fs.writeFileSync(path.join(root, "functions", "index.js"), "exports.ok = true;\n");
  fs.writeFileSync(path.join(root, "api", "test.js"), "module.exports = (req,res)=>res.end('ok');\n");
  fs.writeFileSync(path.join(root, "public", "js", "settings.js"), "function startAutoLearning(){}; const p = 'settings/autoLearning';\n");
  fs.writeFileSync(path.join(root, "hardware", "config.h"), "bool autoLearningActive = false;\n");
  fs.writeFileSync(path.join(root, "hardware", "config.example.h"), "bool autoLearningActive = false;\n");
  fs.writeFileSync(path.join(root, "hardware", "firebase_handler.h"), "autoLearning/active writeAutoLearningResult\n");
  fs.writeFileSync(path.join(root, "hardware", "main", "main.ino"), "void handleAutoLearning(){}\n");

  return root;
}

function runFixtureValidation() {
  const root = makeFixture();
  const result = validator.validateProject({ rootDir: root, silent: true });
  assert.deepStrictEqual(result.errors, []);
}

function runMissingAssetValidation() {
  const root = makeFixture();
  fs.writeFileSync(path.join(root, "public", "index.html"), [
    "<!doctype html>",
    "<html><head>",
    '<script src="/js/missing.js"></script>',
    "</head><body></body></html>",
  ].join("\n"));

  const result = validator.validateProject({ rootDir: root, silent: true });
  assert(result.errors.some((line) => line.includes("/js/missing.js")));
}

runFixtureValidation();
runMissingAssetValidation();
console.log("validate-project self-test OK");
