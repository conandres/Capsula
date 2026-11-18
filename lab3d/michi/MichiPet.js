/**
 * Capsula — Michi 2.0 integration helper (Three.js)
 * Loads a stage GLB, plays its embedded clips, manages care stats and audio events.
 *
 * Usage:
 *   const michi = new MichiPet({ THREE, scene, audioBaseUrl: "/assets/michi/audio/" });
 *   await michi.load("/assets/michi/michi_bebe_v2.glb");
 *   michi.update(deltaSeconds); // call from your render loop
 *   michi.pet(); michi.feed(); michi.play(); michi.sleep();
 *
 * This helper is framework-agnostic. Connect its callbacks/state to your app UI.
 */
export class MichiPet {
  constructor({ THREE, scene, audioBaseUrl = "./audio/", onState = () => {}, onEvolution = () => {} }) {
    this.THREE = THREE;
    this.scene = scene;
    this.audioBaseUrl = audioBaseUrl;
    this.onState = onState;
    this.onEvolution = onEvolution;
    this.root = null;
    this.mixer = null;
    this.actions = new Map();
    this.currentAction = null;
    this.audio = new Map();
    this.looping = new Set();
    this.state = { stage: "bebe", affection: 0, hunger: 55, fun: 45, rest: 75, trust: 0, xp: 0 };
    this.stageFiles = {
      bebe: "michi_bebe_v2.glb",
      juvenil: "michi_juvenil_v2.glb",
      adulto: "michi_adulto_v2.glb"
    };
    this.clipAliases = {
      idle: ["Michi_Idle_Breathing"],
      walk: ["Michi_Caminar"],
      eat: ["Michi_Comer_Con_Ganas", "Michi_Comer"],
      sleep: ["Michi_Dormir"],
      pet: ["Michi_Caricia_Tiernita"],
      purr: ["Michi_Ronroneo_Feliz"],
      askFood: ["Michi_Pidiendo_Comida"],
      celebrate: ["Michi_Agradecido_Salto_Feliz", "Michi_Celebracion_Juvenil", "Michi_Celebracion_Adulto"],
      evolveBaby: ["Michi_Evolucion_Bebe_a_Juvenil"],
      evolveAdult: ["Michi_Evolucion_Juvenil_a_Adulto"]
    };
    this.soundFiles = {
      evolution_start: "evolucion_magica.wav",
      evolution_complete: "celebracion.wav",
      pet_touched: "caricia.wav",
      pet_happy: "michi_feliz.wav",
      purr_start: "ronroneo.wav",
      food_bite: "comer.wav",
      food_request: "pidiendo_comida.wav",
      sleep_start: "dormir.wav",
      walk_step: "caminar.wav"
    };
  }

  async load(url, GLTFLoader) {
    const Loader = GLTFLoader || this.THREE.GLTFLoader;
    if (!Loader) throw new Error("Pasa GLTFLoader de three/examples/jsm/loaders/GLTFLoader.js");
    const loader = typeof Loader === "function" ? new Loader() : Loader;
    const gltf = await loader.loadAsync(url);
    if (this.root) this.scene.remove(this.root);
    this.root = gltf.scene;
    this.scene.add(this.root);
    this.mixer = new this.THREE.AnimationMixer(this.root);
    this.actions.clear();
    for (const clip of gltf.animations || []) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.play("idle", { fade: 0.2 });
    this.onState({ ...this.state });
    return gltf;
  }

  update(dt) {
    if (this.mixer) this.mixer.update(dt);
    // Needs decay gently while the pet is active; clamp to avoid negative values.
    this.state.hunger = Math.max(0, this.state.hunger - dt * 0.12);
    this.state.fun = Math.max(0, this.state.fun - dt * 0.035);
    this.state.rest = Math.max(0, this.state.rest - dt * 0.025);
  }

  findClip(alias) {
    const names = this.clipAliases[alias] || [alias];
    for (const name of names) if (this.actions.has(name)) return this.actions.get(name);
    return null;
  }

  play(alias, { fade = 0.18, loop = false } = {}) {
    const action = this.findClip(alias);
    if (!action) return false;
    if (this.currentAction && this.currentAction !== action) this.currentAction.fadeOut(fade);
    action.reset();
    action.setLoop(loop ? this.THREE.LoopRepeat : this.THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.fadeIn(fade).play();
    this.currentAction = action;
    if (!loop && alias !== "idle") {
      const once = (event) => {
        if (event.action === action) {
          this.mixer.removeEventListener("finished", once);
          this.play("idle");
        }
      };
      this.mixer.addEventListener("finished", once);
    }
    return true;
  }

  async sound(event, { loop = false, volume = 0.65 } = {}) {
    const filename = this.soundFiles[event];
    if (!filename) return;
    let audio = this.audio.get(event);
    if (!audio) {
      audio = new Audio(new URL(filename, this.audioBaseUrl).toString());
      audio.preload = "auto";
      this.audio.set(event, audio);
    }
    audio.pause();
    audio.currentTime = 0;
    audio.loop = loop;
    audio.volume = Math.max(0, Math.min(1, volume));
    if (loop) this.looping.add(event);
    else this.looping.delete(event);
    try { await audio.play(); } catch (e) { /* browser may require a user gesture */ }
  }

  stopSound(event, fadeMs = 250) {
    const audio = this.audio.get(event);
    if (!audio) return;
    const start = audio.volume;
    const steps = 8;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      audio.volume = Math.max(0, start * (1 - i / steps));
      if (i >= steps) {
        clearInterval(timer);
        audio.pause();
        audio.currentTime = 0;
        this.looping.delete(event);
      }
    }, Math.max(10, fadeMs / steps));
  }

  publish() { this.onState({ ...this.state }); }

  pet() {
    this.state.affection = Math.min(100, this.state.affection + 8);
    this.state.trust = Math.min(100, this.state.trust + 2);
    this.state.xp += 5;
    this.play("pet"); this.sound("pet_touched", { volume: 0.45 });
    if (this.state.affection >= 40) this.sound("purr_start", { loop: true, volume: 0.35 });
    this.checkEvolution(); this.publish();
  }

  feed() {
    this.state.hunger = Math.min(100, this.state.hunger + 35);
    this.state.trust = Math.min(100, this.state.trust + 3);
    this.state.xp += 8;
    this.play("eat"); this.sound("food_bite", { volume: 0.5 });
    this.checkEvolution(); this.publish();
  }

  askForFood() {
    this.play("askFood"); this.sound("food_request", { volume: 0.7 });
  }

  playWithPet() {
    this.state.fun = Math.min(100, this.state.fun + 30);
    this.state.affection = Math.min(100, this.state.affection + 3);
    this.state.xp += 7;
    this.play("celebrate"); this.sound("pet_happy", { volume: 0.7 });
    this.checkEvolution(); this.publish();
  }

  sleep() {
    this.state.rest = Math.min(100, this.state.rest + 45);
    this.play("sleep", { loop: true });
    this.sound("sleep_start", { loop: true, volume: 0.25 });
    this.publish();
  }

  wake() {
    this.stopSound("sleep_start");
    this.play("idle");
  }

  walk() {
    this.play("walk", { loop: true });
    this.sound("walk_step", { loop: true, volume: 0.25 });
  }

  stopWalk() {
    this.stopSound("walk_step");
    this.play("idle");
  }

  canEvolve() {
    const s = this.state;
    return s.xp >= (s.stage === "bebe" ? 100 : 280) &&
      s.affection >= 45 && s.trust >= 25 && s.hunger >= 25 &&
      s.fun >= 20 && s.rest >= 20;
  }

  async checkEvolution() {
    if (!this.canEvolve()) return false;
    const next = this.state.stage === "bebe" ? "juvenil" : this.state.stage === "juvenil" ? "adulto" : null;
    if (!next) return false;
    this.sound("evolution_start", { volume: 0.8 });
    this.play(this.state.stage === "bebe" ? "evolveBaby" : "evolveAdult");
    this.state.stage = next;
    this.state.xp = 0;
    this.onEvolution({ stage: next, model: this.stageFiles[next] });
    this.publish();
    this.sound("evolution_complete", { volume: 0.85 });
    return true;
  }
}
