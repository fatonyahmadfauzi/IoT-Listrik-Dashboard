require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');

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
    console.error(error.message);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const db = admin.database();

function corsMiddleware(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
}

app.use(corsMiddleware);

app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'IoT Listrik Monitoring Backend is Running',
        databaseURL: databaseURL,
        endpoints: ['/health', '/api/listrik', '/api/logs?limit=20'],
    });
});

app.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'iot-listrik-backend-local',
        time: new Date().toISOString(),
    });
});

app.get('/api/listrik', async (req, res) => {
    try {
        const snap = await db.ref('/listrik').once('value');
        const val = snap.val() || {};
        res.json({
            arus: Number(val.arus ?? 0),
            tegangan: Number(val.tegangan ?? 0),
            daya: Number(val.daya ?? (val.arus ?? 0) * (val.tegangan ?? 0)),
            energi_kwh: Number(val.energi_kwh ?? 0),
            frekuensi: Number(val.frekuensi ?? 50),
            power_factor: Number(val.power_factor ?? 0.85),
            status: val.status || 'NORMAL',
            relay: val.relay === true || Number(val.relay) === 1 ? 1 : 0,
            updated_at: val.updated_at != null ? Number(val.updated_at) : null,
        });
    } catch (e) {
        console.error('[api/listrik]', e);
        res.status(500).json({ error: String(e.message || e) });
    }
});

app.get('/api/logs', async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 50);
    try {
        const snap = await db.ref('/logs').orderByKey().limitToLast(limit).once('value');
        const raw = snap.val() || {};
        const rows = Object.entries(raw)
            .map(([key, v]) => ({ id: key, ...v }))
            .reverse();
        res.json({ logs: rows });
    } catch (e) {
        console.error('[api/logs]', e);
        res.status(500).json({ error: String(e.message || e) });
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Local backend http://localhost:${PORT}`);
    console.log(`   GET /health  /api/listrik  /api/logs?limit=20`);
    console.log(`📡 Listening for database changes on /listrik/status ...`);
});

const statusRef = db.ref('/listrik/status');
let previousStatus = null;

statusRef.on('value', async (snapshot) => {
    const currentStatus = snapshot.val();

    if (currentStatus === previousStatus) return;

    console.log(`\n======================================================`);
    console.log(`🔔 STATUS CHANGED: ${previousStatus} -> ${currentStatus}`);

    if (currentStatus === 'DANGER') {
        console.log('🚨 CRITICAL: Status is DANGER. Triggering FCM Push Alarm!');
        const payload = {
            topic: 'iot_alarms',
            data: {
                action: 'TRIGGER_ALARM',
                status: 'DANGER',
                title: 'BAHAYA KRITIS!',
                message: '⚠️ Arus melewati threshold (Via Local Backend)!',
                source: 'hardware',
            },
            android: { priority: 'high' },
        };
        try {
            const response = await admin.messaging().send(payload);
            console.log(`✅ FCM sent. ID: ${response}`);
        } catch (error) {
            console.error('❌ FCM error:', error);
        }
    }

    if (currentStatus === 'NORMAL' && (previousStatus === 'DANGER' || previousStatus === 'WARNING')) {
        console.log('🟢 Status recovered to NORMAL. Triggering STOP FCM...');
        const payload = {
            topic: 'iot_alarms',
            data: { action: 'STOP_ALARM', status: 'NORMAL', source: 'hardware' },
            android: { priority: 'high' },
        };
        try {
            await admin.messaging().send(payload);
            console.log('✅ STOP FCM sent.');
        } catch (error) {
            console.error('❌ STOP FCM error:', error);
        }
    }

    previousStatus = currentStatus;
    console.log(`======================================================\n`);
});

process.on('uncaughtException', (err) => console.error('Unhandled Exception:', err));
process.on('unhandledRejection', (reason, promise) =>
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
);
