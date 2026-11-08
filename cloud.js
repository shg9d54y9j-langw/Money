// Cloud-Speicherung über Firebase (Auth + Firestore). Wird nur geladen, wenn firebase-config.js gefüllt ist.
const V = '11.0.2';
const base = `https://www.gstatic.com/firebasejs/${V}`;

export async function initCloud(config) {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);
  const app = initializeApp(config);
  const a = auth.getAuth(app);
  auth.useDeviceLanguage(a);
  let db;
  try {
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch {
    db = fs.getFirestore(app);
  }
  let uid = null;
  const expCol = () => fs.collection(db, 'users', uid, 'expenses');
  const userDoc = () => fs.doc(db, 'users', uid);

  return {
    onAuth(cb) { return auth.onAuthStateChanged(a, u => { uid = u?.uid || null; cb(u); }); },
    signIn: (email, pw) => auth.signInWithEmailAndPassword(a, email, pw),
    signUp: (email, pw) => auth.createUserWithEmailAndPassword(a, email, pw),
    resetPassword: email => auth.sendPasswordResetEmail(a, email),
    signOut: () => auth.signOut(a),

    subscribe({ onExpenses, onSettings, onError }) {
      const u1 = fs.onSnapshot(expCol(), { includeMetadataChanges: false },
        snap => onExpenses(snap.docs.map(d => d.data()), snap.metadata), onError);
      const u2 = fs.onSnapshot(userDoc(), snap => onSettings(snap.exists() ? snap.data().settings : null), onError);
      return () => { u1(); u2(); };
    },
    putExpense: e => fs.setDoc(fs.doc(expCol(), e.id), e),
    removeExpense: id => fs.deleteDoc(fs.doc(expCol(), id)),
    putSettings: s => fs.setDoc(userDoc(), { settings: s }, { merge: true }),
    async replaceAll(expenses, settings) {
      const existing = await fs.getDocs(expCol());
      const ops = [
        ...existing.docs.map(d => b => b.delete(d.ref)),
        ...expenses.map(e => b => b.set(fs.doc(expCol(), e.id), e)),
        b => b.set(userDoc(), { settings }),
      ];
      for (let i = 0; i < ops.length; i += 450) {
        const batch = fs.writeBatch(db);
        ops.slice(i, i + 450).forEach(op => op(batch));
        await batch.commit();
      }
    },
  };
}
