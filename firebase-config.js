/**
 * firebase-config.js
 * ─────────────────────────────────────────────────────────────
 * Central Firebase initialization.
 * All pages import { auth, db } from this file.
 *
 * IMPORTANT: Replace every placeholder below with your actual
 * Firebase project values from:
 *   Firebase Console → Project Settings → Your apps → Web app
 * ─────────────────────────────────────────────────────────────
 */

import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }         from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase }     from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getFunctions }    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// ─── FILL IN YOUR FIREBASE CONFIG HERE ───────────────────────
const firebaseConfig = {
  apiKey:            "ISI_API_KEY",
  authDomain:        "ISI_PROJECT_ID.firebaseapp.com",
  databaseURL:       "ISI_DATABASE_URL",
  projectId:         "ISI_PROJECT_ID",
  storageBucket:     "ISI_PROJECT_ID.appspot.com",
  messagingSenderId: "ISI_SENDER_ID",
  appId:             "ISI_APP_ID"
};
// ─────────────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);
// Functions region: use 'asia-southeast1' if you deploy to Singapore
const functions = getFunctions(app);

export { app, auth, db, functions, firebaseConfig };
