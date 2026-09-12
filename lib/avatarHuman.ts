import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import type { AvatarState } from "@/components/Avatar";

/**
 * Realistic 3D human JanSewak — a ReadyPlayerMe-style rigged avatar
 * (public/avatar-lady.glb) with ARKit facial blendshapes. Her mouth
 * articulates visemes from the live voice level, she blinks, breathes,
 * makes eye contact (eyes track the cursor), and moves with natural
 * micro-motion instead of hand-authored geometry.
 *
 * To change her look, generate any avatar at https://readyplayer.me
 * (with ARKit + Oculus Visemes morph targets) and replace the GLB file.
 */

export interface AvatarSceneHandle {
  /** Advance animation + render one frame. `level` is agent voice 0..1. */
  tick(state: AvatarState, level: number, now: number): void;
  setPointer(x: number, y: number): void;
  dispose(): void;
}

interface Rig {
  head?: THREE.Object3D;
  neck?: THREE.Object3D;
  spine?: THREE.Object3D;
  eyeL?: THREE.Object3D;
  eyeR?: THREE.Object3D;
  morphMeshes: THREE.Mesh[];
  arms: { bone: THREE.Object3D; baseQ: THREE.Quaternion; pwq: THREE.Quaternion }[];
}

const _pq = new THREE.Quaternion();
/** Apply a WORLD-space rotation to a bone, composed on top of its current
 *  pose (rig rest rotations are non-trivial, so absolute eulers break it). */
function rotateBoneWorldQ(bone: THREE.Object3D, rw: THREE.Quaternion) {
  if (!bone.parent) return;
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.premultiply(_pq.clone().invert().multiply(rw).multiply(_pq));
}

const X = new THREE.Vector3(1, 0, 0);

/**
 * Measurement-based two-bone IK: read the real world positions of
 * shoulder/elbow/wrist, then apply minimal world rotations so the wrist
 * lands on `target` with the elbow bending toward `pole`. Works on any
 * rig regardless of bone-local axis conventions.
 */
function solveArmIK(root: THREE.Object3D, side: "Left" | "Right", target: THREE.Vector3, pole: THREE.Vector3) {
  const arm = root.getObjectByName(`${side}Arm`);
  const fore = root.getObjectByName(`${side}ForeArm`);
  const hand = root.getObjectByName(`${side}Hand`);
  if (!arm || !fore || !hand) return;

  root.updateMatrixWorld(true);
  const S = arm.getWorldPosition(new THREE.Vector3());
  const E = fore.getWorldPosition(new THREE.Vector3());
  const W = hand.getWorldPosition(new THREE.Vector3());
  const a = S.distanceTo(E);
  const b = E.distanceTo(W);

  const v = target.clone().sub(S);
  const d = Math.min(Math.max(v.length(), 0.05), a + b - 0.005);
  const n = v.normalize();
  const alpha = Math.acos(Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))));
  const u = n.clone().cross(pole);
  if (u.lengthSq() < 1e-6) u.set(0, 0, 1);
  u.normalize();
  const upperDir = n.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(u, alpha));

  rotateBoneWorldQ(arm, new THREE.Quaternion().setFromUnitVectors(E.sub(S).normalize(), upperDir));
  root.updateMatrixWorld(true);

  const E2 = fore.getWorldPosition(new THREE.Vector3());
  const W2 = hand.getWorldPosition(new THREE.Vector3());
  const foreDir = target.clone().sub(E2).normalize();
  rotateBoneWorldQ(fore, new THREE.Quaternion().setFromUnitVectors(W2.sub(E2).normalize(), foreDir));
  root.updateMatrixWorld(true);
}

/**
 * Air India hostess styling: deep-red saree with an aubergine gold-edged
 * pallu draped across the chest and over her left shoulder, hair in a neat
 * low bun with a white gajra, bindi, and gold studs/bangles.
 *
 * The pallu is a flat fabric ribbon built along a curve that hugs the
 * torso (a torus reads as a seatbelt, not cloth). Head-accessory
 * coordinates are in head-bone space: +y up, +z forward, eyes at y≈0.087.
 */

/** Build a flat cloth ribbon along `points`, lying on the body surface.
 *  Returns the ribbon mesh plus the two edge curves (for gold trim). */
function makeRibbon(points: THREE.Vector3[], width: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points);
  const N = 60;
  const pos: number[] = [];
  const idx: number[] = [];
  const edgeA: THREE.Vector3[] = [];
  const edgeB: THREE.Vector3[] = [];
  let prevW: THREE.Vector3 | null = null;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    // surface normal ≈ radially out from the body's vertical axis
    const out = new THREE.Vector3(p.x, 0, p.z).normalize();
    const w = new THREE.Vector3().crossVectors(tan, out).normalize();
    // keep the width direction continuous — near the shoulder the cross
    // product flips sign, which otherwise folds the ribbon into a kink
    if (prevW && w.dot(prevW) < 0) w.negate();
    prevW = w.clone();
    w.multiplyScalar(width / 2);
    const a = p.clone().add(w);
    const b = p.clone().sub(w);
    edgeA.push(a);
    edgeB.push(b);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    if (i < N) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { mesh: new THREE.Mesh(geo, material), edgeA, edgeB };
}
function dressAirIndia(model: THREE.Object3D, head?: THREE.Object3D) {
  const tint = (name: string, color: number, roughness: number) => {
    const m = model.getObjectByName(name);
    if (!(m instanceof THREE.Mesh)) return;
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    mat.map = null;
    mat.color.set(color);
    mat.roughness = roughness;
    mat.needsUpdate = true;
  };
  tint("Wolf3D_Outfit_Top", 0x7d0f20, 0.78); // Air India deep red blouse
  tint("Wolf3D_Outfit_Bottom", 0x7d0f20, 0.78); // saree skirt in the same red

  // gentle warm skin tint — barely-there multiply so the face stays bright
  // and natural (a strong tint muddies the texture and reads uncanny)
  for (const name of ["Wolf3D_Head", "Wolf3D_Body"]) {
    const m = model.getObjectByName(name);
    if (!(m instanceof THREE.Mesh)) continue;
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
    mat.color.set(0xf0d6ba);
    mat.needsUpdate = true;
  }

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.35 });

  // pallu: aubergine fabric ribbon from the right waist, across the chest,
  // over the left shoulder and down the back — matte, gold-edged
  const palluMat = new THREE.MeshStandardMaterial({ color: 0x3a1a45, roughness: 0.82, side: THREE.DoubleSide });
  const palluPath = [
    new THREE.Vector3(-0.145, 0.98, 0.11),
    new THREE.Vector3(-0.05, 1.12, 0.16),
    new THREE.Vector3(0.05, 1.26, 0.17),
    new THREE.Vector3(0.125, 1.38, 0.115),
    new THREE.Vector3(0.155, 1.46, 0.01),
    new THREE.Vector3(0.168, 1.39, -0.065),
  ];
  const pallu = makeRibbon(palluPath, 0.075, palluMat);
  model.add(pallu.mesh);
  for (const edge of [pallu.edgeA, pallu.edgeB]) {
    const trim = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 60, 0.0035, 6),
      goldMat,
    );
    model.add(trim);
  }

  // hostess hair: hide the GLB's loose hair, fit a matte skull cap with a
  // low bun at the nape and a white gajra. Matte warm brown is what keeps
  // it from reading as plastic (the old version was near-black and glossy).
  const hairMesh = model.getObjectByName("Wolf3D_Hair");
  if (hairMesh) hairMesh.visible = false;
  if (!head) return;

  const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b1b12, roughness: 0.72 });
  const style = new THREE.Group();

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.099, 48, 32), hairMat);
  cap.position.set(0, 0.09, -0.014);
  cap.scale.set(0.99, 1.05, 1.02);
  style.add(cap);

  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.044, 24, 18), hairMat);
  bun.position.set(0, 0.042, -0.1);
  bun.scale.set(1.1, 0.92, 0.9);
  style.add(bun);

  // white gajra wrapped around the bun
  const bunOut = new THREE.Vector3(0, -0.35, -0.94).normalize();
  const gajra = new THREE.Mesh(
    new THREE.TorusGeometry(0.046, 0.008, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xfff6ea, roughness: 0.9 }),
  );
  gajra.position.copy(bun.position);
  gajra.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bunOut);
  style.add(gajra);

  // bindi between the brows
  const bindi = new THREE.Mesh(
    new THREE.SphereGeometry(0.0035, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xa61e2b, roughness: 0.5 }),
  );
  bindi.position.set(0, 0.098, 0.102);
  bindi.scale.z = 0.25;
  style.add(bindi);

  // small gold stud earrings
  for (const sx of [-1, 1]) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 10), goldMat);
    stud.position.set(sx * 0.078, 0.045, 0.012);
    style.add(stud);
  }

  head.add(style);
}

/** Pose the arms from T-pose into a relaxed "at ease" stance — arms down,
 *  hands loosely folded in front at the waist. */
function poseAtEase(root: THREE.Object3D, headPos: THREE.Vector3) {
  const y = headPos.y - 0.44;
  solveArmIK(root, "Left", new THREE.Vector3(0.035, y, 0.17), new THREE.Vector3(0.6, -0.75, 0));
  solveArmIK(root, "Right", new THREE.Vector3(-0.035, y + 0.015, 0.19), new THREE.Vector3(-0.6, -0.75, 0));
  root.updateMatrixWorld(true);
}

export function createAvatarScene(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  onReady?: () => void,
): AvatarSceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min((canvas.ownerDocument.defaultView ?? window).devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  // neutral indoor environment so PBR skin/hair shade realistically
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(31, width / height, 0.05, 20);

  // warm key + soft fill on top of the environment
  const key = new THREE.DirectionalLight(0xfff1e0, 1.4);
  key.position.set(1.5, 2.5, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
  fill.position.set(-2, 1.5, 1.5);
  scene.add(fill);

  const rig: Rig = { morphMeshes: [], arms: [] };
  let ready = false;
  let disposed = false;
  let baseHeadQ: THREE.Quaternion | null = null;
  let baseEyeLQ: THREE.Quaternion | null = null;
  let baseEyeRQ: THREE.Quaternion | null = null;

  new GLTFLoader().load("/avatar-lady.glb", (gltf) => {
    if (disposed) return;
    const model = gltf.scene;
    scene.add(model);

    model.traverse((o) => {
      if (o instanceof THREE.Mesh && o.morphTargetDictionary) rig.morphMeshes.push(o);
      if (o.name === "Wolf3D_Glasses") o.visible = false;
    });
    rig.head = model.getObjectByName("Head") ?? undefined;
    rig.neck = model.getObjectByName("Neck") ?? undefined;
    rig.spine = model.getObjectByName("Spine1") ?? model.getObjectByName("Spine") ?? undefined;
    rig.eyeL = model.getObjectByName("LeftEye") ?? undefined;
    rig.eyeR = model.getObjectByName("RightEye") ?? undefined;

    // deep-black irises: the GLB's eye texture is light hazel. Tinting the
    // material would gray the whites too, so instead the texture itself is
    // repainted — bright pixels (sclera) stay, darker pixels (iris/pupil)
    // are pulled toward black. Gaze and blinks are untouched.
    const doneMats = new Set<THREE.Material>();
    for (const name of ["EyeLeft", "EyeRight"]) {
      const mesh = model.getObjectByName(name);
      if (!(mesh instanceof THREE.Mesh)) continue;
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      if (doneMats.has(mat)) continue;
      doneMats.add(mat);
      const src = mat.map?.image as ImageBitmap | HTMLImageElement | undefined;
      if (!src || !src.width) continue;
      const cv = canvas.ownerDocument.createElement("canvas");
      cv.width = src.width;
      cv.height = src.height;
      const cctx = cv.getContext("2d")!;
      cctx.drawImage(src, 0, 0);
      const im = cctx.getImageData(0, 0, cv.width, cv.height);
      const d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] + d[i + 1] + d[i + 2]) / 765;
        if (lum < 0.7) {
          const k = 0.18 + 0.62 * (lum / 0.7) * (lum / 0.7);
          d[i] *= k;
          d[i + 1] *= k;
          d[i + 2] *= k;
        }
      }
      cctx.putImageData(im, 0, 0);
      const tex = new THREE.CanvasTexture(cv);
      tex.flipY = mat.map!.flipY;
      tex.colorSpace = mat.map!.colorSpace;
      mat.map = tex;
      mat.needsUpdate = true;
    }
    const headPos = new THREE.Vector3(0, 1.6, 0);
    rig.head?.getWorldPosition(headPos);
    poseAtEase(model, headPos);
    dressAirIndia(model, rig.head);
    if (rig.head) baseHeadQ = rig.head.quaternion.clone();
    if (rig.eyeL) baseEyeLQ = rig.eyeL.quaternion.clone();
    if (rig.eyeR) baseEyeRQ = rig.eyeR.quaternion.clone();
    // cache the posed upper-arm bones for gentle motion while speaking
    for (const name of ["LeftArm", "RightArm"]) {
      const bone = model.getObjectByName(name);
      if (bone?.parent) {
        rig.arms.push({
          bone,
          baseQ: bone.quaternion.clone(),
          pwq: bone.parent.getWorldQuaternion(new THREE.Quaternion()),
        });
      }
    }

    // framing: head-and-shoulders with enough chest to show the pallu —
    // her face still fills the frame in small tiles
    camera.position.set(0, headPos.y - 0.105, headPos.z + 1.18);
    camera.lookAt(headPos.x, headPos.y - 0.125, headPos.z);

    ready = true;
    onReady?.();
  }, undefined, (err) => console.error("avatar load failed", err));

  function setMorph(name: string, value: number) {
    for (const m of rig.morphMeshes) {
      const idx = m.morphTargetDictionary![name];
      if (idx !== undefined && m.morphTargetInfluences) m.morphTargetInfluences[idx] = value;
    }
  }

  // animation state
  let smoothed = 0;
  let nextBlink = 1400;
  let blinkStart = -1;
  let nextSaccade = 800;
  const saccade = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };
  const look = { x: 0, y: 0 };
  const _q = new THREE.Quaternion();
  const _bobQ = new THREE.Quaternion();
  const _e = new THREE.Euler();

  function tick(state: AvatarState, level: number, now: number) {
    if (disposed || !ready) return;
    const t = now / 1000;
    // fast attack, slower release — the mouth reacts instantly to a syllable
    // but settles gently instead of snapping shut
    const target = state === "speaking" ? level : 0;
    smoothed += (target - smoothed) * (target > smoothed ? 0.55 : 0.18);
    const open = Math.min(1, smoothed * 1.6);

    // --- lips: small jaw + slow-drifting viseme mix. Real speech barely
    // opens the jaw — most articulation happens in the lips, so the jaw is
    // capped low and the shape weights drift at syllable rate (~3–8 Hz),
    // never the jittery flicker of fast sines ---
    const w1 = 0.5 + 0.5 * Math.sin(t * 5.1);
    const w2 = 0.5 + 0.5 * Math.sin(t * 3.4 + 1.9);
    const w3 = 0.5 + 0.5 * Math.sin(t * 7.3 + 4.2);
    setMorph("jawOpen", open * (0.11 + 0.08 * w1));
    setMorph("mouthOpen", open * 0.1);
    setMorph("viseme_aa", open * 0.28 * w1);
    setMorph("viseme_O", open * 0.2 * w2);
    setMorph("viseme_E", open * 0.22 * w3);
    setMorph("viseme_U", open * 0.1 * (1 - w1));
    setMorph("mouthFunnel", open * 0.08 * w2);
    // lips roll inward a touch between syllables — reads as natural closure
    setMorph("mouthRollLower", (1 - w1) * open * 0.1);

    // --- cute, friendly resting face: a warm genuine smile that survives
    // speech, dimples, and happy rounded cheeks ---
    const smile = 0.4 - open * 0.1;
    setMorph("mouthSmileLeft", smile);
    setMorph("mouthSmileRight", smile);
    setMorph("mouthDimpleLeft", 0.25);
    setMorph("mouthDimpleRight", 0.25);
    // Duchenne warmth: the smile reaches her eyes (slight squint + cheeks)
    setMorph("cheekSquintLeft", 0.18);
    setMorph("cheekSquintRight", 0.18);
    setMorph("eyeSquintLeft", 0.08);
    setMorph("eyeSquintRight", 0.08);
    // brows stay relaxed and softly lifted at the outside — raised INNER
    // brows read as worry/fear, so attentiveness uses the OUTER brows
    const attentive = state === "listening" ? 0.12 : 0;
    setMorph("browInnerUp", 0.02);
    setMorph("browOuterUpLeft", 0.06 + attentive + open * 0.08);
    setMorph("browOuterUpRight", 0.06 + attentive + open * 0.08);

    // --- blink (slightly more often while listening — feels engaged) ---
    if (blinkStart < 0 && now > nextBlink) blinkStart = now;
    if (blinkStart >= 0) {
      const p = (now - blinkStart) / 140;
      if (p >= 1) {
        blinkStart = -1;
        nextBlink = now + 1800 + Math.random() * 2600;
        setMorph("eyeBlinkLeft", 0);
        setMorph("eyeBlinkRight", 0);
      } else {
        const v = Math.sin(Math.PI * p);
        setMorph("eyeBlinkLeft", v);
        setMorph("eyeBlinkRight", v);
      }
    }

    // --- eye contact: track the cursor with quick micro-saccades ---
    if (now > nextSaccade) {
      nextSaccade = now + 900 + Math.random() * 2200;
      saccade.x = (Math.random() - 0.5) * 0.05;
      saccade.y = (Math.random() - 0.5) * 0.03;
    }
    // soft, slow gaze — darty wide-range eyes are what read as "scary"
    look.x += (pointer.x * 0.13 + saccade.x - look.x) * 0.1;
    look.y += (-pointer.y * 0.08 + saccade.y - 0.04 - look.y) * 0.1;
    if (rig.eyeL && rig.eyeR && baseEyeLQ && baseEyeRQ) {
      _e.set(-look.y, look.x, 0);
      _q.setFromEuler(_e);
      rig.eyeL.quaternion.copy(baseEyeLQ).multiply(_q);
      rig.eyeR.quaternion.copy(baseEyeRQ).multiply(_q);
    }

    // --- head: follows the gaze with lag + speech micro-nods ---
    if (rig.head && baseHeadQ) {
      const nod = state === "speaking" ? Math.sin(t * 2.2) * (0.006 + open * 0.018) : 0;
      const tilt = state === "listening" ? 0.05 : 0;
      _e.set(
        -look.y * 0.5 + nod + 0.02 * Math.sin(t * 0.9),
        look.x * 0.55 + 0.015 * Math.sin(t * 0.6),
        tilt + 0.01 * Math.sin(t * 0.7),
      );
      _q.setFromEuler(_e);
      rig.head.quaternion.copy(baseHeadQ).multiply(_q);
    }

    // --- namaste bob: both arms rock together gently while she speaks ---
    if (rig.arms.length) {
      const bobAngle = open * 0.03 * Math.sin(t * 2.3) + 0.01 * Math.sin(t * 1.4);
      _bobQ.setFromAxisAngle(X, bobAngle);
      for (const a of rig.arms) {
        _q.copy(a.pwq).invert().multiply(_bobQ).multiply(a.pwq).multiply(a.baseQ);
        a.bone.quaternion.copy(_q);
      }
    }

    // --- breathing + connecting shimmer ---
    if (rig.spine) rig.spine.rotation.x = 0.012 * Math.sin(t * 1.4);
    renderer.toneMappingExposure = state === "connecting" ? 1.08 + 0.08 * Math.sin(t * 5) : 1.08;

    renderer.render(scene, camera);
  }

  function setPointer(x: number, y: number) {
    pointer.x = Math.min(1, Math.max(-1, x));
    pointer.y = Math.min(1, Math.max(-1, y));
  }

  function dispose() {
    disposed = true;
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
          m.dispose();
        }
      }
    });
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
  }

  return { tick, setPointer, dispose };
}
