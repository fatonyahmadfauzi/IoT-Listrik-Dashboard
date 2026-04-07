const fs = require('fs');
const path = require('path');

const drawableDir = path.join(__dirname, 'android-app', 'app', 'src', 'main', 'res', 'drawable');
if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });

const vectors = {
  'ic_bolt.xml': 'M11,21h-1l1-7H7.5c-0.58,0-0.57-0.32-0.38-0.66C7.67,12.24,9.02,9.68,10.96,5.83C11.13,5.49,11.53,5.3,11.9,5.4c0.03,0.01,0.07,0.02,0.1,0.04L13,13h3.5c0.49,0,0.56,0.33,0.46,0.57c-0.09,0.22-4.04,7.44-5.96,11.13V24',
  'ic_plug.xml': 'M16,7V3h-2v4h-4V3H8v4H6v7.5L9.5,18v3h5v-3l3.5-3.5V7H16z',
  'ic_warning.xml': 'M12,2L1,21h22L12,2z M12,6l7.53,13H4.47L12,6z M11,10v4h2v-4H11z M11,16v2h2v-2H11z',
  'ic_dashboard.xml': 'M3,13h8V3H3V13z M3,21h8v-6H3V21z M13,21h8V11h-8V21z M13,3v6h8V3H13z',
  'ic_settings.xml': 'M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z',
  'ic_history.xml': 'M13,3c-4.97,0-9,4.03-9,9H1l3.89,3.89l0.07,0.14L9,12H6c0-3.87,3.13-7,7-7s7,3.13,7,7s-3.13,7-7,7c-1.93,0-3.68-0.79-4.94-2.06l-1.42,1.42C8.27,19.99,10.51,21,13,21c4.97,0,9-4.03,9-9S17.97,3,13,3z M12,8v5l4.28,2.54l0.72-1.21l-3.5-2.08V8H12z',
  'ic_chart.xml': 'M3.5,18.49l6-6.01l4,4L22,6.92l-1.41-1.41l-7.09,7.97l-4-4l-8,8.01L3.5,18.49z'
};

for (const [name, pathData] of Object.entries(vectors)) {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24.0"
    android:viewportHeight="24.0">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="${pathData}"/>
</vector>`;
  fs.writeFileSync(path.join(drawableDir, name), xml, 'utf8');
  console.log(`Created ${name}`);
}
