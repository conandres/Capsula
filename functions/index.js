/* Funciones de servidor de Cápsula (Firebase Cloud Functions, plan Blaze).
   Están APAGADAS hasta que las despliegues: mira BLAZE.md. Nada de aquí se ejecuta mientras no hagas `firebase deploy --only functions`. */
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions, logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();
const db = admin.firestore();
setGlobalOptions({ region: 'us-central1', maxInstances: 5 });

const PACKAGE = 'io.github.conandres.twa';
const TZ = 'America/Bogota';
/* Misma forma que usa la app para "hoy" (Date.toDateString) pero en hora de Colombia. */
const hoyCO = () => new Date(new Date().toLocaleString('en-US', { timeZone: TZ })).toDateString();

/* ---------- 1. Compras: verifica el recibo con Google Play y concede Plus ----------
   La app guarda la compra en /purchases (uid, sku, token). Aquí se comprueba con Google y se escribe /entitlements/{uid}.
   Requiere: la cuenta de servicio de la función con acceso en Play Console > Usuarios y permisos (ver BLAZE.md). */
exports.verifyPurchase = onDocumentCreated('purchases/{pid}', async (event) => {
  const d = event.data && event.data.data();
  if (!d || !/^plus/.test(String(d.sku || ''))) { await event.data.ref.delete(); return; }
  try {
    const auth = await google.auth.getClient({ scopes: ['https://www.googleapis.com/auth/androidpublisher'] });
    const play = google.androidpublisher({ version: 'v3', auth });
    const r = await play.purchases.subscriptionsv2.get({ packageName: PACKAGE, token: d.token });
    const st = r.data.subscriptionState || '';
    const li = (r.data.lineItems || [])[0] || {};
    const until = li.expiryTime ? new Date(li.expiryTime) : new Date(0);
    const activa = /ACTIVE|IN_GRACE_PERIOD|CANCELED/.test(st) && until > new Date();
    if (activa) {
      await db.doc('entitlements/' + d.uid).set({ tier: 'plus', until, by: 'play', sku: d.sku, at: admin.firestore.FieldValue.serverTimestamp() });
      if (r.data.subscriptionState === 'SUBSCRIPTION_STATE_PENDING' || r.data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
        await play.purchases.subscriptions.acknowledge({ packageName: PACKAGE, subscriptionId: d.sku, token: d.token }).catch(() => {});
      }
      logger.info('Plus concedido', { uid: d.uid, until });
    } else logger.warn('Compra no válida', { uid: d.uid, st });
  } catch (e) { logger.error('verifyPurchase', e.message); return; }
  await event.data.ref.delete();
});

/* ---------- 2. Aviso cuando alguien cuenta algo en una cápsula ----------
   Solo dice quién y en qué cápsula; nunca el contenido de la historia. */
exports.notifyNewPost = onDocumentCreated('families/{fid}/posts/{pid}', async (event) => {
  const p = event.data.data(), fid = event.params.fid;
  const fam = (await db.doc('families/' + fid).get()).data() || {};
  const members = await db.collection('families/' + fid + '/members').get();
  const quien = (p.authorName || (members.docs.find(m => m.id === p.authorUid) || { data: () => ({}) }).data().name || 'Alguien').split(' ')[0];
  const tokens = [];
  for (const m of members.docs) {
    if (m.id === p.authorUid) continue;
    const t = await db.collection('users/' + m.id + '/tokens').limit(5).get();
    t.forEach(x => tokens.push({ token: x.id, uid: m.id }));
  }
  await sendTo(tokens, { title: fam.name || 'Tu cápsula', body: quien + ' contó algo nuevo' }, { fid });
});

/* ---------- 3. Racha en peligro: cada día a las 7:30 p. m. (hora de Colombia) ---------- */
exports.streakReminder = onSchedule({ schedule: '30 19 * * *', timeZone: TZ }, async () => {
  const hoy = hoyCO();
  const snap = await db.collection('users').where('streak', '>=', 3).limit(500).get();
  const tokens = [];
  for (const u of snap.docs) {
    if (u.get('last') === hoy) continue;
    const t = await db.collection('users/' + u.id + '/tokens').limit(5).get();
    t.forEach(x => tokens.push({ token: x.id, uid: u.id, n: u.get('streak') }));
  }
  for (const t of tokens) await sendTo([t], { title: 'Tu racha de ' + t.n + ' días está en peligro', body: 'Cuenta algo hoy y mantén la llama.' }, {});
});

/* ---------- 4. Vigilancia de Lumis/XP: avisa si alguien sube demasiado rápido ----------
   No cambia nada del jugador: solo escribe /flags/{uid} para que el administrador lo revise. */
exports.auditGains = onDocumentUpdated('users/{uid}', async (event) => {
  const a = event.data.before.data() || {}, b = event.data.after.data() || {};
  const dl = (b.lm || 0) - (a.lm || 0), dx = (b.xp || 0) - (a.xp || 0);
  if (dl <= 0 && dx <= 0) return;
  const ref = db.doc('audit/' + event.params.uid), now = Date.now();
  await db.runTransaction(async (tx) => {
    const s = (await tx.get(ref)).data() || { t: now, lm: 0, xp: 0 };
    const w = now - s.t > 36e5 ? { t: now, lm: 0, xp: 0 } : s;
    w.lm += Math.max(0, dl); w.xp += Math.max(0, dx);
    tx.set(ref, w);
    if (w.lm > 1500 || w.xp > 6000) {
      tx.set(db.doc('flags/' + event.params.uid), { lm: w.lm, xp: w.xp, at: admin.firestore.FieldValue.serverTimestamp(), motivo: 'ganancia rápida en una hora' }, { merge: true });
    }
  });
});

async function sendTo(list, notification, data) {
  if (!list.length) return;
  const res = await admin.messaging().sendEach(list.map(x => ({ token: x.token, notification, data: Object.assign({ tipo: 'capsula' }, data), android: { priority: 'high', notification: { channelId: 'capsula' } } })));
  const borrar = [];
  res.responses.forEach((r, i) => { if (!r.success && /registration-token-not-registered|invalid-argument/.test(r.error && r.error.code)) borrar.push(db.doc('users/' + list[i].uid + '/tokens/' + list[i].token).delete()); });
  await Promise.all(borrar);
}
