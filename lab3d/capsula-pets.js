/**
 * Cápsula 3D — mascotas procedurales (Three.js).
 * Base: paquete "Capsula-3D-Interactive 0.1.0", corregido y ampliado:
 *   parpadeo, expresiones, tocar y girar, respiración, accesorios, fondo transparente,
 *   liberación de memoria, pausa fuera de pantalla y "reducir movimiento".
 * Three.js entra por import map ("three"), así la página decide de dónde se carga.
 */
import * as THREE from "three";

const C = {
  white: 0xfff7fb, pink: 0xf29ac2, blush: 0xffb5d0, dark: 0x351b2d,
  purple: 0xb99be9, gold: 0xffd36b, cream: 0xffe8d8
};

/* Tipos de la app (gato, perro…) <-> ids del visor. */
export const APP_KIND = { gato: "cat", perro: "dog", conejo: "bunny", oso: "bear", nube: "capsule" };
export const PETS = {
  cat: { kind: "Gato", app: "gato" },
  dog: { kind: "Perro", app: "perro" },
  bunny: { kind: "Conejo", app: "conejo" },
  bear: { kind: "Oso", app: "oso" },
  capsule: { kind: "Cápsula (central)", app: "nube" }
};
export const EXPRESSIONS = ["neutral", "happy", "sleepy", "surprised", "sad"];
export const ACTIONS = ["hello", "happy", "love", "surprise"];
export const ACCESSORIES = ["corona", "flor", "lentes"];

/* Cada expresión es un conjunto de números hacia los que la cara se suaviza. */
const EXPR = {
  neutral:   { eyeX: 1,    eyeY: 1,    smileX: 1,    smileY: 1,    smileDY: 0,     mouthO: 0, blush: 1,   breath: 1 },
  happy:     { eyeX: 1.05, eyeY: 0.5,  smileX: 1.3,  smileY: 1.35, smileDY: 0.005, mouthO: 0, blush: 1.7, breath: 1.15 },
  sleepy:    { eyeX: 1,    eyeY: 0.1,  smileX: 0.55, smileY: 0.5,  smileDY: -0.01, mouthO: 0, blush: 0.8, breath: 0.55 },
  surprised: { eyeX: 1.3,  eyeY: 1.4,  smileX: 1,    smileY: 1,    smileDY: 0,     mouthO: 1, blush: 1,   breath: 1.3 },
  sad:       { eyeX: 1,    eyeY: 0.85, smileX: 0.9,  smileY: -0.8, smileDY: -0.07,  mouthO: 0, blush: 0.5, breath: 0.8 }
};

const SPH = new THREE.SphereGeometry(1, 28, 20); /* una sola esfera compartida por todas las piezas */
const mat = (color, roughness = 0.34, metalness = 0.02) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function ball(parent, name, color, pos, scale, opts = {}) {
  const m = new THREE.Mesh(SPH, opts.material || mat(color, opts.roughness ?? 0.34, opts.metalness ?? 0.02));
  m.name = name;
  m.position.set(pos[0], pos[1], pos[2]);
  m.scale.set(scale[0], scale[1], scale[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/* Cara con ojos, brillos, mejillas, sonrisa y boca "o". Devuelve las piezas para animarlas. */
function addFace(parent, { z = 0.43, eyeSize = 0.07 } = {}) {
  const F = { eyes: [], glints: [], blush: [] };
  for (const s of [-1, 1]) {
    const e = ball(parent, "eye", C.dark, [s * 0.15, 0.13, z], [eyeSize, eyeSize * 1.2, 0.035], { roughness: 0.18 });
    e.userData.base = e.scale.clone(); F.eyes.push(e);
    const g = ball(parent, "glint", 0xffffff, [s * 0.15 - eyeSize * 0.22, 0.13 + eyeSize * 0.34, z + 0.032],
      [eyeSize * 0.28, eyeSize * 0.28, 0.018], { roughness: 0.12 });
    g.userData.base = g.scale.clone(); F.glints.push(g);
    const b = ball(parent, "blush", C.blush, [s * 0.25, -0.005, z - 0.005], [0.075, 0.045, 0.022]);
    b.userData.base = b.scale.clone(); F.blush.push(b);
  }
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.095, 0.03, 0), new THREE.Vector3(0, -0.095, 0.015), new THREE.Vector3(0.095, 0.03, 0));
  const smile = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.018, 8, false), mat(C.dark));
  smile.name = "smile";
  smile.position.set(0, 0, z + 0.015);
  parent.add(smile);
  F.smile = smile;
  const o = ball(parent, "mouth-o", C.dark, [0, -0.06, z + 0.012], [0.04, 0.05, 0.02]);
  o.userData.base = o.scale.clone(); o.visible = false;
  F.mouthO = o;
  return F;
}

function finish(parts, extra = {}) {
  (parts.ears || []).forEach(e => { e.userData.baseZ = e.rotation.z; });
  parts.bodyBase = parts.body.scale.clone();
  parts.headBaseY = parts.head.position.y;
  return Object.assign(parts, extra);
}

function makeCat(g) {
  const body = ball(g, "body", C.white, [0, -0.18, 0], [0.43, 0.48, 0.34]);
  const head = ball(g, "head", C.white, [0, 0.34, 0.04], [0.52, 0.48, 0.43]);
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.38, 32), mat(C.white));
    ear.position.set(s * 0.34, 0.72, 0.02); ear.rotation.z = s * -0.22; ear.castShadow = true; g.add(ear); ears.push(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.23, 24), mat(C.pink));
    inner.position.set(0.0, 0.02, 0.15); ear.add(inner);
  }
  const face = addFace(g, { z: 0.435 });
  const tail = ball(g, "tail", C.white, [-0.43, -0.35, -0.13], [0.14, 0.14, 0.28]);
  tail.rotation.z = -0.7; tail.userData.baseZ = -0.7;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 12, 48), mat(C.pink));
  collar.position.set(0, -0.04, 0.02); collar.rotation.x = Math.PI / 2; g.add(collar);
  ball(g, "bell", C.gold, [0, -0.1, 0.37], [0.075, 0.075, 0.05]);
  return finish({ head, body, ears, face, tail, top: [0, 0.8, 0.04], faceZ: 0.435 });
}

function makeDog(g) {
  const body = ball(g, "body", C.white, [0, -0.18, 0], [0.44, 0.47, 0.34]);
  const head = ball(g, "head", C.white, [0, 0.34, 0.04], [0.53, 0.48, 0.43]);
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = ball(g, "floppy-ear", C.pink, [s * 0.46, 0.32, 0.02], [0.18, 0.34, 0.17]);
    ear.rotation.z = s * -0.35; ears.push(ear);
  }
  const face = addFace(g, { z: 0.445 });
  ball(g, "muzzle", C.cream, [0, -0.045, 0.43], [0.19, 0.13, 0.07]);
  ball(g, "nose", C.dark, [0, 0.015, 0.505], [0.07, 0.052, 0.035]);
  ball(g, "paw-tag", C.gold, [0, -0.18, 0.37], [0.095, 0.095, 0.035]);
  return finish({ head, body, ears, face, top: [0, 0.8, 0.04], faceZ: 0.445 });
}

function makeBunny(g) {
  const body = ball(g, "body", C.white, [0, -0.18, 0], [0.43, 0.47, 0.34]);
  const head = ball(g, "head", C.white, [0, 0.32, 0.04], [0.5, 0.46, 0.42]);
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = ball(g, "bunny-ear", C.white, [s * 0.19, 0.82, 0.01], [0.13, 0.39, 0.12]);
    ear.rotation.z = s * -0.12; ears.push(ear);
    const inner = ball(ear, "inner-ear", C.pink, [0, 0.01, 0.9], [0.5, 0.74, 0.3]);
    inner.castShadow = false;
  }
  const face = addFace(g, { z: 0.43 });
  const heart = new THREE.Group(); heart.name = "heart";
  const hm = mat(C.pink);
  ball(heart, "lobe", C.pink, [-0.065, 0.02, 0], [0.09, 0.09, 0.06], { material: hm });
  ball(heart, "lobe", C.pink, [0.065, 0.02, 0], [0.09, 0.09, 0.06], { material: hm });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 32), hm); tip.position.set(0, -0.09, 0); tip.rotation.z = Math.PI; heart.add(tip);
  heart.position.set(0, -0.3, 0.48); heart.scale.setScalar(0.8); g.add(heart);
  return finish({ head, body, ears, face, top: [0, 0.76, 0.04], faceZ: 0.43 });
}

function makeBear(g) {
  const body = ball(g, "body", C.pink, [0, -0.18, 0], [0.44, 0.47, 0.34]);
  const head = ball(g, "head", C.pink, [0, 0.34, 0.04], [0.52, 0.48, 0.43]);
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = ball(g, "bear-ear", C.pink, [s * 0.39, 0.68, 0.01], [0.17, 0.18, 0.15]);
    ear.rotation.z = 0; ears.push(ear);
    ball(ear, "ear-inner", C.blush, [0, 0, 0.92], [0.53, 0.55, 0.23]);
  }
  const face = addFace(g, { z: 0.44 });
  ball(g, "muzzle", C.white, [0, -0.03, 0.44], [0.18, 0.13, 0.07]);
  ball(g, "nose", C.dark, [0, 0.03, 0.51], [0.06, 0.05, 0.03]);
  const star = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), mat(C.gold));
  star.scale.set(1, 1, 0.35); star.position.set(0, -0.29, 0.46); g.add(star);
  return finish({ head, body, ears, face, top: [0, 0.8, 0.04], faceZ: 0.44 });
}

function makeCapsule(g) {
  const cloud = new THREE.Group(); cloud.name = "cloud"; g.add(cloud);
  const center = ball(cloud, "cloud-center", C.white, [0, 0.15, 0], [0.42, 0.39, 0.26]);
  ball(cloud, "cloud-left", C.white, [-0.3, 0.02, 0], [0.3, 0.25, 0.24]);
  ball(cloud, "cloud-right", C.white, [0.3, 0.02, 0], [0.3, 0.25, 0.24]);
  const face = addFace(cloud, { z: 0.25, eyeSize: 0.065 });
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.035, 12, 96), mat(C.purple, 0.2, 0.18));
  orbit.rotation.x = 1.1; orbit.rotation.y = -0.2; orbit.position.y = -0.03; g.add(orbit);
  const spark = ball(g, "sparkle", C.gold, [0.55, 0.62, 0.08], [0.09, 0.09, 0.09], { metalness: 0.12 });
  return finish({ head: cloud, body: cloud, ears: [], face, orbit, spark, top: [0, 0.52, 0.0], faceZ: 0.25 },
    { headBaseY: 0 });
}

const BUILDERS = { cat: makeCat, dog: makeDog, bunny: makeBunny, bear: makeBear, capsule: makeCapsule };

/* Accesorios de prueba (se colocan según la cabeza de cada mascota). */
function makeAccessory(id, parts) {
  const g = new THREE.Group(); g.name = "acc-" + id;
  const [tx, ty, tz] = parts.top;
  if (id === "corona") {
    const m = mat(C.gold, 0.25, 0.3);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 12), m);
      c.position.set(Math.sin(a) * 0.13, 0.06, Math.cos(a) * 0.1); c.castShadow = true; g.add(c);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.025, 10, 32), m);
    ring.rotation.x = Math.PI / 2; ring.scale.set(1, 0.8, 1); g.add(ring);
    g.position.set(tx, ty - 0.02, tz); g.rotation.x = -0.18;
  } else if (id === "flor") {
    const pm = mat(C.pink, 0.4), cm = mat(C.gold, 0.4);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ball(g, "petal", C.pink, [Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0], [0.05, 0.05, 0.03], { material: pm });
    }
    ball(g, "core", C.gold, [0, 0, 0.015], [0.04, 0.04, 0.03], { material: cm });
    g.position.set(tx + 0.27, ty - 0.1, tz + 0.12); g.rotation.y = 0.5;
  } else if (id === "lentes") {
    const m = mat(C.dark, 0.3, 0.1);
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.014, 10, 28), m);
      r.position.set(s * 0.15, 0, 0); r.castShadow = true; g.add(r);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.014), m); g.add(bridge);
    g.position.set(0, 0.13, parts.faceZ + 0.045);
  }
  return g;
}

function disposeTree(obj) {
  obj.traverse(o => {
    if (o.geometry && o.geometry !== SPH) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
}

export class CapsulaPetViewer {
  constructor(container, options = {}) {
    if (!container) throw new Error("CapsulaPetViewer necesita un elemento contenedor.");
    this.container = container;
    this.opts = options;
    this.current = "cat"; this.expr = "neutral"; this.accList = [];
    this.t = 0; this.last = 0; this.fps = 0;
    this.cur = { ...EXPR.neutral }; this.tgt = { ...EXPR.neutral };
    this.act = null; this.tmp = null;
    this.yawUser = 0; this.drag = null;
    this.blink = { next: 2.5, start: -1, double: false };
    this.visible = true; this.running = false;
    this.motion = 1;

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
    key.position.set(3, 4, 5); key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 });
    key.shadow.camera.updateProjectionMatrix();
    this.scene.add(key);
    const rim = new THREE.PointLight(0xe88ac8, 24, 8); rim.position.set(-2, 1, 2); this.scene.add(rim);
    /* Solo recibe la sombra: el fondo de la página se ve a través. */
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.ShadowMaterial({ opacity: 0.22 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.91; floor.scale.set(1.5, 1, 0.6); floor.receiveShadow = true;
    this.scene.add(floor);

    this.pivot = new THREE.Group(); this.scene.add(this.pivot);
    this.hearts = [];
    this.heartGroup = new THREE.Group(); this.scene.add(this.heartGroup);

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
    this.camera.position.z = h / w > 1.25 ? 4.9 : 4.4;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  destroy() {
    this.destroyed = true;
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver && this.resizeObserver.disconnect();
    this.io && this.io.disconnect();
    document.removeEventListener("visibilitychange", this.onVis);
    if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener("change", this.onMq);
    this.unbindPointer && this.unbindPointer();
    this.clearCharacter();
    this.heartGroup.children.forEach(h => { h.material.dispose(); });
    SPH.dispose();
    this.scene.traverse(o => {
      if (o.geometry && o.geometry !== SPH) o.geometry.dispose();
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
    if (APP_KIND[id]) id = APP_KIND[id];     /* acepta "gato" o "cat" */
    if (!BUILDERS[id]) id = "cat";
    this.clearCharacter();
    this.current = id;
    this.character = new THREE.Group();
    this.pivot.add(this.character);
    this.parts = BUILDERS[id](this.character);
    this.charBase = id === "capsule" ? 1.08 : 1;
    this.character.scale.setScalar(this.charBase);
    this.character.position.y = -0.12;
    this.act = null; this.tmp = null;
    this.blink = { next: this.t + 1.5 + Math.random() * 2, start: -1, double: false };
    this.accGroup = null;
    this.setAccessories(this.accList);
    this.container.dispatchEvent(new CustomEvent("capsulapetchange", { detail: { id, ...PETS[id] } }));
    this.renderOnce();
  }
  setExpression(name) {
    if (!EXPR[name]) name = "neutral";
    this.expr = name;
  }
  setAccessories(list) {
    this.accList = (list || []).filter(a => ACCESSORIES.includes(a));
    if (this.accGroup) { disposeTree(this.accGroup); this.character.remove(this.accGroup); }
    this.accGroup = new THREE.Group();
    this.accList.forEach(a => this.accGroup.add(makeAccessory(a, this.parts)));
    this.character.add(this.accGroup);
    this.renderOnce();
  }
  play(action = "hello") {
    if (!ACTIONS.includes(action)) action = "hello";
    const dur = { hello: 1.4, happy: 1.3, love: 1.9, surprise: 1.0 }[action];
    this.act = { name: action, start: this.t, dur };
    this.tmp = { expr: action === "surprise" ? "surprised" : "happy", until: this.t + dur + 0.3 };
    if (action === "love") this.spawnHearts();
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
        const pool = ["happy", "hello", "love", "surprise"];
        this.play(pool[Math.floor(Math.random() * pool.length)]);
        this.container.dispatchEvent(new CustomEvent("capsulapettap"));
      }
    };
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move);
    const cancel = () => { this.drag = null; };   /* si el navegador toma el gesto (scroll), no cuenta como toque */
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up); c.addEventListener("pointercancel", cancel);
    this.unbindPointer = () => {
      c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", cancel);
    };
  }

  /* ---------- animación ---------- */
  spawnHearts() {
    for (let i = 0; i < 5; i++) {
      let h = this.hearts[i];
      if (!h) {
        h = new THREE.Mesh(SPH, new THREE.MeshBasicMaterial({ color: C.pink, transparent: true, opacity: 0 }));
        h.scale.setScalar(0.06); this.heartGroup.add(h); this.hearts[i] = h;
      }
      h.userData = { t0: this.t + i * 0.18, x: (i - 2) * 0.18, life: 1.4 };
    }
  }
  renderOnce() { if (!this.running && this.renderer) { this.frame(0.016, true); } }
  tick() {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0, now - this.last));
    this.last = now;
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.08;
    this.frame(dt, false);
  }
  frame(dt, still) {
    if (!this.character) return;
    this.t += dt;
    const t = this.t, P = this.parts, m = this.motion;

    /* expresión efectiva: la temporal de una acción manda mientras dura */
    let name = this.expr;
    if (this.tmp && t < this.tmp.until) name = this.tmp.expr; else this.tmp = null;
    this.tgt = EXPR[name];
    const k = 1 - Math.exp(-dt * 12);
    for (const key in this.cur) this.cur[key] += (this.tgt[key] - this.cur[key]) * k;
    if (still) for (const key in this.cur) this.cur[key] = this.tgt[key];

    /* parpadeo: cada 2–5 s, a veces doble */
    const B = this.blink;
    if (B.start < 0 && t >= B.next) B.start = t;
    let bm = 1;
    if (B.start >= 0) {
      const p = (t - B.start) / 0.16;
      if (p >= 1) {
        B.start = -1;
        if (!B.double && Math.random() < 0.15) { B.double = true; B.next = t + 0.1; }
        else { B.double = false; B.next = t + 2.2 + Math.random() * 3.3; }
      } else bm = 1 - Math.sin(Math.PI * p) * 0.93;
    }
    const F = P.face, c = this.cur;
    F.eyes.forEach((e, i) => {
      const b = e.userData.base;
      e.scale.set(b.x * c.eyeX, b.y * Math.max(0.05, c.eyeY * bm), b.z);
      const g = F.glints[i], gb = g.userData.base, ey = Math.max(0.05, c.eyeY * bm);
      g.scale.set(gb.x, gb.y * Math.min(1, ey + 0.1), gb.z);
      g.visible = ey > 0.3;
    });
    F.blush.forEach(bl => { const b = bl.userData.base; bl.scale.set(b.x * c.blush, b.y * c.blush, b.z); });
    F.smile.visible = c.mouthO < 0.5;
    F.smile.scale.set(c.smileX, c.smileY, 1);
    F.smile.position.y = c.smileDY;
    F.mouthO.visible = c.mouthO > 0.3;
    const mo = F.mouthO.userData.base; F.mouthO.scale.set(mo.x * c.mouthO, mo.y * c.mouthO, mo.z);

    /* respiración y flotación */
    const br = t * 1.8 * c.breath;
    P.body.scale.set(P.bodyBase.x * (1 - Math.sin(br) * 0.01), P.bodyBase.y * (1 + Math.sin(br) * 0.022), P.bodyBase.z);
    if (P.head !== P.body) P.head.position.y = P.headBaseY + Math.sin(br + 0.6) * 0.012;
    let y = -0.12 + Math.sin(t * 2.2 * Math.min(1, c.breath)) * 0.03 * m;
    let rz = 0, sx = 1, sy = 1, earWave = 0;

    /* orejas, cola, órbita */
    (P.ears || []).forEach((e, i) => { e.rotation.z = e.userData.baseZ + Math.sin(t * 2.4 + i * 1.7) * 0.04 * m * (name === "surprised" ? 2 : 1); });
    if (P.tail) P.tail.rotation.z = P.tail.userData.baseZ + Math.sin(t * 5) * 0.18 * (name === "happy" ? 1 : 0.15) * m;
    if (P.orbit) { P.orbit.rotation.z += dt * 0.5 * m; }
    if (P.spark) { P.spark.scale.setScalar(0.09 * (1 + Math.sin(t * 3) * 0.12)); }

    /* acciones */
    if (this.act) {
      const p = (t - this.act.start) / this.act.dur;
      if (p >= 1) this.act = null;
      else {
        const env = Math.sin(Math.PI * p);
        if (this.act.name === "hello") {
          rz = Math.sin(p * Math.PI * 4) * 0.16 * env * m;
          earWave = Math.sin(p * Math.PI * 8) * 0.5 * env * m;
        } else if (this.act.name === "happy" || this.act.name === "surprise") {
          const hops = this.act.name === "happy" ? 2 : 1, h = Math.abs(Math.sin(p * Math.PI * hops));
          y += h * (this.act.name === "happy" ? 0.34 : 0.28) * Math.max(m, 0.3);
          sx = 1 + 0.05 * (1 - h) * env; sy = 1 - 0.05 * (1 - h) * env + 0.04 * h * env;
        } else if (this.act.name === "love") {
          const s = 1 + Math.sin(p * Math.PI * 6) * 0.05 * env * Math.max(m, 0.4);
          sx = s; sy = s;
        }
      }
    }
    if (earWave && P.ears && P.ears.length) { const e = P.ears[P.ears.length - 1]; e.rotation.z += earWave; }
    this.character.position.y = y;
    this.character.rotation.z = rz;
    this.character.scale.set(this.charBase * sx, this.charBase * sy, this.charBase * sx);

    /* giro del usuario, vuelve solo al soltar */
    if (!this.drag) this.yawUser *= Math.exp(-dt * 1.6);
    this.pivot.rotation.y = this.yawUser + Math.sin(t * 0.7) * 0.1 * m;

    /* corazones del cariño */
    this.hearts.forEach(h => {
      const u = h.userData, a = (t - u.t0) / u.life;
      if (!u.life || a < 0 || a > 1) { h.material.opacity = 0; h.visible = false; return; }
      h.visible = true; h.position.set(u.x, 0.1 + a * 1.1, 0.5);
      h.material.opacity = Math.sin(Math.PI * a) * 0.9;
    });

    this.renderer.render(this.scene, this.camera);
  }

  /* para pruebas y para mostrar en la página */
  getState() {
    const e = this.parts.face.eyes[0];
    return { pet: this.current, expr: this.expr, eyeY: e.scale.y / e.userData.base.y, yaw: this.yawUser,
      running: this.running, act: this.act ? this.act.name : null, fps: Math.round(this.fps), motion: this.motion,
      acc: this.accList.slice(), children: this.pivot.children.length };
  }
}
