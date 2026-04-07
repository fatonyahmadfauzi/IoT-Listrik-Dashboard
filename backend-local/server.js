require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');

// 1. Initialize Firebase Admin SDK
// You MUST place serviceAccountKey.json in the same folder as this file.
// Or define FIREBASE_SERVICE_ACCOUNT_PATH in .env
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
const databaseURL = process.env.FIREBASE_DATABASE_URL;

if (!databaseURL) {
    console.error("❌ ERROR: FIREBASE_DATABASE_URL is missing in .env!");
    process.exit(1);
}

try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: databaseURL
    });
    console.log("✅ Firebase Admin SDK Initialized Successfully!");
} catch (error) {
    console.error(`❌ ERROR: Could not load Service Account Key from ${serviceAccountPath}`);
    console.error("Please make sure you have downloaded it from Firebase Console and placed it in the backend-local folder.");
    console.error(error.message);
    process.exit(1);
}

// 2. Setup Express Health Endpoint
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send({
        status: "OK",
        message: "IoT Listrik Monitoring Backend is Running",
        databaseURL: databaseURL
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Server (Health Endpoint) listening on http://localhost:${PORT}`);
    console.log(`📡 Listening for database changes on /listrik/status ...`);
});

// 3. Realtime Listener for /listrik/status
const db = admin.database();
const statusRef = db.ref('/listrik/status');
let previousStatus = null;

statusRef.on('value', async (snapshot) => {
    const currentStatus = snapshot.val();
    
    // Skip if unchanged or if initial load
    if (currentStatus === previousStatus) return;

    console.log(`\n======================================================`);
    console.log(`🔔 STATUS CHANGED: ${previousStatus} -> ${currentStatus}`);
    
    // Only trigger if status becomes DANGER
    if (currentStatus === "DANGER") {
        console.log("🚨 CRITICAL: Status is DANGER. Triggering FCM Push Alarm!");
        
        const payload = {
            topic: "iot_alarms",
            data: {
                action: "TRIGGER_ALARM",
                status: "DANGER",
                title: "BAHAYA KRITIS!",
                message: "⚠️ Kebocoran Arus Terdeteksi (Via Local Backend)!"
            },
            android: {
                priority: "high"
            }
        };
        
        try {
            const response = await admin.messaging().send(payload);
            console.log(`✅ Successfully sent FCM message. Message ID: ${response}`);
        } catch (error) {
            console.error("❌ Error sending FCM message:", error);
        }
    }

    // Trigger STOP if status recovers to NORMAL
    if (currentStatus === "NORMAL" && (previousStatus === "DANGER" || previousStatus === "WARNING")) {
        console.log("🟢 Status recovered to NORMAL. Triggering STOP FCM...");
        
        const payload = {
            topic: "iot_alarms",
            data: {
                action: "STOP_ALARM",
                status: "NORMAL"
            },
            android: {
                priority: "high"
            }
        };
        
        try {
            await admin.messaging().send(payload);
            console.log(`✅ Successfully sent STOP FCM message.`);
        } catch (error) {
            console.error("❌ Error sending STOP FCM message:", error);
        }
    }
    
    // Update local state
    previousStatus = currentStatus;
    console.log(`======================================================\n`);
});

// Error handling to prevent crash
process.on('uncaughtException', (err) => {
    console.error('Unhandled Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
