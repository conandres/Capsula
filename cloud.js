/* Capa de nube de Cápsula: inicio de sesión con Google + Firestore.
   Se carga desde index.html con import(). Expone window.CLOUD y llama a window.APP. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithCredential, GoogleAuthProvider, signOut }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, collection, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc, writeBatch, onSnapshot, query, orderBy, limit,
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
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager(), cacheSizeBytes: 200 * 1024 * 1024 })
    });
  } catch (e) { db = getFirestore(app); }
  CLOUD.configured = true;

  let me = null, famIds = [], families = [], active = null, subs = [];
  let lastP = '', lastM = '', lastE = '', lastPing = 0, timer = null, gen = 0, ready = false, plim = 60;

  const userRef = () => doc(db, 'users', me.uid);
  const base = () => (active ? ['families', active] : ['users', me.uid]);
  const TYPES = ['familia', 'pareja', 'amigos'];
  const pick = (id, d) => ({ id, name: d.name || 'Familia', code: d.code || '', ownerUid: d.ownerUid || '', type: TYPES.includes(d.type) ? d.type : 'familia' });

  /* ---------- estado de guardado: cuántas escrituras esperan confirmación de la nube ---------- */
  let pend = 0;
  const notify = () => { try { A.sync && A.sync({ pend }); } catch (e) {} };
  const track = p => { pend++; notify(); Promise.resolve(p).catch(() => {}).then(() => { pend--; notify(); }); return p; };

  /* ---------- guardado del progreso personal (con espera para no escribir de más) ---------- */
  const pHash = p => JSON.stringify({ ...p, pt: { ...p.pt, t: 0, love: Math.round(p.pt.love), food: Math.round(p.pt.food) } });
  const mHash = p => [p.xp, p.pet.kind, p.pet.name, p.name].join('|');

  function flush(force) {
    if (!me || !ready) return;
    clearTimeout(timer); timer = null;
    const p = A.personal(), ph = pHash(p), mh = mHash(p);
    if (force || ph !== lastP) {
      lastP = ph;
      track(setDoc(userRef(), { ...p, email: me.email, photo: me.photo, updatedAt: serverTimestamp() }, { merge: true })
        .catch(e => { lastP = ''; console.warn('No se guardó el progreso', e); }));
    }
    const eh = [p.streak, (p.wear || []).join(','), p.total || 0, p.showSeen !== false].join('|');
    if (force || eh !== lastE) { lastE = eh; pushExtra(false); }
    if (force || mh !== lastM) {
      lastM = mh;
      famIds.forEach(fid =>
        track(updateDoc(doc(db, 'families', fid, 'members', me.uid),
          { name: p.name, petKind: p.pet.kind, petName: p.pet.name, xp: p.xp })
          .catch(e => console.warn('No se actualizó tu ficha de familia', e))));
    }
  }
  /* Perfil visible para el grupo (racha, accesorios, historias) y "activo hace". Va aparte para no tropezar con las reglas viejas. */
  function pushExtra(seen) {
    if (!me) return;
    const p = A.personal();
    const d = { streak: p.streak || 0, total: p.total || 0, wear: (p.wear || []).slice(0, 12), showSeen: p.showSeen !== false };
    if (seen) d.lastSeen = serverTimestamp();
    famIds.forEach(fid => track(updateDoc(doc(db, 'families', fid, 'members', me.uid), d)
      .catch(e => console.warn('No se actualizó tu perfil de grupo', e))));
  }
  CLOUD.ping = () => { if (!me || !ready || Date.now() - lastPing < 60000) return; lastPing = Date.now(); pushExtra(true); };
  setInterval(() => { if (!document.hidden) CLOUD.ping(); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) CLOUD.ping(); });

  /* ---------- pregunta del día ---------- */
  let qaUn = [], qaKey = '';
  function qaStop() { qaUn.forEach(u => { try { u(); } catch (e) {} }); qaUn = []; qaKey = ''; }
  CLOUD.qaOpen = day => {
    if (!me || !active || qaKey === active + day) return;
    qaStop(); qaKey = active + day;
    const fid = active; let all = null;
    qaUn.push(onSnapshot(doc(db, 'families', fid, 'qa', day, 'answers', me.uid), s => {
      const mine = s.exists() ? { tx: s.data().tx || '' } : null;
      A.qa({ day, mine });
      if (mine && !all) {
        all = onSnapshot(collection(db, 'families', fid, 'qa', day, 'answers'), ss => {
          const l = []; ss.forEach(d => { const x = d.data({ serverTimestamps: 'estimate' }); l.push({ uid: d.id, name: x.name || '', tx: x.tx || '' }); });
          A.qa({ day, all: l });
        }, e => console.warn('Respuestas del día', e));
        qaUn.push(all);
      }
    }, e => console.warn('Tu respuesta del día', e)));
  };
  CLOUD.qaAnswer = (day, tx) => track(setDoc(doc(db, 'families', active, 'qa', day, 'answers', me.uid),
    { tx, name: A.personal().name, createdAt: serverTimestamp() }));

  CLOUD.dirty = () => { if (!ready) return; clearTimeout(timer); timer = setTimeout(() => flush(false), 2500); notify(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(false); });
  addEventListener('pagehide', () => flush(false));

  /* ---------- listeners de la familia activa ---------- */
  function teardown() { subs.forEach(u => { try { u(); } catch (e) {} }); subs = []; qaStop(); }

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
        const m = {};
        s.forEach(d => {
          const x = d.data({ serverTimestamps: 'estimate' });
          const ms = t => (t && t.toMillis ? t.toMillis() : 0);
          m[d.id] = { ...x, lastSeen: ms(x.lastSeen), joinedAt: ms(x.joinedAt) };
        });
        A.members(m);
      }, warn));
      subs.push(onSnapshot(doc(db, 'families', fid), s => { if (s.exists()) A.group(pick(fid, s.data())); }, warn));
    } else A.members({});
    const q = query(collection(db, ...base(), 'posts'), orderBy('createdAt', 'desc'), limit(plim));
    subs.push(onSnapshot(q, s => A.posts(s.docs.map(norm), plim), warn));
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
    let merged = false;
    if (!data) { isNew = true; data = A.legacy() || {}; }
    else if (A.merge) {
      /* Si este celular avanzó sin internet, no se pierde: se une lo mejor de la nube y de la copia local. */
      const m = A.merge(data, A.localCache(me.uid));
      if (m.changed) { data = m.data; merged = true; }
    }
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
      if (merged || (data.active || null) !== active) flush(true);
    }
    subscribe(active);
    A.afterLogin();
    CLOUD.ping();
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
    active = fam.id; plim = 60;
    A.setGroup(fam);
    A.switched();
    subscribe(active);
    CLOUD.dirty();
    lastPing = 0; CLOUD.ping();
  }

  CLOUD.createFamily = async (name, type) => {
    let withType = TYPES.includes(type);
    for (let i = 0; i < 6; i++) {
      const code = genCode(), fref = doc(collection(db, 'families')), b = writeBatch(db);
      b.set(fref, { name, code, ownerUid: me.uid, createdAt: serverTimestamp(), ...(withType ? { type } : {}) });
      b.set(doc(db, 'families', fref.id, 'members', me.uid), memberData(code));
      b.set(doc(db, 'familyCodes', code), { familyId: fref.id, ownerUid: me.uid });
      b.set(userRef(), { familyIds: arrayUnion(fref.id) }, { merge: true });
      try { await b.commit(); }
      catch (e) {
        /* Si las reglas de la nube aún no conocen el tipo de grupo, se crea sin él en vez de fallar. */
        if (e && e.code === 'permission-denied' && withType) { withType = false; i--; continue; }
        if (e && e.code === 'permission-denied' && i < 5) continue;
        throw e;
      }
      const fam = { id: fref.id, name, code, ownerUid: me.uid, type: withType ? type : 'familia' };
      enter(fam);
      return fam;
    }
  };

  CLOUD.joinFamily = async raw => {
    const code = String(raw || '').trim().toUpperCase();
    const cs = await getDoc(doc(db, 'familyCodes', code));
    if (!cs.exists()) return { err: 'notfound' };
    const fid = cs.data().familyId;
    const wasIn = famIds.includes(fid);
    if (!wasIn) {
      const b = writeBatch(db);
      b.set(doc(db, 'families', fid, 'members', me.uid), memberData(code));
      b.set(userRef(), { familyIds: arrayUnion(fid) }, { merge: true });
      await b.commit();
    }
    const fs = await getDoc(doc(db, 'families', fid));
    const fam = pick(fid, fs.data());
    if (fam.type === 'pareja' && !wasIn) {
      const ms = await getDocs(collection(db, 'families', fid, 'members'));
      if (ms.size > 2) {
        const b = writeBatch(db);
        b.delete(doc(db, 'families', fid, 'members', me.uid));
        b.set(userRef(), { familyIds: arrayRemove(fid) }, { merge: true });
        await b.commit();
        famIds = famIds.filter(i => i !== fid);
        return { err: 'full' };
      }
    }
    enter(fam);
    return { ok: true };
  };

  CLOUD.switchFamily = fid => {
    const fam = families.find(f => f.id === fid) || null;
    active = fam ? fam.id : null; plim = 60;
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
  CLOUD.publish = p => track(addDoc(collection(db, ...base(), 'posts'), {
    k: p.k, t: p.t, x: p.x, by: p.by || '', authorUid: me.uid, authorName: A.personal().name,
    createdAt: serverTimestamp(), rx0: [], rx1: [], rx2: []
  }));

  CLOUD.more = () => { plim += 60; subscribe(active); };
  CLOUD.deletePost = id => track(deleteDoc(doc(db, ...base(), 'posts', id)));

  CLOUD.react = (id, j, on) => track(
    updateDoc(doc(db, ...base(), 'posts', id), { ['rx' + j]: on ? arrayUnion(me.uid) : arrayRemove(me.uid) }));

  /* ---------- descarga de recuerdos: tu diario y las historias de cada grupo ---------- */
  CLOUD.exportAll = async () => {
    const out = [];
    const grab = async (name, path) => {
      const s = await getDocs(query(collection(db, ...path, 'posts'), orderBy('createdAt', 'asc')));
      out.push({ name, posts: s.docs.map(d => {
        const x = d.data({ serverTimestamps: 'estimate' });
        return { id: d.id, k: x.k, t: x.t || '', x: x.x || {}, by: x.by || '', an: x.authorName || '',
          mine: x.authorUid === me.uid, ts: x.createdAt && x.createdAt.toMillis ? x.createdAt.toMillis() : Date.now() };
      }) });
    };
    await grab('Mi diario', ['users', me.uid]);
    for (const f of families) await grab(f.name, ['families', f.id]);
    return out;
  };
}
