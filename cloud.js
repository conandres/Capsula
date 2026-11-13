/* Capa de nube de Cápsula: inicio de sesión con Google + Firestore.
   Se carga desde index.html con import(). Expone window.CLOUD y llama a window.APP. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithCredential, GoogleAuthProvider, signOut }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, getDoc, setDoc, updateDoc, addDoc, writeBatch, onSnapshot, query, orderBy, limit,
  serverTimestamp, arrayUnion, arrayRemove }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const A = window.APP;
const fb = (window.CAPSULA_CONFIG || {}).firebase || {};
const CLOUD = (window.CLOUD = { ready: false, configured: false });

const GEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode() {
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  return [...a].map(n => GEN[n % 32]).join('');
}

if (!fb.apiKey || /^PEGA/i.test(fb.apiKey)) A.noConfig();
else start();

function start() {
  const app = initializeApp(fb);
  const auth = getAuth(app);
  let db;
  try {
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (e) { db = getFirestore(app); }
  CLOUD.configured = true;

  let me = null, famIds = [], families = [], active = null, subs = [];
  let lastP = '', lastM = '', timer = null, gen = 0, ready = false;

  const userRef = () => doc(db, 'users', me.uid);
  const base = () => (active ? ['families', active] : ['users', me.uid]);
  const pick = (id, d) => ({ id, name: d.name || 'Familia', code: d.code || '', ownerUid: d.ownerUid || '' });

  /* ---------- guardado del progreso personal (con espera para no escribir de más) ---------- */
  const pHash = p => JSON.stringify({ ...p, pt: { ...p.pt, t: 0, love: Math.round(p.pt.love), food: Math.round(p.pt.food) } });
  const mHash = p => [p.xp, p.pet.kind, p.pet.name, p.name].join('|');

  function flush(force) {
    if (!me || !ready) return;
    clearTimeout(timer);
    const p = A.personal(), ph = pHash(p), mh = mHash(p);
    if (force || ph !== lastP) {
      lastP = ph;
      setDoc(userRef(), { ...p, email: me.email, photo: me.photo, updatedAt: serverTimestamp() }, { merge: true })
        .catch(e => { lastP = ''; console.warn('No se guardó el progreso', e); });
    }
    if (force || mh !== lastM) {
      lastM = mh;
      famIds.forEach(fid =>
        updateDoc(doc(db, 'families', fid, 'members', me.uid),
          { name: p.name, petKind: p.pet.kind, petName: p.pet.name, xp: p.xp })
          .catch(e => console.warn('No se actualizó tu ficha de familia', e)));
    }
  }
  CLOUD.dirty = () => { if (!ready) return; clearTimeout(timer); timer = setTimeout(() => flush(false), 2500); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(false); });
  addEventListener('pagehide', () => flush(false));

  /* ---------- listeners de la familia activa ---------- */
  function teardown() { subs.forEach(u => { try { u(); } catch (e) {} }); subs = []; }

  function norm(d) {
    const x = d.data({ serverTimestamps: 'estimate' });
    const rx = [x.rx0 || [], x.rx1 || [], x.rx2 || []];
    return {
      id: d.id, k: x.k, t: x.t || '', x: x.x || {}, by: x.by || '',
      a: x.authorUid === me.uid ? 'me' : x.authorUid, an: x.authorName || '',
      ts: x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : Date.now(),
      r: rx.map(a => a.filter(u => u !== me.uid).length),
      m: rx.map(a => (a.includes(me.uid) ? 1 : 0))
    };
  }

  function subscribe(fid) {
    teardown();
    const warn = e => console.warn('Escucha de datos', e);
    if (fid) {
      subs.push(onSnapshot(collection(db, 'families', fid, 'members'), s => {
        const m = {}; s.forEach(d => { m[d.id] = d.data(); }); A.members(m);
      }, warn));
      subs.push(onSnapshot(doc(db, 'families', fid), s => { if (s.exists()) A.group(pick(fid, s.data())); }, warn));
    } else A.members({});
    const q = query(collection(db, ...base(), 'posts'), orderBy('createdAt', 'desc'), limit(60));
    subs.push(onSnapshot(q, s => A.posts(s.docs.map(norm)), warn));
  }

  async function loadFamilies() {
    const res = await Promise.all(famIds.map(async id => {
      try { const s = await getDoc(doc(db, 'families', id)); return s.exists() ? pick(id, s.data()) : null; }
      catch (e) {
        if (e && e.code === 'permission-denied') {
          setDoc(userRef(), { familyIds: arrayRemove(id) }, { merge: true }).catch(() => {});
          return { gone: id };
        }
        return null;
      }
    }));
    const gone = res.filter(r => r && r.gone).map(r => r.gone);
    if (gone.length) famIds = famIds.filter(i => !gone.includes(i));
    families = res.filter(r => r && !r.gone);
    A.families(families);
    return families;
  }

  /* ---------- sesión ---------- */
  onAuthStateChanged(auth, async u => {
    const g = ++gen;
    if (!u) { teardown(); me = null; ready = false; CLOUD.ready = false; A.signedOut(); return; }
    me = { uid: u.uid, email: u.email || '', name: (u.displayName || '').split(' ')[0], photo: u.photoURL || '' };
    let data = null, isNew = false;
    try { const s = await getDoc(userRef()); data = s.exists() ? s.data() : null; }
    catch (e) {
      data = A.localCache(me.uid);
      if (!data) { A.cloudError('No pudimos cargar tu cuenta. Revisa tu conexión e intenta de nuevo.'); return; }
    }
    if (g !== gen) return;
    if (!data) { isNew = true; data = A.legacy() || {}; }
    famIds = Array.isArray(data.familyIds) ? data.familyIds.slice() : [];
    A.applyUser(data, me);
    await loadFamilies();
    if (g !== gen) return;
    active = data.active && famIds.includes(data.active) ? data.active : famIds[0] || null;
    ready = true; CLOUD.ready = true;
    A.setGroup(families.find(f => f.id === active) || null);
    if (isNew) {
      setDoc(userRef(), { createdAt: serverTimestamp(), familyIds: [] }, { merge: true }).catch(() => {});
      flush(true); A.legacyDone();
    } else {
      const p = A.personal(); lastP = pHash(p); lastM = mHash(p);
      if ((data.active || null) !== active) flush(true);
    }
    subscribe(active);
    A.afterLogin();
  });

  CLOUD.signIn = idToken => signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  CLOUD.signOut = async () => { flush(false); await signOut(auth); };

  /* ---------- familias ---------- */
  const memberData = code => ({
    name: A.personal().name, petKind: A.personal().pet.kind, petName: A.personal().pet.name,
    xp: A.personal().xp, photo: me.photo || '', joinCode: code, joinedAt: serverTimestamp()
  });

  function enter(fam) {
    if (!famIds.includes(fam.id)) famIds.push(fam.id);
    families = families.filter(f => f.id !== fam.id).concat(fam);
    A.families(families);
    active = fam.id;
    A.setGroup(fam);
    A.switched();
    subscribe(active);
    CLOUD.dirty();
  }

  CLOUD.createFamily = async name => {
    for (let i = 0; i < 6; i++) {
      const code = genCode(), fref = doc(collection(db, 'families')), b = writeBatch(db);
      b.set(fref, { name, code, ownerUid: me.uid, createdAt: serverTimestamp() });
      b.set(doc(db, 'families', fref.id, 'members', me.uid), memberData(code));
      b.set(doc(db, 'familyCodes', code), { familyId: fref.id, ownerUid: me.uid });
      b.set(userRef(), { familyIds: arrayUnion(fref.id) }, { merge: true });
      try { await b.commit(); }
      catch (e) { if (e && e.code === 'permission-denied' && i < 5) continue; throw e; }
      const fam = { id: fref.id, name, code, ownerUid: me.uid };
      enter(fam);
      return fam;
    }
  };

  CLOUD.joinFamily = async raw => {
    const code = String(raw || '').trim().toUpperCase();
    const cs = await getDoc(doc(db, 'familyCodes', code));
    if (!cs.exists()) return { err: 'notfound' };
    const fid = cs.data().familyId;
    if (!famIds.includes(fid)) {
      const b = writeBatch(db);
      b.set(doc(db, 'families', fid, 'members', me.uid), memberData(code));
      b.set(userRef(), { familyIds: arrayUnion(fid) }, { merge: true });
      await b.commit();
    }
    const fs = await getDoc(doc(db, 'families', fid));
    enter(pick(fid, fs.data()));
    return { ok: true };
  };

  CLOUD.switchFamily = fid => {
    const fam = families.find(f => f.id === fid) || null;
    active = fam ? fam.id : null;
    A.setGroup(fam); A.switched(); subscribe(active); CLOUD.dirty();
  };

  CLOUD.leaveFamily = async fid => {
    const b = writeBatch(db);
    b.delete(doc(db, 'families', fid, 'members', me.uid));
    b.set(userRef(), { familyIds: arrayRemove(fid) }, { merge: true });
    await b.commit();
    famIds = famIds.filter(i => i !== fid);
    families = families.filter(f => f.id !== fid);
    A.families(families);
    CLOUD.switchFamily(families[0] ? families[0].id : null);
  };

  /* ---------- historias y reacciones ---------- */
  CLOUD.publish = p => addDoc(collection(db, ...base(), 'posts'), {
    k: p.k, t: p.t, x: p.x, by: p.by || '', authorUid: me.uid, authorName: A.personal().name,
    createdAt: serverTimestamp(), rx0: [], rx1: [], rx2: []
  });

  CLOUD.react = (id, j, on) =>
    updateDoc(doc(db, ...base(), 'posts', id), { ['rx' + j]: on ? arrayUnion(me.uid) : arrayRemove(me.uid) });
}
