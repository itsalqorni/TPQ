const Cloud = (() => {
  const USERS_KEY = "tpq_auth_users";
  const DEPOSITS_KEY = "tpq_hafalan_deposits";
  const config = window.TPQ_FIREBASE_CONFIG || {};
  const isConfigured = Boolean(config.apiKey && config.projectId && window.firebase);
  let db = null;

  if (isConfigured) {
    firebase.initializeApp(config);
    db = firebase.firestore();
  }

  function readLocal(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value || fallback;
    } catch {
      return fallback;
    }
  }

  function writeLocal(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async function loadCollection(collectionName, localKey, fallback = []) {
    if (!db) return readLocal(localKey, fallback);

    try {
      const snapshot = await db.collection(collectionName).get();
      const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      if (rows.length) writeLocal(localKey, rows);
      return rows.length ? rows : readLocal(localKey, fallback);
    } catch {
      return readLocal(localKey, fallback);
    }
  }

  async function saveCollection(collectionName, localKey, rows) {
    writeLocal(localKey, rows);
    if (!db) return;

    try {
      const batch = db.batch();
      rows.forEach((row) => {
        const ref = db.collection(collectionName).doc(row.id || `${collectionName}-${Date.now()}-${Math.random()}`);
        batch.set(ref, row, { merge: true });
      });
      await batch.commit();
    } catch {
      // Local data is already saved above; Firestore can be configured later.
    }
  }

  function watchCollection(collectionName, localKey, callback) {
    if (!db) return () => {};

    return db.collection(collectionName).onSnapshot(
      (snapshot) => {
        const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        writeLocal(localKey, rows);
        callback(rows);
      },
      () => {
        callback(readLocal(localKey, []));
      }
    );
  }

  async function loadUsers(fallback) {
    return loadCollection("users", USERS_KEY, fallback);
  }

  async function saveUsers(users) {
    return saveCollection("users", USERS_KEY, users);
  }

  async function loadDeposits() {
    const rows = await loadCollection("deposits", DEPOSITS_KEY, []);
    return rows.sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`));
  }

  async function saveDeposits(deposits) {
    return saveCollection("deposits", DEPOSITS_KEY, deposits);
  }

  function watchUsers(callback) {
    return watchCollection("users", USERS_KEY, callback);
  }

  function watchDeposits(callback) {
    return watchCollection("deposits", DEPOSITS_KEY, (rows) => {
      callback(rows.sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`)));
    });
  }

  return {
    isOnline: Boolean(db),
    loadUsers,
    saveUsers,
    loadDeposits,
    saveDeposits,
    watchUsers,
    watchDeposits
  };
})();
