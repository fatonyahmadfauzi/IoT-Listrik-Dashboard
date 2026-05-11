import { injectSpeedInsights } from "@vercel/speed-insights";

const hostname = window.location.hostname;
const isVercelHost =
  hostname === "iot-listrik-dashboard.vercel.app" ||
  hostname === "www.iot-listrik-dashboard.vercel.app" ||
  hostname.endsWith(".vercel.app");

if (isVercelHost) {
  injectSpeedInsights();
}
