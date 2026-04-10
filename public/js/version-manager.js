/**
 * Version Manager - Automatically sync download URLs across website and CLI
 * This file reads from app-version.json and provides utilities for version management
 */

class VersionManager {
  constructor(versionJsonUrl = "/app-version.json") {
    this.versionJsonUrl = versionJsonUrl;
    this.versionData = null;
  }

  async loadVersion() {
    try {
      const response = await fetch(this.versionJsonUrl);
      this.versionData = await response.json();
      return this.versionData;
    } catch (error) {
      console.error("Failed to load version data:", error);
      return null;
    }
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
        // Default to setup if no type specified
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

  // Update download link in HTML element
  async updateDownloadLink(elementId, platform, type = null) {
    if (!this.versionData) {
      await this.loadVersion();
    }

    const element = document.getElementById(elementId);
    if (!element) return;

    const url = this.getDownloadUrl(platform, type);
    if (url) {
      element.href = url;
    }
  }

  // Update multiple download links
  async updateAllDownloadLinks(mappings) {
    if (!this.versionData) {
      await this.loadVersion();
    }

    mappings.forEach(({ elementId, platform, type }) => {
      const element = document.getElementById(elementId);
      if (element) {
        const url = this.getDownloadUrl(platform, type);
        if (url) {
          element.href = url;
          const filename = this.getDownloadFilename(platform, type);
          if (filename && !element.textContent.includes(filename)) {
            element.textContent = filename;
          }
        }
      }
    });
  }
}

// Export for use in Node.js/CLI
if (typeof module !== "undefined" && module.exports) {
  module.exports = VersionManager;
}

// Auto-load on page load if in browser
if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", async () => {
    const vm = new VersionManager();
    await vm.loadVersion();
    window.versionManager = vm;
  });
}
