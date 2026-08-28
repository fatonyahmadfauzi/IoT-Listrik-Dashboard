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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, initializeAuth, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
// ─── FILL IN YOUR FIREBASE CONFIG HERE ───────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBLr8oo64-ARn2TUuR6yj68Zi3MUR3qsRU",
  authDomain: "iot-listrik-dashboard.firebaseapp.com",
  databaseURL: "https://iot-listrik-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iot-listrik-dashboard",
  storageBucket: "iot-listrik-dashboard.firebasestorage.app",
  messagingSenderId: "690684049171",
  appId: "1:690684049171:web:b8953844f7512e69488ce6"
};
// ─────────────────────────────────────────────────────────────

const isSim = window.location.pathname.startsWith("/simulator/");

let app;
let auth;

if (isSim) {
  // Untuk Simulator: Buat wadah/App terpisah dengan Session Storage.
  // Ini memastikan otentikasi di simulator terpisah TOTAL dari Dashboard,
  // dan setiap Tab PWA Simulator yang dibuka akan memiliki sesi (akun temp) sendiri-sendiri.
  app = initializeApp(firebaseConfig, "SIMULATOR_APP");
  auth = initializeAuth(app, {
    persistence: browserSessionPersistence
  });
} else {
  // Untuk Dashboard: Gunakan wadah utama dengan memori IndexedDB (tetap login pasca tab ditutup)
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

const db = getDatabase(app);
// Region disesuaikan dengan database (asia-southeast1 = Singapore)
const functions = getFunctions(app, 'asia-southeast1');
const messaging = typeof window !== "undefined" && "Notification" in window ? getMessaging(app) : null;

export { app, auth, db, functions, messaging, getToken, firebaseConfig };
