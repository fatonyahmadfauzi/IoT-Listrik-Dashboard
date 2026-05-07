#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const rootDir = path.resolve(__dirname, "..");
const cssDir = path.join(rootDir, "public", "css");
const outputDir = path.join(rootDir, ".tmp", "css-min-check");

function shouldBuildMinifiedCopy(fileName) {
  return (
    fileName.endsWith(".css") &&
    !fileName.endsWith(".min.css") &&
    !fileName.endsWith(".purged.css")
  );
}

async function minifyCssFile(sourcePath) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const result = await esbuild.transform(source, {
    loader: "css",
    minify: true,
    legalComments: "none",
  });

  const parsed = path.parse(sourcePath);
  const targetPath = path.join(outputDir, `${parsed.name}.min.css`);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, result.code, "utf8");
  return path.relative(rootDir, targetPath);
}

async function main() {
  if (!fs.existsSync(cssDir)) {
    throw new Error(`Missing CSS directory: ${cssDir}`);
  }

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const outputs = [];
  for (const entry of fs.readdirSync(cssDir, { withFileTypes: true })) {
    if (!entry.isFile() || !shouldBuildMinifiedCopy(entry.name)) continue;
    outputs.push(await minifyCssFile(path.join(cssDir, entry.name)));
  }

  console.log(`CSS minify check ready: ${outputs.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
