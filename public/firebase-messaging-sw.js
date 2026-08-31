importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBLr8oo64-ARn2TUuR6yj68Zi3MUR3qsRU",
  authDomain: "iot-listrik-dashboard.firebaseapp.com",
  databaseURL: "https://iot-listrik-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iot-listrik-dashboard",
  storageBucket: "iot-listrik-dashboard.firebasestorage.app",
  messagingSenderId: "690684049171",
  appId: "1:690684049171:web:b8953844f7512e69488ce6"
};

const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'System Alert';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || '',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-96.png',
    vibrate: [200, 100, 200],
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
