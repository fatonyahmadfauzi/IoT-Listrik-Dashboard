import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyBLr8oo64-ARn2TUuR6yj68Zi3MUR3qsRU',
  authDomain: 'iot-listrik-dashboard.firebaseapp.com',
  databaseURL:
    'https://iot-listrik-dashboard-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'iot-listrik-dashboard',
  storageBucket: 'iot-listrik-dashboard.firebasestorage.app',
  messagingSenderId: '690684049171',
  appId: '1:690684049171:web:b8953844f7512e69488ce6',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const functions = getFunctions(app, 'asia-southeast1');

// For local development with emulator (needs to be running on localhost:9000 for auth, 9001 for db)
// Uncomment to enable:
// if (window.location.hostname === 'localhost') {
//   connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//   connectDatabaseEmulator(db, 'localhost', 9000);
//   connectFunctionsEmulator(functions, 'localhost', 5001);
// }

export { app, auth, db, functions, firebaseConfig };
