import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyD99N-FQdkTPNnNGY-fof6ijskxg0bzARc',
  authDomain: 'monitoring-listrik-719b1.firebaseapp.com',
  databaseURL:
    'https://monitoring-listrik-719b1-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'monitoring-listrik-719b1',
  storageBucket: 'monitoring-listrik-719b1.firebasestorage.app',
  messagingSenderId: '115654600721',
  appId: '1:115654600721:web:6b971ee1c19be7e045a9b0',
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
