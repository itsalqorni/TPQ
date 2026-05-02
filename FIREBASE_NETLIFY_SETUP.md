# Firebase + Netlify Setup

Website ini sudah siap pakai Firebase Firestore supaya data akun dan setoran sinkron antar HP/laptop.

## 1. Buat Firebase gratis

1. Buka Firebase Console.
2. Buat project baru.
3. Masuk ke Build > Firestore Database.
4. Klik Create database, pilih Test mode dulu untuk uji coba.
5. Masuk ke Project settings > Your apps > Web app.
6. Salin nilai `firebaseConfig`.

## 2. Isi config untuk local test

Edit `firebase-config.js`, isi nilai dari Firebase:

```js
window.TPQ_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## 3. Deploy gratis ke Netlify

Di Netlify, deploy folder project ini. Karena ada `netlify.toml`, Netlify akan menjalankan:

```bash
node build-firebase-config.js
```

Tambahkan environment variables ini di Netlify:

```text
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

Setelah deploy, semua device yang membuka URL Netlify yang sama akan membaca data dari Firestore yang sama.

## Catatan keamanan

Mode Firestore `Test mode` hanya untuk percobaan. Untuk pemakaian sungguhan, pakai Firebase Authentication dan rules yang lebih ketat.
