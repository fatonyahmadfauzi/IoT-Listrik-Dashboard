importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyD99N-FQdkTPNnNGY-fof6ijskxg0bzARc",
  authDomain: "monitoring-listrik-719b1.firebaseapp.com",
  databaseURL: "https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "monitoring-listrik-719b1",
  storageBucket: "monitoring-listrik-719b1.firebasestorage.app",
  messagingSenderId: "115654600721",
  appId: "1:115654600721:web:6b971ee1c19be7e045a9b0"
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
