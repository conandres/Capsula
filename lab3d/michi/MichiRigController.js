/**
 * Michi 2.0 skeletal animation controller for Three.js.
 * Requires GLTFLoader and a loaded rigged GLB.
 *
 * const controller = new MichiRigController(THREE, gltf);
 * controller.play("Rig_Idle_Breathing", true);
 * controller.play("Rig_Tail_Wag", true);
 * controller.stop("Rig_Tail_Wag");
 */
export class MichiRigController {
  constructor(THREE, gltf) {
    this.THREE = THREE;
    this.gltf = gltf;
    this.mixer = new THREE.AnimationMixer(gltf.scene);
    this.actions = new Map();
    for (const clip of gltf.animations || []) {
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }
  }
  play(name, loop = false, fadeSeconds = 0.2) {
    const action = this.actions.get(name);
    if (!action) return false;
    action.reset();
    action.enabled = true;
    action.setLoop(loop ? this.THREE.LoopRepeat : this.THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.fadeIn(fadeSeconds).play();
    return true;
  }
  stop(name, fadeSeconds = 0.2) {
    const action = this.actions.get(name);
    if (!action) return;
    action.fadeOut(fadeSeconds);
  }
  update(deltaSeconds) { this.mixer.update(deltaSeconds); }
  list() { return [...this.actions.keys()]; }
}
