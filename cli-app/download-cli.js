#!/usr/bin/env node
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";
import { createWriteStream } from "fs";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Version Manager class for CLI
class VersionManager {
  constructor(versionJsonUrl) {
    // Try production URL first, fallback to localhost for development
    this.versionJsonUrls = [
      versionJsonUrl ||
        "https://iot-listrik-dashboard.vercel.app/app-version.json",
      "http://localhost:3000/app-version.json",
      "http://localhost/app-version.json",
      join(__dirname, "..", "app-version.json"), // Local fallback
    ];
    this.versionData = null;
  }

  async loadVersion() {
    for (const url of this.versionJsonUrls) {
      try {
        if (url.startsWith("http")) {
          // Remote URL
          const protocol = url.startsWith("https:") ? https : http;
          const data = await new Promise((resolve, reject) => {
            const req = protocol.get(url, (res) => {
              let data = "";
              res.on("data", (chunk) => (data += chunk));
              res.on("end", () => {
                try {
                  resolve(JSON.parse(data));
                } catch (e) {
                  reject(new Error("Failed to parse version data"));
                }
              });
            });
            req.on("error", reject);
            req.setTimeout(5000, () => {
              req.destroy();
              reject(new Error("Request timeout"));
            });
          });
          this.versionData = data;
          return data;
        } else {
          // Local file
          const data = JSON.parse(readFileSync(url, "utf8"));
          this.versionData = data;
          return data;
        }
      } catch (error) {
        console.warn(`Failed to load from ${url}: ${error.message}`);
        continue;
      }
    }
    throw new Error("Failed to load version data from all sources");
  }

  getVersion() {
    return this.versionData?.version || "unknown";
  }

  getDownloadUrl(platform, type = null) {
    if (!this.versionData) return null;

    switch (platform.toLowerCase()) {
      case "android":
        return this.versionData.downloads.android?.url;
      case "windows":
        if (type === "setup") {
          return this.versionData.downloads.windows?.setup?.url;
        } else if (type === "portable") {
          return this.versionData.downloads.windows?.portable?.url;
        } else if (type === "msi") {
          return this.versionData.downloads.windows?.msi?.url;
        }
        return this.versionData.downloads.windows?.setup?.url;
      default:
        return null;
    }
  }

  getDownloadFilename(platform, type = null) {
    if (!this.versionData) return null;

    switch (platform.toLowerCase()) {
      case "android":
        return this.versionData.downloads.android?.filename;
      case "windows":
        if (type === "setup") {
          return this.versionData.downloads.windows?.setup?.filename;
        } else if (type === "portable") {
          return this.versionData.downloads.windows?.portable?.filename;
        } else if (type === "msi") {
          return this.versionData.downloads.windows?.msi?.filename;
        }
        return this.versionData.downloads.windows?.setup?.filename;
      default:
        return null;
    }
  }

  getAllDownloads() {
    return this.versionData?.downloads || {};
  }
}

// Download function
async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https:") ? https : http;
    const req = protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }

      const totalSize = parseInt(res.headers["content-length"], 10);
      let downloadedSize = 0;

      const fileStream = createWriteStream(outputPath);
      res.pipe(fileStream);

      res.on("data", (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(
            `\rDownloading... ${progress}% (${downloadedSize}/${totalSize} bytes)`,
          );
        }
      });

      fileStream.on("finish", () => {
        fileStream.close();
        console.log("\nDownload completed!");
        resolve();
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Download timeout"));
    });
  });
}

// Detect platform
function detectPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "win32") {
    return { platform: "windows", arch };
  } else if (platform === "android") {
    return { platform: "android", arch };
  } else {
    return { platform: "unknown", arch };
  }
}

// Main CLI function
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
IoT Listrik Dashboard - Auto Download CLI
Usage: node download-cli.js [options]

Options:
  --platform <platform>    Platform: windows, android (default: auto-detect)
  --type <type>           Type: setup, portable, msi (Windows only, default: setup)
  --arch <arch>           Architecture: x64, ia32, arm64 (default: auto-detect)
  --output <path>         Output file path (default: auto-generated)
  --latest               Download latest version (default: true)
  --list                 List available downloads
  --help, -h             Show this help

Examples:
  node download-cli.js                    # Download latest for current platform
  node download-cli.js --platform windows --type portable
  node download-cli.js --platform windows --type msi
  node download-cli.js --platform android
  node download-cli.js --list
`);
    return;
  }

  if (args.includes("--list")) {
    const vm = new VersionManager(
      "https://iot-listrik-dashboard.vercel.app/app-version.json",
    );
    try {
      await vm.loadVersion();
      console.log(`\nLatest Version: ${vm.getVersion()}`);
      console.log("\nAvailable Downloads:");

      const downloads = vm.getAllDownloads();
      Object.entries(downloads).forEach(([platform, data]) => {
        console.log(`\n${platform.toUpperCase()}:`);
        if (platform === "android") {
          console.log(`  ${data.filename} (${data.size})`);
        } else if (platform === "windows") {
          console.log(`  Setup: ${data.setup.filename} (${data.setup.size})`);
          console.log(
            `  Portable: ${data.portable.filename} (${data.portable.size})`,
          );
          if (data.msi) {
            console.log(`  MSI: ${data.msi.filename} (${data.msi.size})`);
          }
        }
      });
    } catch (error) {
      console.error("Failed to load version information:", error.message);
      process.exit(1);
    }
    return;
  }

  // Parse arguments
  let platform = null;
  let type = "setup";
  let arch = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--platform":
        platform = args[++i];
        break;
      case "--type":
        type = args[++i];
        break;
      case "--arch":
        arch = args[++i];
        break;
      case "--output":
        outputPath = args[++i];
        break;
    }
  }

  // Auto-detect if not specified
  if (!platform || !arch) {
    const detected = detectPlatform();
    platform = platform || detected.platform;
    arch = arch || detected.arch;
  }

  console.log(`Detected platform: ${platform}, architecture: ${arch}`);

  // Initialize version manager
  const vm = new VersionManager(
    "https://iot-listrik-dashboard.vercel.app/app-version.json",
  );

  try {
    console.log("Loading version information...");
    await vm.loadVersion();
    console.log(`Latest version: ${vm.getVersion()}`);

    const downloadUrl = vm.getDownloadUrl(platform, type);
    const filename = vm.getDownloadFilename(platform, type);

    if (!downloadUrl || !filename) {
      console.error(
        `No download available for platform: ${platform}, type: ${type}`,
      );
      process.exit(1);
    }

    // Generate output path
    if (!outputPath) {
      outputPath = filename;
    }

    console.log(`Downloading: ${filename}`);
    console.log(`From: ${downloadUrl}`);
    console.log(`To: ${outputPath}`);

    // Use localhost for local file access
    const fullUrl = downloadUrl.startsWith("/")
      ? `http://localhost${downloadUrl}`
      : downloadUrl;

    await downloadFile(fullUrl, outputPath);

    console.log(`\nSuccess! File saved as: ${outputPath}`);

    // For Windows setup, offer to run installer
    if (
      platform === "windows" &&
      type === "setup" &&
      outputPath.endsWith(".exe")
    ) {
      console.log("\nWould you like to run the installer now? (y/N): ");
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", (key) => {
        if (key.toString() === "y" || key.toString() === "Y") {
          try {
            execSync(`"${outputPath}"`, { stdio: "inherit" });
          } catch (error) {
            console.log("Installer exited.");
          }
        }
        process.exit(0);
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
