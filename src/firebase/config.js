// FILE: src/firebase/config.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDu8KjPKCP2qAPEYz2AH8Xj_LYOs7E-1VM",
  authDomain: "photobooth-glambot-surprise.firebaseapp.com",
  projectId: "photobooth-glambot-surprise",
  storageBucket: "photobooth-glambot-surprise.firebasestorage.app",
  messagingSenderId: "102734140131",
  appId: "1:102734140131:web:2e7bf8c5c3dd3a6cb2ebd6"
};

// Khởi tạo Firebase App theo Modular SDK v10 (tránh khởi tạo trùng lặp)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Khởi tạo Firebase Authentication và Firestore Database
const auth = getAuth(app);
const db = getFirestore(app);

export { firebaseConfig, app, auth, db };
