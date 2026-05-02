const fs = require("fs");

const fallbackConfig = {
  apiKey: "AIzaSyCOFdSw24gapiAt1s_6BBVx96aroSpq2kY",
  authDomain: "flutter-firebase-tutoria-4ee20.firebaseapp.com",
  projectId: "flutter-firebase-tutoria-4ee20",
  storageBucket: "flutter-firebase-tutoria-4ee20.firebasestorage.app",
  messagingSenderId: "418782982646",
  appId: "1:418782982646:web:a8888ba96b11fe73bb17d7",
  measurementId: "G-JB0GHXKKX2"
};

const config = {
  apiKey: process.env.FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || fallbackConfig.appId,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || fallbackConfig.measurementId
};

fs.writeFileSync(
  "firebase-config.js",
  `window.TPQ_FIREBASE_CONFIG = ${JSON.stringify(config, null, 2)};\n`
);
