/**
 * Cápsula 3D v0.2 — mascotas procedurales (Three.js), pose sentada tipo figura de vinilo.
 * Sigue el kit conceptual: Biblia visual (proporciones y paleta), hoja de expresiones, guía de animaciones
 * y catálogo de accesorios. Three.js entra por import map ("three").
 *
 * Estructura de cada mascota (en `parts`):
 *   head  grupo de la cabeza (cabeza + cara + orejas): se inclina y respira como una sola pieza
 *   body, arms[] (pivotes en el hombro), feet[], ears[], tail, face{eyes,glints,blush,smile,mouthO}
 *   hr [rx,ry,rz] radios de la cabeza, neck y_cuello, prop (objeto que sostiene)
 */
import * as THREE from "three";

const PAL = {
  white: 0xfff7fb, pink: 0xf29ac2, blush: 0xffb5d0, dark: 0x351b2d, purple: 0xb99be9, gold: 0xffd36b,
  cream: 0xffe8d8, ear: 0xf7a9c9, bear: 0xf6a3c6, tongue: 0xff7fa8, ribbon: 0xe8476f, red: 0xe0405a,
  monkey: 0xd9a066, core: 0x2a1148, shell: 0xfff3fb, shell2: 0xe9d4fb, orbit: 0xf48fc3, spark: 0xa855f7,
  lilac: 0xc9b3f5
};

export const APP_KIND = { gato: "cat", perro: "dog", conejo: "bunny", oso: "bear", nube: "capsule" };
export const PETS = {
  cat: { kind: "Gato", app: "gato" }, dog: { kind: "Perro", app: "perro" }, bunny: { kind: "Conejo", app: "conejo" },
  bear: { kind: "Oso", app: "oso" }, capsule: { kind: "Cápsula (central)", app: "nube" }
};
export const EXPRESSIONS = ["neutral", "happy", "sleepy", "surprised", "sad", "wink"];
export const ACTIONS = ["hello", "happy", "love", "surprise", "dance", "eat", "levelup"];
export const ACCESSORIES = ["estrella", "mono", "corona", "flor", "lentes", "gorro", "bufanda"];
const DUR = { hello: 0.9, happy: 1.3, love: 1.4, surprise: 1.0, dance: 3.0, eat: 2.4, levelup: 1.8 };

/* Cada expresión son números hacia los que la cara se suaviza. */
const EXPR = {
  neutral:   { eyeX: 1,    eyeY: 1,    eyeR: 1,    smileX: 1,    smileY: 1,    smileDY: 0,     mouthO: 0, blush: 1,   breath: 1,    lid: 1.0,  droop: 0,    tilt: 0 },
  happy:     { eyeX: 1.05, eyeY: 0.5,  eyeR: 0.5,  smileX: 1.3,  smileY: 1.35, smileDY: 0.005, mouthO: 0, blush: 1.7, breath: 1.15, lid: 1.15, droop: 0,    tilt: 0 },
  sleepy:    { eyeX: 1,    eyeY: 0.1,  eyeR: 0.1,  smileX: 0.55, smileY: 0.5,  smileDY: -0.01, mouthO: 0, blush: 0.8, breath: 0.55, lid: 0.2,  droop: 0.12, tilt: 0.06 },
  surprised: { eyeX: 1.3,  eyeY: 1.4,  eyeR: 1.4,  smileX: 1,    smileY: 1,    smileDY: 0,     mouthO: 1, blush: 1,   breath: 1.3,  lid: 1.3,  droop: -0.15, tilt: 0 },
  sad:       { eyeX: 1,    eyeY: 0.85, eyeR: 0.85, smileX: 0.9,  smileY: -0.8, smileDY: -0.07,  mouthO: 0, blush: 0.5, breath: 0.8,  lid: 0.75, droop: 0.35, tilt: 0.05 },
  wink:      { eyeX: 1,    eyeY: 1,    eyeR: 0.07, smileX: 1.2,  smileY: 1.15, smileDY: 0.005, mouthO: 0, blush: 1.4, breath: 1,    lid: 1.0,  droop: 0,    tilt: -0.08 }
};

/* Formas compartidas (no se liberan al cambiar de mascota). */
const SPH = new THREE.SphereGeometry(1, 28, 20);
const HEM_LOW = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
const HEM_UP = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const SHARED = new Set([SPH, HEM_LOW, HEM_UP]);

const mat = (color, roughness = 0.45, metalness = 0.02, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const glow = (color, k = 1.1) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 });

function ball(parent, name, color, pos, scale, opts = {}) {
  const m = new THREE.Mesh(SPH, opts.material || mat(color, opts.roughness ?? 0.45, opts.metalness ?? 0.02));
  m.name = name; m.position.set(pos[0], pos[1], pos[2]); m.scale.set(scale[0], scale[1], scale[2]);
  m.castShadow = opts.noShadow ? false : true; m.receiveShadow = true;
  parent.add(m); return m;
}
const mesh = (geo, material, parent, pos = [0, 0, 0], shadow = true) => {
  const m = new THREE.Mesh(geo, material); m.position.set(pos[0], pos[1], pos[2]); m.castShadow = shadow;
  if (parent) parent.add(m); return m;
};

function makeStar(R, r, depth, material) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r : R;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
    if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
  }
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: R * 0.08, bevelSegments: 2 });
  geo.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(geo, material); m.castShadow = true; return m;
}
const sparkle = (material, size) => {         /* destello de 4 puntas */
  const g = new THREE.Group();
  const a = new THREE.Mesh(new THREE.OctahedronGeometry(1), material); a.scale.set(size * 0.35, size, size * 0.1);
  const b = new THREE.Mesh(new THREE.OctahedronGeometry(1), material); b.scale.set(size, size * 0.35, size * 0.1);
  g.add(a); g.add(b); return g;
};

/* ---------- cara: ojos, brillos, mejillas, sonrisa y boca "o" (coordenadas locales de la cabeza) ---------- */
function addFace(H, rx, ry, rz, o = {}) {
  const surf = (dx, dy) => rz * Math.sqrt(Math.max(0, 1 - (dx / rx) ** 2 - (dy / ry) ** 2));
  const eyeSize = o.eyeSize ?? 0.07, ex = o.eyeDx ?? 0.19, ey = o.eyeDy ?? -0.1, my = o.mouthDy ?? -0.25;
  const F = { eyes: [], glints: [], blush: [], surf };
  for (const s of [-1, 1]) {
    const e = ball(H, "eye", PAL.dark, [s * ex, ey, surf(s * ex, ey) - 0.006], [eyeSize, eyeSize * 1.25, 0.035], { roughness: 0.18, noShadow: true });
    e.userData.base = e.scale.clone(); F.eyes.push(e);
    const g = ball(H, "glint", 0xffffff, [s * ex - eyeSize * 0.25, ey + eyeSize * 0.5, surf(s * ex, ey) + 0.026], [eyeSize * 0.3, eyeSize * 0.3, 0.018], { roughness: 0.12, noShadow: true });
    g.userData.base = g.scale.clone(); F.glints.push(g);
    const bx = o.blushDx ?? 0.33, by = o.blushDy ?? -0.2;
    const b = ball(H, "blush", PAL.blush, [s * bx, by, surf(s * bx, by) - 0.012], [0.08, 0.048, 0.022], { noShadow: true });
    b.userData.base = b.scale.clone(); F.blush.push(b);
  }
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.095, 0.03, 0), new THREE.Vector3(0, -0.095, 0.015), new THREE.Vector3(0.095, 0.03, 0));
  const smile = mesh(new THREE.TubeGeometry(curve, 16, 0.018, 8, false), mat(PAL.dark, 0.5), H, [0, my, surf(0, my) + 0.012], false);
  smile.name = "smile"; smile.userData.baseY = my; F.smile = smile;
  const mo = ball(H, "mouth-o", PAL.dark, [0, my - 0.04, surf(0, my) + 0.014], [0.04, 0.05, 0.02], { noShadow: true });
  mo.userData.base = mo.scale.clone(); mo.visible = false; F.mouthO = mo;
  return F;
}

/* ---------- cuerpo sentado: torso, bracitos con pivote en el hombro, patitas con almohadillas ---------- */
function sitBody(g, color, o = {}) {
  const body = ball(g, "body", color, [0, -0.36, 0], [o.bw ?? 0.44, 0.46, 0.38]);
  const arms = [], feet = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * (o.armX ?? 0.4), -0.2, 0.12); g.add(arm);
    ball(arm, "arm", color, [0, -0.15, 0], [0.105, 0.19, 0.105]);
    arm.userData = { s, baseZ: s * (o.armZ ?? 0.25), baseX: o.armX0 ?? 0 };
    arm.rotation.z = arm.userData.baseZ; arm.rotation.x = arm.userData.baseX; arms.push(arm);
    const fx = s * 0.25;
    feet.push(ball(g, "foot", color, [fx, -0.79, 0.26], [0.17, 0.11, 0.2]));
    ball(g, "pad", PAL.pink, [fx, -0.79, 0.455], [0.085, 0.06, 0.03], { noShadow: true });
    for (const k of [-1, 0, 1]) ball(g, "bean", PAL.pink, [fx + k * 0.05, -0.72 + (k === 0 ? 0.015 : 0), 0.45], [0.022, 0.026, 0.02], { noShadow: true });
  }
  return { body, arms, feet };
}
const newHead = (g, color, rx, ry, rz, y = 0.4) => {
  const H = new THREE.Group(); H.position.set(0, y, 0.03); g.add(H);
  ball(H, "head", color, [0, 0, 0], [rx, ry, rz]);
  return H;
};

function finish(parts) {
  (parts.ears || []).forEach(e => { e.userData.baseZ = e.rotation.z; });
  parts.bodyBase = parts.body.scale.clone();
  parts.headBaseY = parts.head.position.y;
  parts.arms = parts.arms || []; parts.feet = parts.feet || [];
  return parts;
}

function makeCat(g) {
  const { body, arms, feet } = sitBody(g, PAL.white);
  const rx = 0.57, ry = 0.5, rz = 0.47, H = newHead(g, PAL.white, rx, ry, rz);
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.2, 0.38, 24), mat(PAL.white), H, [s * 0.37, 0.46, 0]);
    ear.rotation.z = s * -0.25; ears.push(ear);
    const inner = mesh(new THREE.ConeGeometry(0.115, 0.24, 20), mat(PAL.ear), ear, [0, -0.02, 0.09], false);
    inner.scale.set(1, 1, 0.6);
  }
  const face = addFace(H, rx, ry, rz, { eyeDx: 0.19, eyeDy: -0.09, mouthDy: -0.25 });
  ball(H, "nose", PAL.pink, [0, -0.16, face.surf(0, -0.16) + 0.005], [0.036, 0.026, 0.022], { noShadow: true });
  const wm = mat(PAL.dark, 0.6);
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) {
    const w = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3, 6), wm, H, [s * 0.5, -0.2 + k * 0.045, 0.3], false);
    w.rotation.z = Math.PI / 2 + s * k * 0.14;
  }
  const collar = mesh(new THREE.TorusGeometry(0.3, 0.035, 12, 48), mat(PAL.pink), g, [0, -0.04, 0.02]);
  collar.rotation.x = Math.PI / 2; collar.scale.set(1, 0.95, 1);
  ball(g, "bell", PAL.gold, [0, -0.1, 0.31], [0.07, 0.07, 0.055], { metalness: 0.2 });
  const tail = new THREE.Group(); tail.position.set(-0.3, -0.72, -0.26); g.add(tail);
  ball(tail, "tail", PAL.white, [0, 0, 0], [0.12, 0.12, 0.12]); ball(tail, "tail", PAL.white, [-0.12, 0.1, 0], [0.1, 0.1, 0.1]); ball(tail, "tail", PAL.white, [-0.2, 0.25, 0], [0.085, 0.085, 0.085]);
  tail.userData.baseZ = 0;
  return finish({ head: H, body, ears, face, arms, feet, tail, hr: [rx, ry, rz], neck: -0.02 });
}

function makeDog(g) {
  const { body, arms, feet } = sitBody(g, PAL.white);
  const rx = 0.58, ry = 0.5, rz = 0.48, H = newHead(g, PAL.white, rx, ry, rz);
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = ball(H, "floppy-ear", PAL.ear, [s * 0.55, -0.02, -0.02], [0.17, 0.33, 0.15]);
    ear.rotation.z = s * -0.22; ears.push(ear);
  }
  const face = addFace(H, rx, ry, rz, { eyeDx: 0.2, eyeDy: -0.06, mouthDy: -0.27, blushDx: 0.35, blushDy: -0.18 });
  ball(H, "muzzle", PAL.cream, [0, -0.17, face.surf(0, -0.17) - 0.045], [0.2, 0.14, 0.11]);
  ball(H, "nose", PAL.dark, [0, -0.12, face.surf(0, -0.12) + 0.055], [0.07, 0.05, 0.04], { roughness: 0.2 });
  const tongue = ball(H, "tongue", PAL.tongue, [0, -0.325, face.surf(0, -0.3) + 0.015], [0.05, 0.075, 0.025], { noShadow: true });
  tongue.visible = false;
  const collar = mesh(new THREE.TorusGeometry(0.3, 0.035, 12, 48), mat(PAL.pink), g, [0, -0.04, 0.02]);
  collar.rotation.x = Math.PI / 2; collar.scale.set(1, 0.95, 1);
  ball(g, "paw-tag", PAL.gold, [0, -0.13, 0.31], [0.08, 0.08, 0.03], { metalness: 0.25 });
  const tail = new THREE.Group(); tail.position.set(0.28, -0.7, -0.3); g.add(tail);
  ball(tail, "tail", PAL.white, [0, 0, 0], [0.11, 0.13, 0.11]); tail.userData.baseZ = 0.4; tail.rotation.z = 0.4;
  return finish({ head: H, body, ears, face, arms, feet, tail, tongue, hr: [rx, ry, rz], neck: -0.02 });
}

function makeBunny(g) {
  const { body, arms, feet } = sitBody(g, PAL.white, { bw: 0.42, armX: 0.34, armZ: -0.5, armX0: -0.7 });
  const rx = 0.52, ry = 0.47, rz = 0.44, H = newHead(g, PAL.white, rx, ry, rz, 0.38);
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = ball(H, "bunny-ear", PAL.white, [s * 0.2, 0.62, -0.02], [0.13, 0.4, 0.11]);
    ear.rotation.z = s * -0.12; ears.push(ear);
    const inner = ball(ear, "inner-ear", PAL.ear, [0, 0.02, 0.9], [0.5, 0.74, 0.3]); inner.castShadow = false;
  }
  const face = addFace(H, rx, ry, rz, { eyeDx: 0.18, eyeDy: -0.07, mouthDy: -0.23, blushDx: 0.31 });
  ball(H, "nose", PAL.pink, [0, -0.14, face.surf(0, -0.14) + 0.004], [0.034, 0.024, 0.02], { noShadow: true });
  const prop = new THREE.Group(); prop.name = "heart"; const hm = mat(PAL.pink, 0.35);
  ball(prop, "lobe", PAL.pink, [-0.075, 0.03, 0], [0.1, 0.1, 0.07], { material: hm });
  ball(prop, "lobe", PAL.pink, [0.075, 0.03, 0], [0.1, 0.1, 0.07], { material: hm });
  const tip = mesh(new THREE.ConeGeometry(0.135, 0.22, 24), hm, prop, [0, -0.1, 0]); tip.rotation.z = Math.PI;
  prop.position.set(0, -0.36, 0.42); prop.scale.setScalar(1.25); g.add(prop);
  ball(g, "cotton-tail", PAL.white, [0, -0.72, -0.34], [0.12, 0.12, 0.12]);
  return finish({ head: H, body, ears, face, arms, feet, prop, hr: [rx, ry, rz], neck: -0.04 });
}

function makeBear(g) {
  const { body, arms, feet } = sitBody(g, PAL.bear, { armX: 0.37, armZ: -0.45, armX0: -0.7 });
  const rx = 0.56, ry = 0.5, rz = 0.47, H = newHead(g, PAL.bear, rx, ry, rz);
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = ball(H, "bear-ear", PAL.bear, [s * 0.4, 0.4, -0.02], [0.17, 0.17, 0.12]); ears.push(ear);
    ball(ear, "ear-inner", PAL.blush, [0, 0, 0.92], [0.55, 0.55, 0.25], { noShadow: true });
  }
  const face = addFace(H, rx, ry, rz, { eyeDx: 0.19, eyeDy: -0.08, mouthDy: -0.26 });
  ball(H, "muzzle", PAL.white, [0, -0.16, face.surf(0, -0.16) - 0.04], [0.19, 0.14, 0.1]);
  ball(H, "nose", PAL.dark, [0, -0.12, face.surf(0, -0.12) + 0.05], [0.06, 0.045, 0.035], { roughness: 0.2 });
  const prop = makeStar(0.17, 0.08, 0.07, mat(PAL.gold, 0.35, 0.15)); prop.name = "star";
  prop.position.set(0, -0.38, 0.44); g.add(prop);
  const rm = mat(PAL.ribbon, 0.5);
  for (const s of [-1, 1]) { const w = ball(g, "bow", PAL.ribbon, [s * 0.1, -0.04, 0.3], [0.1, 0.065, 0.05], { material: rm }); w.rotation.z = s * 0.35; }
  ball(g, "bow-knot", PAL.ribbon, [0, -0.04, 0.31], [0.045, 0.045, 0.045], { material: rm });
  return finish({ head: H, body, ears, face, arms, feet, prop, hr: [rx, ry, rz], neck: -0.04 });
}

/* Cápsula central: esfera perlada abierta como en el logo, con el núcleo morado que sonríe, anillo y destello. */
function makeCapsule(g) {
  const root = new THREE.Group(); root.position.y = 0.0; g.add(root);
  const shellMat = mat(PAL.shell, 0.22, 0.05, { side: THREE.DoubleSide });
  const low = new THREE.Mesh(HEM_LOW, shellMat); low.scale.setScalar(0.64); low.position.y = -0.1; low.castShadow = true; low.receiveShadow = true; root.add(low);
  const rim = mesh(new THREE.TorusGeometry(0.64, 0.022, 10, 56), mat(PAL.shell2, 0.3), root, [0, -0.1, 0], false); rim.rotation.x = Math.PI / 2;
  const core = new THREE.Group(); core.position.set(0, 0.04, 0.02); root.add(core);
  ball(core, "core", PAL.core, [0, 0, 0], [0.5, 0.34, 0.44], { roughness: 0.3 });
  const gm = glow(0xffffff, 1.15);
  const surf = (dx, dy) => 0.44 * Math.sqrt(Math.max(0, 1 - (dx / 0.5) ** 2 - (dy / 0.34) ** 2));
  const F = { eyes: [], glints: [], blush: [], surf };
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.TorusGeometry(0.055, 0.015, 8, 20, Math.PI), gm, core, [s * 0.17, 0.05, surf(s * 0.17, 0.05) - 0.004], false);
    e.userData.base = e.scale.clone(); F.eyes.push(e);
    const b = ball(core, "blush", 0x9b4fd0, [s * 0.3, -0.07, surf(s * 0.3, -0.07) - 0.01], [0.07, 0.045, 0.02], { noShadow: true });
    b.userData.base = b.scale.clone(); F.blush.push(b);
  }
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.05, 0.015, 0), new THREE.Vector3(0, -0.045, 0.01), new THREE.Vector3(0.05, 0.015, 0));
  const smile = mesh(new THREE.TubeGeometry(curve, 12, 0.011, 6, false), gm, core, [0, -0.03, surf(0, -0.03) + 0.006], false);
  smile.userData.baseY = -0.03; F.smile = smile;
  const mo = ball(core, "mouth-o", 0xffffff, [0, -0.06, surf(0, -0.06) + 0.008], [0.026, 0.032, 0.015], { material: gm, noShadow: true });
  mo.userData.base = mo.scale.clone(); mo.visible = false; F.mouthO = mo;
  const hinge = new THREE.Group(); hinge.position.set(0, -0.1, -0.5); root.add(hinge);
  const lid = new THREE.Mesh(HEM_UP, shellMat); lid.scale.setScalar(0.64); lid.position.set(0, 0, 0.5); lid.castShadow = true; hinge.add(lid);
  hinge.rotation.x = -1.0;
  const orbit = mesh(new THREE.TorusGeometry(0.82, 0.04, 12, 96), glow(PAL.orbit, 0.5), root, [0, -0.05, 0], false);
  orbit.rotation.set(1.2, 0.12, -0.28);
  const spark = sparkle(glow(PAL.spark, 0.9), 0.14); spark.position.set(0.82, 0.72, 0.1); root.add(spark);
  return finish({ head: core, body: low, ears: [], face: F, arms: [], feet: [], orbit, spark, lid: hinge, hr: [0.55, 0.62, 0.45], neck: 0 });
}

const BUILDERS = { cat: makeCat, dog: makeDog, bunny: makeBunny, bear: makeBear, capsule: makeCapsule };

/* ---------- accesorios (se anclan a la cabeza o al cuello de cada mascota) ---------- */
function makeMonkey() {
  const g = new THREE.Group(), fur = mat(PAL.monkey, 0.6), cr = mat(PAL.cream, 0.6);
  ball(g, "m-body", 0, [0, 0, 0], [0.07, 0.085, 0.06], { material: fur });
  ball(g, "m-head", 0, [0, 0.13, 0.01], [0.077, 0.07, 0.066], { material: fur });
  for (const s of [-1, 1]) {
    ball(g, "m-ear", 0, [s * 0.085, 0.14, 0], [0.032, 0.032, 0.02], { material: fur });
    ball(g, "m-eye", PAL.dark, [s * 0.026, 0.14, 0.066], [0.011, 0.014, 0.01], { noShadow: true });
    ball(g, "m-arm", 0, [s * 0.085, 0.0, 0.01], [0.025, 0.05, 0.025], { material: fur });
  }
  ball(g, "m-face", 0, [0, 0.118, 0.058], [0.045, 0.034, 0.02], { material: cr, noShadow: true });
  return g;
}
function makeAccessory(id, P) {
  const [rx, ry, rz] = P.hr, g = new THREE.Group(); g.name = "acc-" + id;
  let parent = "head";
  if (id === "corona") {
    const m = mat(PAL.gold, 0.25, 0.3);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mesh(new THREE.ConeGeometry(0.045, 0.12, 12), m, g, [Math.sin(a) * 0.13, 0.06, Math.cos(a) * 0.1]); }
    const ring = mesh(new THREE.TorusGeometry(0.125, 0.025, 10, 32), m, g); ring.rotation.x = Math.PI / 2; ring.scale.set(1, 0.8, 1);
    g.position.set(0, ry * 0.9, 0); g.rotation.x = -0.15;
  } else if (id === "flor") {
    const pm = mat(PAL.pink, 0.4);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ball(g, "petal", 0, [Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0], [0.055, 0.055, 0.03], { material: pm }); }
    ball(g, "core", PAL.gold, [0, 0, 0.018], [0.045, 0.045, 0.03]);
    g.position.set(rx * 0.62, ry * 0.8, rz * 0.45); g.rotation.y = 0.5;
  } else if (id === "lentes") {
    const m = mat(PAL.dark, 0.3, 0.1);
    const e0 = P.face.eyes[0].position, e1 = P.face.eyes[1].position;
    for (const e of [e0, e1]) { const r = mesh(new THREE.TorusGeometry(0.1, 0.014, 10, 28), m, g, [e.x, e.y, 0], false); }
    mesh(new THREE.BoxGeometry(Math.abs(e1.x - e0.x) - 0.18, 0.014, 0.014), m, g, [0, e0.y, 0], false);
    g.position.set(0, 0, e0.z + 0.05);
  } else if (id === "gorro") {
    const rm = mat(PAL.red, 0.55), wm = mat(0xffffff, 0.7);
    const cone = mesh(new THREE.ConeGeometry(0.3, 0.46, 24), rm, g, [0, 0.2, 0]);
    const band = mesh(new THREE.TorusGeometry(0.3, 0.06, 10, 36), wm, g, [0, -0.02, 0]); band.rotation.x = Math.PI / 2;
    ball(g, "pom", 0xffffff, [0.06, 0.46, 0], [0.07, 0.07, 0.07], { material: wm });
    g.position.set(0, ry * 0.78, -0.02); g.rotation.set(-0.12, 0, 0.18);
  } else if (id === "estrella") {
    const s = makeStar(0.15, 0.07, 0.05, mat(PAL.gold, 0.35, 0.15)); g.add(s);
    g.position.set(-rx * 0.82, ry * 0.6, rz * 0.5); g.rotation.z = 0.25;
  } else if (id === "bufanda") {
    parent = "body";
    const sm = mat(PAL.ribbon, 0.6);
    const ring = mesh(new THREE.TorusGeometry(0.31, 0.065, 12, 40), sm, g); ring.rotation.x = Math.PI / 2; ring.scale.set(1, 0.95, 1);
    const tail = mesh(new THREE.BoxGeometry(0.1, 0.26, 0.04), sm, g, [0.14, -0.15, 0.3]); tail.rotation.z = 0.12;
    g.position.set(0, P.neck, 0.02);
  } else if (id === "mono") {
    parent = "body";
    const m = makeMonkey(); g.add(m); g.position.set(0.52, -0.05, 0.02); g.rotation.y = -0.3;
  }
  return { g, parent };
}

function disposeTree(obj) {
  obj.traverse(o => {
    if (o.geometry && !SHARED.has(o.geometry)) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
}

export class CapsulaPetViewer {
  constructor(container, options = {}) {
    if (!container) throw new Error("CapsulaPetViewer necesita un elemento contenedor.");
    this.container = container; this.opts = options;
    this.current = "cat"; this.expr = "neutral"; this.accList = [];
    this.t = 0; this.last = 0; this.fps = 0; this.zNext = 0;
    this.cur = { ...EXPR.neutral }; this.tgt = { ...EXPR.neutral };
    this.act = null; this.tmp = null; this.yawUser = 0; this.drag = null;
    this.blink = { next: 2.5, start: -1, double: false };
    this.visible = true; this.running = false; this.motion = 1;

    this.mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.onMq = () => { this.motion = this.mq && this.mq.matches ? 0.25 : 1; };
    this.onMq();
    if (this.mq && this.mq.addEventListener) this.mq.addEventListener("change", this.onMq);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    this.camera.position.set(0, 0.3, 4.6);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio ?? 1.5));
    this.renderer.shadowMap.enabled = options.shadows !== false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = options.exposure ?? 1.12;
    this.canvas = this.renderer.domElement;
    this.canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y;outline:none;";
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("aria-label", "Mascota 3D. Toca para que reaccione, arrastra para girarla.");
    container.appendChild(this.canvas);

    this.scene.add(new THREE.HemisphereLight(0xffe8f4, 0x4d3454, 2.0));
    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(3, 4, 5); key.castShadow = true; key.shadow.mapSize.set(512, 512);
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 });
    key.shadow.camera.updateProjectionMatrix();
    this.scene.add(key);
    const rim = new THREE.PointLight(0xe88ac8, 24, 8); rim.position.set(-2, 1, 2); this.scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.ShadowMaterial({ opacity: 0.22 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.03; floor.scale.set(1.5, 1, 0.6); floor.receiveShadow = true;
    this.scene.add(floor);

    this.pivot = new THREE.Group(); this.scene.add(this.pivot);
    this.fxGroup = new THREE.Group(); this.scene.add(this.fxGroup); this.fx = [];

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.setPet(options.pet || "cat");
    if (options.expression) this.setExpression(options.expression);
    this.loop = this.tick.bind(this);
    this.bindPointer();
    if (typeof IntersectionObserver !== "undefined") {
      this.io = new IntersectionObserver(es => { this.visible = es[es.length - 1].isIntersecting; this.sync(); });
      this.io.observe(container);
    }
    this.onVis = () => this.sync();
    document.addEventListener("visibilitychange", this.onVis);
    this.sync();
  }

  /* ---------- ciclo de vida ---------- */
  sync() {
    const want = this.visible && !document.hidden && !this.destroyed;
    if (want && !this.running) { this.running = true; this.last = performance.now() / 1000; this.renderer.setAnimationLoop(this.loop); }
    else if (!want && this.running) { this.running = false; this.renderer.setAnimationLoop(null); }
  }
  resize() {
    const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.position.z = h / w > 1.25 ? 5.0 : 4.5;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  destroy() {
    this.destroyed = true; this.running = false;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver && this.resizeObserver.disconnect();
    this.io && this.io.disconnect();
    document.removeEventListener("visibilitychange", this.onVis);
    if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener("change", this.onMq);
    this.unbindPointer && this.unbindPointer();
    this.clearCharacter();
    this.fx.forEach(h => h.material.dispose());
    SHARED.forEach(s => s.dispose());
    this.scene.traverse(o => {
      if (o.geometry && !SHARED.has(o.geometry)) o.geometry.dispose();
      if (o.material && o.material.dispose) o.material.dispose();
    });
    this.renderer.dispose();
    if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  /* ---------- personaje ---------- */
  clearCharacter() {
    if (this.character) { disposeTree(this.character); this.pivot.remove(this.character); this.character = null; }
  }
  setPet(id) {
    if (APP_KIND[id]) id = APP_KIND[id];
    if (!BUILDERS[id]) id = "cat";
    this.clearCharacter();
    this.current = id;
    this.character = new THREE.Group(); this.pivot.add(this.character);
    this.parts = BUILDERS[id](this.character);
    this.charBase = id === "capsule" ? 1.05 : 1;
    this.character.scale.setScalar(this.charBase);
    this.character.position.y = -0.12;
    this.act = null; this.tmp = null; this.accGroups = [];
    this.blink = { next: this.t + 1.5 + Math.random() * 2, start: -1, double: false };
    this.setAccessories(this.accList);
    this.container.dispatchEvent(new CustomEvent("capsulapetchange", { detail: { id, ...PETS[id] } }));
    this.renderOnce();
  }
  setExpression(name) { this.expr = EXPR[name] ? name : "neutral"; }
  setAccessories(list) {
    this.accList = (list || []).filter(a => ACCESSORIES.includes(a));
    (this.accGroups || []).forEach(a => { disposeTree(a); if (a.parent) a.parent.remove(a); });
    this.accGroups = [];
    this.accList.forEach(id => {
      const { g, parent } = makeAccessory(id, this.parts);
      (parent === "head" ? this.parts.head : this.character).add(g);
      this.accGroups.push(g);
    });
    this.renderOnce();
  }
  play(action = "hello") {
    if (!ACTIONS.includes(action)) action = "hello";
    this.act = { name: action, start: this.t, dur: DUR[action] };
    const ex = { surprise: "surprised", eat: "neutral" }[action] || "happy";
    this.tmp = { expr: ex, until: this.t + DUR[action] + 0.25 };
    if (action === "love") this.spawn("hearts");
    if (action === "levelup") this.spawn("stars");
  }

  /* ---------- tocar y arrastrar ---------- */
  bindPointer() {
    const c = this.canvas;
    const down = e => { this.drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, yaw0: this.yawUser }; try { c.setPointerCapture(e.pointerId); } catch (_) {} };
    const move = e => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x;
      this.drag.moved = Math.max(this.drag.moved, Math.abs(dx) + Math.abs(e.clientY - this.drag.y));
      this.yawUser = Math.max(-1.3, Math.min(1.3, this.drag.yaw0 + dx * 0.012));
    };
    const up = () => {
      const d = this.drag; this.drag = null;
      if (d && d.moved < 8 && performance.now() - d.t < 500) {
        const pool = ["happy", "hello", "love", "surprise", "dance"];
        this.play(pool[Math.floor(Math.random() * pool.length)]);
        this.container.dispatchEvent(new CustomEvent("capsulapettap"));
      }
    };
    const cancel = () => { this.drag = null; };
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up); c.addEventListener("pointercancel", cancel);
    this.unbindPointer = () => {
      c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", cancel);
    };
  }

  /* ---------- destellos: corazones (cariño), estrellas (subir de nivel), burbujas (dormir) ---------- */
  spawn(kind) {
    const spec = { hearts: [5, PAL.pink, 0.06, 1.4, 1.1, 0.18], stars: [8, PAL.gold, 0.05, 1.5, 1.2, 0.1], zzz: [1, PAL.lilac, 0.07, 2.4, 0.7, 0] }[kind];
    const [n, color, size, life, rise, gap] = spec;
    for (let k = 0; k < n; k++) {
      let h = this.fx.find(x => !x.userData.on);
      if (!h) {
        if (this.fx.length >= 12) break;
        h = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 }));
        this.fxGroup.add(h); this.fx.push(h);
      }
      h.material.color.setHex(color); h.scale.setScalar(size);
      h.userData = { on: true, t0: this.t + k * gap, x: (k - (n - 1) / 2) * (kind === "stars" ? 0.2 : 0.16) + (kind === "zzz" ? 0.4 : 0), y0: kind === "zzz" ? 0.7 : 0.1, life, rise };
    }
  }
  renderOnce() { if (!this.running && this.renderer && this.character) this.frame(0.016, true); }
  tick() {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0, now - this.last));
    this.last = now;
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.08;
    this.frame(dt, false);
  }

  frame(dt, still) {
    this.t += dt;
    const t = this.t, P = this.parts, m = this.motion;

    let name = this.expr;
    if (this.tmp && t < this.tmp.until) name = this.tmp.expr; else this.tmp = null;
    this.tgt = EXPR[name];
    const k = 1 - Math.exp(-dt * 12);
    for (const key in this.cur) this.cur[key] += (this.tgt[key] - this.cur[key]) * k;
    if (still) for (const key in this.cur) this.cur[key] = this.tgt[key];
    const c = this.cur;

    /* acción en curso */
    let p = 0, env = 0, an = null;
    if (this.act) { p = (t - this.act.start) / this.act.dur; if (p >= 1) this.act = null; else { an = this.act.name; env = Math.sin(Math.PI * p); } }

    /* parpadeo cada 2–5 s (a veces doble) */
    const B = this.blink;
    if (B.start < 0 && t >= B.next) B.start = t;
    let bm = 1;
    if (B.start >= 0) {
      const q = (t - B.start) / 0.16;
      if (q >= 1) { B.start = -1; if (!B.double && Math.random() < 0.15) { B.double = true; B.next = t + 0.1; } else { B.double = false; B.next = t + 2.2 + Math.random() * 3.3; } }
      else bm = 1 - Math.sin(Math.PI * q) * 0.93;
    }
    const F = P.face;
    F.eyes.forEach((e, i) => {
      const b = e.userData.base, ey = Math.max(0.05, c.eyeY * (i === 1 ? c.eyeR / c.eyeY : 1) * bm);
      e.scale.set(b.x * c.eyeX, b.y * ey, b.z);
      const g = F.glints[i];
      if (g) { const gb = g.userData.base; g.scale.set(gb.x, gb.y * Math.min(1, ey + 0.1), gb.z); g.visible = ey > 0.3; }
    });
    F.blush.forEach(bl => { const b = bl.userData.base; bl.scale.set(b.x * c.blush, b.y * c.blush, b.z); });
    let mouth = c.mouthO;
    if (an === "eat") mouth = Math.max(mouth, Math.abs(Math.sin(p * Math.PI * 6)) * 0.85);
    F.smile.visible = mouth < 0.5;
    F.smile.scale.set(c.smileX, c.smileY, 1);
    F.smile.position.y = F.smile.userData.baseY + c.smileDY;
    F.mouthO.visible = mouth > 0.3;
    const mo = F.mouthO.userData.base; F.mouthO.scale.set(mo.x * Math.max(mouth, 0.01), mo.y * Math.max(mouth, 0.01), mo.z);
    if (P.tongue) P.tongue.visible = name === "happy" && an !== "eat" || an === "dance";

    /* respiración (ciclo 3,2 s) y flotación */
    const br = t * 1.96 * c.breath;
    P.body.scale.set(P.bodyBase.x * (1 - Math.sin(br) * 0.008), P.bodyBase.y * (1 + Math.sin(br) * 0.018), P.bodyBase.z);
    P.head.position.y = P.headBaseY + Math.sin(br + 0.6) * 0.012;
    let y = -0.12 + Math.sin(t * 2.2 * Math.min(1, c.breath)) * (P.arms.length ? 0.012 : 0.03) * m;
    let rz = 0, sx = 1, sy = 1, x = 0, headTilt = c.tilt, headScaleY = 1;
    const armZ = [0, 0], armX = [0, 0];

    /* orejas (caídas con la tristeza), cola, órbita, destello, objeto en brazos */
    (P.ears || []).forEach((e, i) => {
      const out = e.position.x >= 0 ? -1 : 1;
      e.rotation.z = e.userData.baseZ + out * c.droop * 0.9 + Math.sin(t * 2.4 + i * 1.7) * 0.04 * m;
    });
    if (P.tail) P.tail.rotation.z = P.tail.userData.baseZ + Math.sin(t * 5) * 0.2 * (name === "happy" || an === "dance" ? 1 : 0.12) * m;
    if (P.orbit) P.orbit.rotation.z += dt * 0.5 * m;
    if (P.spark) P.spark.rotation.z = Math.sin(t * 2) * 0.3;
    if (P.prop) P.prop.rotation.z = Math.sin(t * 2) * 0.07 * m;
    if (P.lid) P.lid.rotation.x = -(c.lid) + (an === "hello" ? Math.sin(p * Math.PI * 6) * 0.18 * env : 0);

    /* acciones (tiempos de la guía de animaciones) */
    if (an === "hello") {
      rz = Math.sin(p * Math.PI * 3) * 0.1 * env * m;
      if (P.arms.length) armZ[1] = P.arms[1].userData.s * 2.3 * Math.min(1, env * 2.2) + Math.sin(p * Math.PI * 8) * 0.22 * env;
      headTilt += 0.08 * env;
    } else if (an === "happy" || an === "surprise") {
      const hops = an === "happy" ? 2 : 1, h = Math.abs(Math.sin(p * Math.PI * hops));
      y += h * (an === "happy" ? 0.34 : 0.26) * Math.max(m, 0.3);
      sx = 1 + 0.05 * (1 - h) * env; sy = 1 - 0.05 * (1 - h) * env + 0.04 * h * env;
      P.arms.forEach((a, i) => { armZ[i] = a.userData.s * (an === "happy" ? 0.9 : 0.6) * env; });
      if (an === "surprise") headTilt -= 0.05 * env;
    } else if (an === "love") {
      const s = 1 + Math.sin(p * Math.PI * 4) * 0.045 * env * Math.max(m, 0.4);
      sx = s; sy = s; headTilt += 0.14 * env;
    } else if (an === "dance") {
      const ph = t * Math.PI * 2 / 1.5;
      rz = Math.sin(ph) * 0.1 * m; x = Math.sin(ph) * 0.07 * m;
      y += Math.abs(Math.sin(ph)) * 0.05 * m;
      P.arms.forEach((a, i) => { armZ[i] = a.userData.s * (0.55 + 0.5 * Math.sin(ph * 2 + i * Math.PI)); });
      headTilt += Math.sin(ph) * 0.07;
    } else if (an === "eat") {
      headScaleY = 1 - Math.abs(Math.sin(p * Math.PI * 6)) * 0.035;
      P.arms.forEach((a, i) => { armX[i] = -0.5 * env; });
    } else if (an === "levelup") {
      const rise = p < 0.25 ? p / 0.25 : p < 0.6 ? 1 : p < 0.85 ? 1 - (p - 0.6) / 0.25 : 0;
      y += rise * 0.45 * Math.max(m, 0.3);
      P.arms.forEach((a, i) => { armZ[i] = a.userData.s * 2.2 * Math.sin(Math.PI * Math.min(1, p * 1.2)); });
      rz = Math.sin(p * Math.PI * 4) * 0.06 * m;
    }
    P.arms.forEach((a, i) => { a.rotation.z = a.userData.baseZ + armZ[i]; a.rotation.x = a.userData.baseX + armX[i]; });
    P.head.rotation.z = headTilt * (P.arms.length ? 1 : 0.5);
    P.head.scale.y = headScaleY;
    this.character.position.set(x, y, 0);
    this.character.rotation.z = rz;
    this.character.scale.set(this.charBase * sx, this.charBase * sy, this.charBase * sx);

    /* burbujas al dormir */
    if (name === "sleepy" && t > this.zNext && !still) { this.spawn("zzz"); this.zNext = t + 1.3; }

    /* giro del usuario: vuelve solo al soltar */
    if (!this.drag) this.yawUser *= Math.exp(-dt * 1.6);
    this.pivot.rotation.y = this.yawUser + Math.sin(t * 0.7) * 0.1 * m;

    /* destellos */
    this.fx.forEach(h => {
      const u = h.userData, a = (t - u.t0) / u.life;
      if (!u.on) { h.visible = false; return; }
      if (a > 1) { u.on = false; h.visible = false; h.material.opacity = 0; return; }
      if (a < 0) { h.visible = false; return; }
      h.visible = true; h.position.set(u.x + Math.sin(a * 6 + u.x * 9) * 0.04, u.y0 + a * u.rise, 0.55);
      h.material.opacity = Math.sin(Math.PI * a) * 0.9;
    });

    this.renderer.render(this.scene, this.camera);
  }

  getState() {
    const e = this.parts.face.eyes[0];
    return { pet: this.current, expr: this.expr, eyeY: e.scale.y / e.userData.base.y, yaw: this.yawUser,
      running: this.running, act: this.act ? this.act.name : null, fps: Math.round(this.fps), motion: this.motion,
      acc: this.accList.slice(), children: this.pivot.children.length };
  }
}
