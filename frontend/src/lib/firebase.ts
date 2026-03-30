import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCa7-wCmSNqh9hH6qZyaBA_gmCEJKAJV5A",
  authDomain: "magnet-manufacturing.firebaseapp.com",
  databaseURL: "https://magnet-manufacturing-default-rtdb.firebaseio.com",
  projectId: "magnet-manufacturing",
  storageBucket: "magnet-manufacturing.firebasestorage.app",
  messagingSenderId: "316772664262",
  appId: "1:316772664262:web:cb6213a07949d1684da8c7",
  measurementId: "G-2HCWWLK8TV",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const database = getDatabase(app);
export default app;
