/* eslint-disable react/no-unknown-property */
'use client';

// JourneyPath — "Il percorso / Da studenti a studio" (pagina Chi siamo).
//
// Un viaggio in tre atti, guidato dallo scroll:
//  1. PARTENZA — schermata d'apertura (titolo, tabellone delle tappe, pulsante
//     "Scorri per partire"). Il cursore 3D è già appoggiato sul pulsante: al
//     primo scroll lo CLICCA e parte.
//  2. LE 4 TAPPE — il cursore vola da una tappa all'altra, si posa accanto
//     all'oggetto e lo clicca (pressione + onde): l'oggetto nasce dalla punta.
//     Ogni tappa è un CHECKPOINT: lo scroll fa resistenza e si posa da solo
//     sulla tappa (data-scroll-detent, gestito in main.ts).
//  3. ARRIVO — dopo la quarta tappa il cursore raggiunge il finale (pannello
//     fisso nel layer pinnato) e clicca "Iniziamo"; la scena si ferma e se ne
//     va insieme alla pagina, composta, senza sparire di colpo.
//
// Il cursore è un vero puntatore: punta SEMPRE in alto a sinistra, in volo si
// inclina appena (niente giravolte). La scia blu→ember registra la strada
// fatta e si ferma prima del cursore; la rotta da fare è un tratteggio.
// Tutto via ref in useFrame → zero re-render durante lo scroll.
// Solo con WebGL e senza reduced-motion; altrimenti restano tappe e timeline.

import { useEffect, useMemo, useRef, useState, Suspense, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer } from '@react-three/drei';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import StepAssets, { prewarm, ASSET_LAYOUT, assetX, assetY, assetScale } from './JourneyStepAssets.jsx';

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// COSTANTI DI CALIBRAZIONE
// ---------------------------------------------------------------------------
const MODEL_URL = '/models/cursor_arrow.glb';

// --- Normalizzazione modello ---------------------------------------------
const TARGET_SIZE = 0.78; // dimensione max (unità scena) dopo auto-scala
const CURSOR_SIZE = TARGET_SIZE;
const MODEL_SCALE = 1;

// --- Orientamento: un puntatore vero ---------------------------------------
const FACE_ROT = -Math.PI / 2; // porta la faccia piatta verso la camera
const TIP_OFFSET = 0; // la punta del modello è su +Y locale
const FACE_FLIP = false;
// Direzione della punta a riposo: in alto a sinistra, come il puntatore del
// sistema operativo (≈ 30° dalla verticale).
const AIM = Math.PI / 2 + 0.52;
const AIM_X = Math.cos(AIM);
const AIM_Y = Math.sin(AIM);
const PITCH = 0.22; // inclinazione 3D fissa: si vede lo spessore
const LEAN_MAX = 0.32; // roll massimo in volo (rad)
const LEAN_GAIN = 0.9; // roll per unità di velocità laterale
const STEER = 0.22; // quanto la punta "segue" la rotta in volo (0 = mai)
const POSE_SMOOTH = 0.0025; // smorzamento della posa (più basso = più calmo)
const POS_SMOOTH = 0.008; // smorzamento della posizione (τ ≈ 0.2 s)

// --- Materiale blu glossy ------------------------------------------------
const MAT_COLOR = '#2748A5';
const MAT_ROUGHNESS = 0.12;
const MAT_METALNESS = 0.15;
const MAT_CLEARCOAT = 1.0;
const MAT_CLEARCOAT_ROUGHNESS = 0.18;
const MAT_ENV_INTENSITY = 1.25;

// --- Scena che scorre col page-scroll ------------------------------------
// La scena trasla in Y più lenta del testo (parallasse) e si FERMA all'arrivo
// (`hold`): da lì in poi cursore, scia e finale stanno immobili nel layer
// pinnato e se ne vanno con la pagina quando il pin si sgancia.
const SCENE_BASE = -2.7;
const SCENE_TRAVEL = 11;
const sceneY = (p, hold) => SCENE_BASE + SCENE_TRAVEL * Math.min(p / Math.max(hold, 0.01), 1);

// --- Interazione: trascinamento del cursore ------------------------------
const DRAG_RADIUS = 1.5;
const DRAG_RETURN = 0.07;

// --- Ritmo: VOLO → SOSTA → CLICK ---------------------------------------------
const DWELL_VH = 0.15; // mezza sosta su ogni tappa, in viewport di scroll
const LINGER_VH = 0.36; // l'oggetto resta in scena fin qui dopo la tappa
const END_HOLD_VH = 0.3; // scroll di "posa" finale prima che il pin si sganci
const SWOOP_Z = 0.75; // picchiata verso la camera a metà volo
const PRESS_DELAY = 0.16; // s: arriva, si ferma un istante, poi clicca
const HOVER_BOB = 0.03; // respiro del cursore in sosta (unità mondo)

const smooth = (x) => x * x * x * (x * (x * 6 - 15) + 10); // smootherstep
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Curva di pressione del click (0 → 1 → 0): giù in 0.09 s, tiene, rilascia
// con un filo di rimbalzo. `age` = secondi dal click.
function pressAt(age) {
  const a = age - PRESS_DELAY;
  if (a < 0) return 0;
  if (a < 0.09) return smooth(a / 0.09);
  if (a < 0.15) return 1;
  if (a < 0.42) {
    const r = (a - 0.15) / 0.27;
    return 1 - smooth(r) * 1.08 + Math.sin(Math.PI * r) * 0.04;
  }
  return 0;
}

// Meta del viaggio dalle misure DOM (tutto in progress 0..1, tranne i px):
//   steps[i] = { p, y, enterAt, exitAt }   ancore e finestre delle 4 tappe
//   pEnd     = arrivo al finale, hold = pEnd (la scena si ferma lì)
//   dwell    = mezza sosta;  startPx/endPx = punti cliccati (px del layer)
function buildMeta(stepPs, span, vh, startPx, endPx) {
  const dwell = (DWELL_VH * vh) / span;
  const linger = (LINGER_VH * vh) / span;
  const pEnd = 1 - (END_HOLD_VH * vh) / span;
  const hold = pEnd;
  const steps = stepPs.map((p, i) => {
    const next = stepPs[i + 1] ?? pEnd;
    return {
      p,
      y: -sceneY(p, hold),
      enterAt: Math.max(p - dwell, 0.005),
      exitAt: Math.min(p + linger, next - dwell - 0.02),
    };
  });
  const p4 = stepPs[stepPs.length - 1] ?? 0.8;
  return { steps, pEnd, hold, dwell, outroAt: (p4 + dwell + pEnd) / 2, startPx, endPx };
}
const FALLBACK_META = buildMeta([0.22, 0.4, 0.58, 0.76], 4.3, 1, null, null);

// Tappa in corso: −1 partenza, 0..3 tappe, 4 finale.
function stageAt(p, meta) {
  if (p >= meta.outroAt) return 4;
  let idx = -1;
  meta.steps.forEach((s, i) => {
    if (p >= s.enterAt) idx = i;
  });
  return idx;
}


// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function hasWebGL() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Materiale blu glossy condiviso (premium, clearcoat, riflessi via Environment)
// ---------------------------------------------------------------------------
function makeGlossyMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(MAT_COLOR),
    metalness: MAT_METALNESS,
    roughness: MAT_ROUGHNESS,
    clearcoat: MAT_CLEARCOAT,
    clearcoatRoughness: MAT_CLEARCOAT_ROUGHNESS,
    envMapIntensity: MAT_ENV_INTENSITY,
    sheen: 0.3,
    sheenColor: new THREE.Color('#A9B6CE'),
  });
}

// ---------------------------------------------------------------------------
// Modello 3D + fallback
// ---------------------------------------------------------------------------
function ArrowModel(props) {
  const { scene } = useGLTF(MODEL_URL);
  const prepared = useMemo(() => {
    const material = makeGlossyMaterial();
    const s = scene.clone(true);
    s.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        o.rotation.set(0, 0, 0);
        o.quaternion.identity();
        o.updateMatrix();
        o.material = material;
      }
    });
    const wrap = new THREE.Group();
    wrap.add(s);
    const box = new THREE.Box3().setFromObject(wrap);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    s.position.sub(center);
    wrap.scale.setScalar(TARGET_SIZE / maxDim);
    return wrap;
  }, [scene]);
  // Materiale fisico (clearcoat + sheen): shader pesante, meglio compilarlo
  // appena caricato che al primo frame in vista.
  const { gl, camera, scene: rootScene } = useThree();
  useEffect(() => prewarm(gl, prepared, camera, rootScene), [gl, camera, rootScene, prepared]);
  return <primitive object={prepared} {...props} />;
}

// Freccia-segnaposto: usata finché cursor_arrow.glb non è presente (o se fallisce).
function PlaceholderArrow(props) {
  return (
    <group {...props}>
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.42, 0.9, 32]} />
        <meshPhysicalMaterial
          color={MAT_COLOR}
          metalness={MAT_METALNESS}
          roughness={MAT_ROUGHNESS}
          clearcoat={MAT_CLEARCOAT}
          clearcoatRoughness={MAT_CLEARCOAT_ROUGHNESS}
          envMapIntensity={MAT_ENV_INTENSITY}
        />
      </mesh>
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 1, 24]} />
        <meshPhysicalMaterial
          color="#1C2B5F"
          metalness={0.2}
          roughness={0.4}
          clearcoat={0.6}
          envMapIntensity={MAT_ENV_INTENSITY}
        />
      </mesh>
    </group>
  );
}

class ModelBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* silenzioso: il segnaposto copre l'assenza del modello */
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Ambiente di riflessi (in-memory, nessun HDR esterno)
// ---------------------------------------------------------------------------
function StudioEnv() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer
        form="rect"
        intensity={2.2}
        color="#ffffff"
        position={[2, 3, 2]}
        scale={[6, 6, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.4}
        color="#A9B6CE"
        position={[-4, 1, 1]}
        scale={[5, 8, 1]}
      />
      <Lightformer
        form="circle"
        intensity={1.0}
        color="#ffffff"
        position={[0, -3, 2]}
        scale={[4, 4, 1]}
      />
    </Environment>
  );
}

// ---------------------------------------------------------------------------
// Layout del viaggio: stazioni (dove il cursore si posa) e punte (il punto
// cliccato). Partenza = pulsante "Scorri per partire", tappe = angolo in basso
// a destra di ogni oggetto, arrivo = pulsante del finale. Il puntatore punta
// sempre in alto a sinistra, quindi il suo centro sta in basso a destra della
// punta. Tra due stazioni la curva passa per un punto spostato verso la
// camera (picchiata).
// ---------------------------------------------------------------------------
const ARC_SAMPLES = 2000;

function useJourneyLayout(meta, mobile) {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  return useMemo(() => {
    const worldH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    const wpp = worldH / height;
    const halfW = (worldH * width) / height / 2;
    const k = mobile ? 0.66 : 1;
    const half = CURSOR_SIZE * 0.5 * k;
    const stationOf = (tip, z = 0.2) =>
      new THREE.Vector3(tip.x - AIM_X * half * 1.05, tip.y - AIM_Y * half * 1.05, z);
    // px del layer pinnato → coordinate locali della scena (che è traslata).
    const fromPx = (px, offset) => new THREE.Vector3((px.x - width / 2) * wpp, (height / 2 - px.y) * wpp - offset, 0.2);

    const tips = [];
    const s0 = meta.steps[0];
    tips.push(
      meta.startPx
        ? fromPx(meta.startPx, sceneY(0, meta.hold))
        : new THREE.Vector3(mobile ? 0 : -1.2, s0.y + 2.6, 0.2)
    );
    meta.steps.forEach((s, i) => {
      const L = ASSET_LAYOUT[i] ?? { side: i % 2 ? 1 : -1, size: 1.8 };
      const r = L.size * assetScale(mobile);
      const ax = assetX(L.side, halfW, mobile, L.size);
      const ay = assetY(s.y, mobile);
      tips.push(new THREE.Vector3(ax + r * 0.24, ay - r * 0.24, 0.2));
    });
    const last = meta.steps[meta.steps.length - 1];
    tips.push(
      meta.endPx
        ? fromPx(meta.endPx, sceneY(1, meta.hold))
        : new THREE.Vector3(0.4, last.y - 2.4, 0.2)
    );
    const stations = tips.map((t) => stationOf(t));

    const knots = [];
    const stationKnot = [];
    stations.forEach((st, i) => {
      if (i > 0) {
        const prev = stations[i - 1];
        const toStep = i < stations.length - 1;
        // Desktop: il punto di picchiata sta dal lato della tappa d'arrivo (il
        // suo testo è sul lato opposto → la rotta lo scansa). Mobile: oggetti
        // centrati sopra al testo, la rotta corre lungo il margine destro.
        // Primo volo: partenza e tappa 1 stanno una sopra l'altra → arco a C
        // verso il margine sinistro (la rotta poi riparte verso destra senza
        // ricciolo), così il cursore fa davvero un po' di strada.
        const x = mobile
          ? Math.max(prev.x, st.x) + (i === 1 ? 0.28 : 0.1)
          : i === 1
            ? Math.min(prev.x, st.x) - halfW * 0.2
            : toStep
              ? st.x * 0.5
              : (prev.x + st.x) / 2;
        // Verso il finale si arriva DAL BASSO a destra: la scia non taglia il
        // titolo del pannello d'arrivo.
        const mid = toStep
          ? new THREE.Vector3(x, (prev.y + st.y) / 2, mobile ? SWOOP_Z * 0.6 : SWOOP_Z)
          : new THREE.Vector3(st.x + (mobile ? 0.3 : 1.1), st.y - (mobile ? 0.5 : 0.8), SWOOP_Z * 0.5);
        knots.push(mid);
      }
      stationKnot.push(knots.length);
      knots.push(st);
    });

    const curve = new THREE.CatmullRomCurve3(knots, false, 'centripetal');
    const lengths = curve.getLengths(ARC_SAMPLES);
    const total = lengths[ARC_SAMPLES];
    const uOf = (knot) => lengths[Math.round((knot / (knots.length - 1)) * ARC_SAMPLES)] / total;
    const U = stationKnot.map(uOf);
    const P = [0, ...meta.steps.map((s) => s.p), meta.pEnd];
    // La scia si ferma prima del cursore e la rotta riparte dopo di lui.
    const gapU = (CURSOR_SIZE * 0.62 * k) / total;
    const trailCurve = smoothTrail(curve, total, mobile ? 0.2 : 0.34);
    return { curve, trailCurve, stations, tips, U, P, gapU, dwell: meta.dwell };
  }, [meta, mobile, camera, width, height]);
}

// La scia non ricalca il cursore al millimetro: campiona la rotta a passo
// costante, la leviga con una gaussiana (sigma in unità mondo) e la schiaccia
// verso lo sfondo. Gli estremi restano fermi. Il parametro della curva
// risultante è lo stesso `u` del cursore, così drawRange resta allineato.
const TRAIL_SAMPLES = 900;
function smoothTrail(curve, total, sigma) {
  const N = TRAIL_SAMPLES;
  const src = curve.getSpacedPoints(N);
  const s = Math.max(1, (sigma / total) * N);
  const R = Math.ceil(s * 2.5);
  const w = [];
  for (let k = -R; k <= R; k++) w.push(Math.exp(-(k * k) / (2 * s * s)));
  const pts = src.map((p0, i) => {
    const acc = new THREE.Vector3();
    let ws = 0;
    for (let k = -R; k <= R; k++) {
      const q = src[Math.min(N, Math.max(0, i + k))];
      acc.addScaledVector(q, w[k + R]);
      ws += w[k + R];
    }
    acc.divideScalar(ws);
    // vicino agli estremi la levigatura sfuma: partenza e arrivo esatti
    const edge = smooth(clamp01(Math.min(i, N - i) / (s * 2)));
    acc.lerpVectors(p0, acc, edge);
    acc.z = 0.08 + (acc.z - 0.2) * 0.35;
    return acc;
  });
  const c = new THREE.Curve();
  c.getPoint = (t, out = new THREE.Vector3()) => {
    const f = clamp01(t) * N;
    const i = Math.min(N - 1, Math.floor(f));
    return out.lerpVectors(pts[i], pts[i + 1], f - i);
  };
  c.getPointAt = c.getPoint;
  c.getTangentAt = (t, out) => c.getTangent(t, out);
  return c;
}

// progress → posizione lungo la curva, col ritmo volo/sosta. `seg` = volo in
// corso (0 = dalla partenza alla tappa 1), `e` = avanzamento del volo 0..1.
const START_GO = 0.012; // si parte appena dopo il click sul pulsante
function travel(p, layout, out) {
  const { P, U, dwell } = layout;
  const last = P.length - 2;
  let j = 0;
  while (j < last && p > P[j + 1]) j++;
  const f0 = P[j] + (j === 0 ? START_GO : dwell);
  const f1 = P[j + 1] - (j + 1 <= last ? dwell : 0);
  const e = f1 > f0 ? smooth(clamp01((p - f0) / (f1 - f0))) : 1;
  out.seg = j;
  out.e = e;
  out.u = U[j] + (U[j + 1] - U[j]) * e;
  return out;
}

// ---------------------------------------------------------------------------
// Rotta tratteggiata, in due passate sulla stessa geometria (Line2, spessore
// in px): la strada fatta (più marcata, blu→ember) e quella da fare (tenue).
// Il taglio attorno al cursore e la maschera attorno agli oggetti 3D sono nel
// fragment shader: la linea svanisce morbida dove passa dietro a un oggetto
// (nessuna sovrapposizione, niente trasparenze) e segue la sua nascita/scala.
// ---------------------------------------------------------------------------
const TRAIL_POINTS = 700;
const CAM_Z = 6.5;
const MASK_Z = ASSET_LAYOUT[0]?.z ?? -0.35;
const MASK_PAD = 0.62; // raggio maschera / lato del cubo normalizzato
const MAX_MASKS = 4;

const TRAIL_VERT_HEAD = /* glsl */ `
uniform float uCamZ;
uniform float uMaskZ;
varying vec2 vMaskPos;
`;
const TRAIL_VERT_BODY = /* glsl */ `
  {
    vec3 mp = ( position.y < 0.5 ) ? instanceStart : instanceEnd;
    vec4 mw = modelMatrix * vec4( mp, 1.0 );
    // proiezione sul piano degli oggetti: maschera allineata a quello che si vede
    vMaskPos = mw.xy * ( uCamZ - uMaskZ ) / ( uCamZ - mw.z );
  }
  #include <clipping_planes_vertex>
`;
const TRAIL_FRAG_HEAD = /* glsl */ `
uniform vec4 uMask[ ${MAX_MASKS} ];
uniform float uCut;
uniform float uSide;
uniform float uFeather;
varying vec2 vMaskPos;
`;
const TRAIL_FRAG_BODY = /* glsl */ `
  float keep = smoothstep( 0.0, uFeather, uSide * ( vLineDistance - uCut ) );
  for ( int i = 0; i < ${MAX_MASKS}; i++ ) {
    vec4 m = uMask[ i ];
    if ( m.z > 0.0 ) {
      float q = length( vMaskPos - m.xy ) / m.z;
      keep *= mix( 1.0, smoothstep( 1.0, 1.35, q ), m.w );
    }
  }
  alpha *= keep;
  if ( alpha < 0.004 ) discard;
  gl_FragColor = vec4( diffuseColor.rgb, alpha );
`;

function trailMaterial({ side, ...opts }) {
  const mat = new LineMaterial({ transparent: true, depthWrite: false, dashed: true, dashScale: 1, ...opts });
  Object.assign(mat.uniforms, {
    uCamZ: { value: CAM_Z },
    uMaskZ: { value: MASK_Z },
    uMask: { value: Array.from({ length: MAX_MASKS }, () => new THREE.Vector4()) },
    uCut: { value: 0 },
    uSide: { value: side },
    uFeather: { value: 0.12 },
  });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = TRAIL_VERT_HEAD + sh.vertexShader.replace('#include <clipping_planes_vertex>', TRAIL_VERT_BODY);
    sh.fragmentShader =
      TRAIL_FRAG_HEAD + sh.fragmentShader.replace('gl_FragColor = vec4( diffuseColor.rgb, alpha );', TRAIL_FRAG_BODY);
  };
  mat.customProgramCacheKey = () => 'apd-trail';
  return mat;
}

function PathTrail({ layout, progressRef, masksRef, mobile }) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const { done, todo, dist } = useMemo(() => {
    const curve = layout.trailCurve;
    const pos = [];
    const col = [];
    const dist = new Float32Array(TRAIL_POINTS + 1);
    const a = new THREE.Color('#2748A5');
    const b = new THREE.Color('#D84002');
    const c = new THREE.Color();
    const v = new THREE.Vector3();
    const prev = new THREE.Vector3();
    for (let i = 0; i <= TRAIL_POINTS; i++) {
      const t = i / TRAIL_POINTS;
      curve.getPoint(t, v);
      if (i > 0) dist[i] = dist[i - 1] + v.distanceTo(prev);
      prev.copy(v);
      pos.push(v.x, v.y, v.z);
      c.copy(a).lerp(b, smooth(clamp01((t - 0.3) / 0.6)));
      col.push(c.r, c.g, c.b);
    }
    const geo = new LineGeometry();
    geo.setPositions(pos);
    geo.setColors(col);
    const dash = { dashSize: 0.055, gapSize: 0.075 };
    const done = new Line2(geo, trailMaterial({ side: -1, vertexColors: true, linewidth: mobile ? 1.6 : 2, opacity: 0.85, ...dash }));
    const todo = new Line2(geo, trailMaterial({ side: 1, color: '#2748A5', linewidth: mobile ? 1.2 : 1.4, opacity: 0.32, ...dash }));
    done.computeLineDistances();
    for (const l of [done, todo]) {
      l.raycast = () => null;
      l.renderOrder = -1;
    }
    return { done, todo, dist };
  }, [layout, mobile]);

  useEffect(
    () => () => {
      done.geometry.dispose();
      done.material.dispose();
      todo.material.dispose();
    },
    [done, todo]
  );

  useEffect(() => {
    done.material.resolution.set(width, height);
    todo.material.resolution.set(width, height);
  }, [done, todo, width, height]);

  const tr = useMemo(() => ({}), []);
  const wp = useMemo(() => new THREE.Vector3(), []);
  const distAt = (u) => {
    const f = clamp01(u) * TRAIL_POINTS;
    const i = Math.min(TRAIL_POINTS - 1, Math.floor(f));
    return dist[i] + (dist[i + 1] - dist[i]) * (f - i);
  };
  useFrame(() => {
    travel(clamp01(progressRef.current ?? 0), layout, tr);
    done.material.uniforms.uCut.value = distAt(tr.u - layout.gapU);
    todo.material.uniforms.uCut.value = distAt(tr.u + layout.gapU);
    // Maschere: sagoma reale degli oggetti (posizione, scala di nascita).
    const list = masksRef.current;
    for (let i = 0; i < MAX_MASKS; i++) {
      const m = list[i];
      const g = m?.group;
      const r = g && g.visible ? m.size * MASK_PAD * g.scale.x : 0;
      for (const l of [done, todo]) {
        const u = l.material.uniforms.uMask.value[i];
        if (r > 0.002) {
          g.getWorldPosition(wp);
          u.set(wp.x, wp.y, r, 1);
        } else u.set(0, 0, 0, 0);
      }
    }
  });

  return (
    <group>
      <primitive object={todo} />
      <primitive object={done} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Bersagli delle 4 tappe: mirino che respira finché non viene cliccato, poi
// resta acceso (pieno, ember). Al click, due onde concentriche dalla punta.
// ---------------------------------------------------------------------------
function Targets({ layout, metaRef, progressRef, clickRef }) {
  const tips = layout.tips.slice(1, -1);
  const items = useMemo(
    () =>
      tips.map(() => ({
        ringMat: new THREE.MeshBasicMaterial({ color: '#2748A5', transparent: true, depthWrite: false }),
        dotMat: new THREE.MeshBasicMaterial({ color: '#D84002', transparent: true, depthWrite: false, opacity: 0 }),
        waveMats: ['#2748A5', '#D84002'].map(
          (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false })
        ),
        ring: null,
        dot: null,
        waves: [null, null],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout]
  );
  const geos = useMemo(
    () => ({
      ring: new THREE.RingGeometry(0.06, 0.078, 48),
      dot: new THREE.CircleGeometry(0.032, 32),
      wave: new THREE.RingGeometry(0.2, 0.215, 64),
    }),
    []
  );
  useEffect(
    () => () => {
      for (const it of items) [it.ringMat, it.dotMat, ...it.waveMats].forEach((m) => m.dispose());
    },
    [items]
  );
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  useFrame((state) => {
    const p = clamp01(progressRef.current ?? 0);
    const steps = (metaRef.current ?? FALLBACK_META).steps;
    const t = state.clock.elapsedTime;
    const click = clickRef.current;
    items.forEach((it, i) => {
      const visited = p >= (steps[i]?.enterAt ?? 1) && !(click.index === i && t - click.time < PRESS_DELAY);
      const breathe = 0.5 + 0.5 * Math.sin(t * 2.4 + i);
      it.ringMat.opacity = visited ? 0.55 : 0.22 + breathe * 0.35;
      if (it.ring) it.ring.scale.setScalar(visited ? 1 : 1 + breathe * 0.25);
      it.dotMat.opacity += ((visited ? 1 : 0) - it.dotMat.opacity) * 0.15;
      if (it.dot) it.dot.scale.setScalar(Math.max(it.dotMat.opacity, 0.001));
      it.waves.forEach((w, kk) => {
        if (!w) return;
        const age = click.index === i ? t - click.time - PRESS_DELAY - kk * 0.12 : 99;
        const life = kk ? 1.15 : 0.9;
        const on = age >= 0 && age < life;
        w.visible = on;
        if (!on) return;
        const x = age / life;
        w.scale.setScalar(0.2 + (1 - Math.pow(1 - x, 3)) * (kk ? 3.4 : 2.4));
        it.waveMats[kk].opacity = (1 - x) * (kk ? 0.5 : 0.75);
      });
    });
  });

  return (
    <group>
      {tips.map((tip, i) => (
        <group key={i} position={tip}>
          <mesh ref={(m) => (items[i].ring = m)} geometry={geos.ring} material={items[i].ringMat} raycast={() => null} />
          <mesh ref={(m) => (items[i].dot = m)} geometry={geos.dot} material={items[i].dotMat} raycast={() => null} />
          {[0, 1].map((kk) => (
            <mesh
              key={kk}
              ref={(m) => (items[i].waves[kk] = m)}
              geometry={geos.wave}
              material={items[i].waveMats[kk]}
              visible={false}
              raycast={() => null}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Il canvas non ha un suo requestAnimationFrame (frameloop "never"): disegna
// dentro il ticker di GSAP, DOPO lenis.raf (registrato prima, in main.ts).
// Così il 3D legge lo stesso progresso di scroll del testo nello stesso frame.
// Fuori vista il ticker si stacca e il canvas non costa nulla.
// ---------------------------------------------------------------------------
function TickerDriver({ active }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (!active) return;
    let first = true;
    const tick = (time) => {
      const state = get();
      if (first) state.clock.elapsedTime = time - 1 / 60;
      first = false;
      state.advance(time);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [active, get]);
  return null;
}

function JourneyScene({ progressRef, metaRef, children }) {
  const g = useRef();
  useFrame(() => {
    if (!g.current) return;
    const hold = (metaRef.current ?? FALLBACK_META).hold;
    g.current.position.y = sceneY(clamp01(progressRef.current ?? 0), hold);
  });
  return <group ref={g}>{children}</group>;
}

// ---------------------------------------------------------------------------
// Cursore: un puntatore vero. Punta sempre in alto a sinistra; in volo la
// punta segue appena la rotta (STEER) e il corpo si inclina di lato con la
// velocità (yaw), tutto molto smorzato. In sosta respira; all'arrivo clicca:
// un istante di attesa, pressione (scala giù + punta nello schermo), rilascio.
// Trascinabile col mouse con ritorno morbido.
// ---------------------------------------------------------------------------
const lerpAngle = (a, b, w) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * w;
};

function Cursor({ layout, progressRef, clickRef, onClick, mobile }) {
  const group = useRef();
  const lean = useRef(0);
  const vx = useRef(0);
  const prevX = useRef(null);
  const inited = useRef(false);
  const lastZone = useRef(-9);
  const { camera, size, gl } = useThree();

  const drag = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0, offX: 0, offY: 0 });

  const tmp = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      posB: new THREE.Vector3(),
      axisX: new THREE.Vector3(1, 0, 0),
      axisY: new THREE.Vector3(0, 1, 0),
      axisZ: new THREE.Vector3(0, 0, 1),
      qFace: new THREE.Quaternion(),
      qPitch: new THREE.Quaternion(),
      qSpin: new THREE.Quaternion(),
      qYaw: new THREE.Quaternion(),
      target: new THREE.Quaternion(),
      tr: {},
    }),
    []
  );

  const worldPerPx = useMemo(() => {
    const h = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    return h / size.height;
  }, [camera, size.height]);

  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current;
      if (!d.active) return;
      let ox = d.baseX + (e.clientX - d.startX) * worldPerPx;
      let oy = d.baseY - (e.clientY - d.startY) * worldPerPx;
      const len = Math.hypot(ox, oy);
      if (len > DRAG_RADIUS) {
        ox *= DRAG_RADIUS / len;
        oy *= DRAG_RADIUS / len;
      }
      d.offX = ox;
      d.offY = oy;
    };
    const onUp = () => {
      drag.current.active = false;
      gl.domElement.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [worldPerPx, gl]);

  const onPointerDown = (e) => {
    e.stopPropagation();
    const d = drag.current;
    d.active = true;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.baseX = d.offX;
    d.baseY = d.offY;
    gl.domElement.style.cursor = 'grabbing';
  };
  const onPointerOver = () => {
    if (!drag.current.active) gl.domElement.style.cursor = 'grab';
  };
  const onPointerOut = () => {
    if (!drag.current.active) gl.domElement.style.cursor = '';
  };

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const { curve, P, dwell } = layout;
    const p = clamp01(progressRef.current ?? 0);
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    const tr = travel(p, layout, tmp.tr);

    curve.getPointAt(tr.u, tmp.pos);
    if (tr.u > 0.997) {
      curve.getPointAt(tr.u - 0.003, tmp.posB);
      tmp.posB.subVectors(tmp.pos, tmp.posB);
    } else {
      curve.getPointAt(tr.u + 0.003, tmp.posB);
      tmp.posB.sub(tmp.pos);
    }
    const motion = Math.atan2(tmp.posB.y, tmp.posB.x);
    const flying = Math.sin(Math.PI * tr.e);

    // --- Click: partenza (−1) al primo scroll, tappa i all'ingresso della
    // sua sosta, arrivo (4) a fine corsa. Rientrare in una zona ri-clicca.
    let zone = -9;
    if (p >= P[P.length - 1]) zone = 4;
    else if (p > 0.002 && p < 0.03) zone = -1;
    else for (let i = 1; i < P.length - 1; i++) if (Math.abs(p - P[i]) <= dwell) zone = i - 1;
    if (zone !== lastZone.current) {
      lastZone.current = zone;
      if (zone !== -9) {
        clickRef.current = { index: zone, time: t };
        onClick?.(zone);
      }
    }
    const click = clickRef.current;
    const press = click.index > -9 ? pressAt(t - click.time) : 0;
    const parked = 1 - flying;

    const d = drag.current;
    if (!d.active) {
      d.offX += (0 - d.offX) * DRAG_RETURN;
      d.offY += (0 - d.offY) * DRAG_RETURN;
    }
    tmp.pos.x += d.offX;
    tmp.pos.y += d.offY + Math.sin(t * 1.7) * HOVER_BOB * parked * (1 - press);
    tmp.pos.z -= press * 0.14;

    if (!inited.current) {
      g.position.copy(tmp.pos);
    } else {
      g.position.lerp(tmp.pos, d.active ? 1 - Math.pow(0.0001, dt) : 1 - Math.pow(POS_SMOOTH, dt));
    }

    // Velocità laterale (smorzata) → inclinazione del corpo.
    if (prevX.current != null && dt > 0) {
      const v = (g.position.x - prevX.current) / dt;
      vx.current += (v - vx.current) * (1 - Math.pow(0.02, dt));
    }
    prevX.current = g.position.x;
    const targetLean = THREE.MathUtils.clamp(vx.current * LEAN_GAIN * (mobile ? 0.7 : 1), -LEAN_MAX, LEAN_MAX);
    lean.current += (targetLean - lean.current) * (1 - Math.pow(POSE_SMOOTH, dt));

    // Punta: sempre in alto a sinistra; in volo segue appena la rotta.
    let dev = lerpAngle(0, motion - AIM, 1);
    dev = THREE.MathUtils.clamp(dev * STEER * flying, -0.4, 0.4);
    const theta = AIM + dev;

    const angleZ = theta - Math.PI / 2 + TIP_OFFSET;
    tmp.qFace.setFromAxisAngle(tmp.axisY, FACE_ROT + (FACE_FLIP ? Math.PI : 0));
    tmp.qPitch.setFromAxisAngle(tmp.axisX, PITCH + press * 0.45);
    tmp.qSpin.setFromAxisAngle(tmp.axisZ, angleZ);
    tmp.qYaw.setFromAxisAngle(tmp.axisY, lean.current);
    tmp.target.copy(tmp.qYaw).multiply(tmp.qSpin).multiply(tmp.qPitch).multiply(tmp.qFace);
    if (!inited.current) g.quaternion.copy(tmp.target);
    else g.quaternion.slerp(tmp.target, 1 - Math.pow(POSE_SMOOTH, dt));

    const baseScale = (mobile ? 0.66 : 1) * MODEL_SCALE;
    const targetScale = baseScale * (1 - press * 0.16) * (1 + flying * 0.06);
    g.scale.setScalar(inited.current ? g.scale.x + (targetScale - g.scale.x) * (1 - Math.pow(0.0004, dt)) : targetScale);
    inited.current = true;
  });

  return (
    <group ref={group} onPointerDown={onPointerDown} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <ModelBoundary fallback={<PlaceholderArrow />}>
        <Suspense fallback={<PlaceholderArrow />}>
          <ArrowModel />
        </Suspense>
      </ModelBoundary>
    </group>
  );
}

function JourneyContent({ meta, metaRef, tipsRef, progressRef, clickRef, onClick, mobile }) {
  const layout = useJourneyLayout(meta, mobile);
  // Gli oggetti nascono dalla punta del cursore sulla loro tappa.
  tipsRef.current = layout.tips.slice(1, -1);
  const masksRef = useRef([]);
  return (
    <JourneyScene progressRef={progressRef} metaRef={metaRef}>
      <PathTrail layout={layout} progressRef={progressRef} masksRef={masksRef} mobile={mobile} />
      <Targets layout={layout} metaRef={metaRef} progressRef={progressRef} clickRef={clickRef} />
      <Cursor layout={layout} progressRef={progressRef} clickRef={clickRef} onClick={onClick} mobile={mobile} />
      <StepAssets
        progressRef={progressRef}
        stepParams={meta.steps.map((s) => s.p)}
        anchorsRef={{ current: meta.steps }}
        tipsRef={tipsRef}
        clickRef={clickRef}
        pressDelay={PRESS_DELAY}
        masksRef={masksRef}
        mobile={mobile}
      />
    </JourneyScene>
  );
}

// Testo con *corsivo* (stessa sintassi dei dizionari / Rich.astro), parola
// per parola dentro una maschera: ogni parola risale in cascata.
function MaskedWords({ text, from = 0 }) {
  let wi = from;
  return String(text)
    .split('*')
    .map((chunk, ci) => {
      const words = chunk.trim().split(/\s+/).filter(Boolean).map((w) => (
        <span className="ajx-word" key={`w${wi}`} style={{ '--wi': wi++ }}>
          <span>{w}</span>
        </span>
      ));
      const spaced = words.flatMap((w, k) => (k ? [' ', w] : [w]));
      return ci % 2 ? <em key={ci}>{spaced}</em> : <span key={ci}>{spaced} </span>;
    });
}

// ---------------------------------------------------------------------------
// Stage: layer pinnato (aura, numerone, canvas, timeline, finale) + flusso
// (apertura, 4 tappe, spazio d'arrivo). Le ancore/checkpoint sono figli del
// root posizionati in JS, così coincidono al pixel con le soste del cursore.
// ---------------------------------------------------------------------------
function JourneyStage({ steps, copy, mobile, webgl }) {
  const root = useRef(null);
  const viz = useRef(null);
  const stepsWrap = useRef(null);
  const hudFill = useRef(null);
  const startBtn = useRef(null);
  const endBtn = useRef(null);
  const detents = useRef([]);
  const progressRef = useRef(0);
  const metaRef = useRef(null);
  const tipsRef = useRef(null);
  const clickRef = useRef({ index: -9, time: 0 });
  const stageRef = useRef(-2);
  const [meta, setMeta] = useState(FALLBACK_META);
  const [inView, setInView] = useState(true);

  const applyStage = (idx) => {
    const el = root.current;
    if (!el || idx === stageRef.current) return;
    stageRef.current = idx;
    el.dataset.stage = String(idx);
    el.dataset.on = idx >= 0 && idx <= 3 ? '1' : '0';
    el.querySelectorAll('[data-i]').forEach((n) => {
      const i = +n.dataset.i;
      n.classList.toggle('is-active', i === idx);
      n.classList.toggle('is-past', i < idx);
    });
  };

  // Click del cursore → il bersaglio DOM (pulsante di partenza, nodo della
  // timeline, numerone, pulsante finale) "sente" la pressione.
  const onClick = (i) => {
    const el = root.current;
    if (!el) return;
    window.setTimeout(() => {
      el.querySelectorAll(`[data-i="${i}"][data-click]`).forEach((n) => {
        n.classList.remove('is-clicked');
        void n.offsetWidth;
        n.classList.add('is-clicked');
      });
    }, PRESS_DELAY * 1000);
  };

  useGSAP(
    () => {
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: viz.current,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = self.progress;
          progressRef.current = p;
          if (hudFill.current) hudFill.current.style.transform = `scaleX(${p})`;
          applyStage(stageAt(p, metaRef.current ?? FALLBACK_META));
        },
      });
      // Misure DOM → meta del viaggio. Rifatte a ogni refresh di ScrollTrigger.
      const measure = () => {
        const rootEl = root.current;
        const wrap = stepsWrap.current;
        if (!rootEl || !wrap) return;
        const vh = window.innerHeight;
        const span = Math.max(rootEl.offsetHeight - vh, 1);
        const stepPs = Array.from(wrap.querySelectorAll('.ajx-step')).map((el) =>
          clamp01((wrap.offsetTop + el.offsetTop + el.offsetHeight / 2 - vh / 2) / span)
        );
        const rootRect = rootEl.getBoundingClientRect();
        const vizRect = viz.current.getBoundingClientRect();
        // Punto cliccato su un pulsante: verso il bordo destro, a metà altezza.
        const hit = (b, oy) => {
          if (!b) return null;
          const r = b.getBoundingClientRect();
          return { x: r.right - vizRect.left - Math.min(28, r.width * 0.2), y: r.top + r.height * 0.6 - oy };
        };
        const next = buildMeta(stepPs, span, vh, hit(startBtn.current, rootRect.top), hit(endBtn.current, vizRect.top));
        // Checkpoint = posizioni di scroll delle soste (partenza, tappe, arrivo).
        [0, ...next.steps.map((s) => s.p), next.pEnd].forEach((p, i) => {
          const a = detents.current[i];
          if (a) a.style.top = `${Math.round(p * span)}px`;
        });
        metaRef.current = next;
        setMeta((prev) =>
          prev.startPx &&
          prev.pEnd === next.pEnd &&
          prev.startPx.x === next.startPx?.x &&
          prev.startPx.y === next.startPx?.y &&
          prev.endPx?.x === next.endPx?.x &&
          prev.endPx?.y === next.endPx?.y &&
          prev.steps.every((s, i) => Math.abs(s.p - next.steps[i].p) < 1e-4)
            ? prev
            : next
        );
        window.dispatchEvent(new Event('apd:detents'));
      };
      measure();
      ScrollTrigger.addEventListener('refresh', measure);
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        window.dispatchEvent(new Event('resize'));
      });
      return () => {
        ScrollTrigger.removeEventListener('refresh', measure);
        st.kill(true);
      };
    },
    // Creato UNA volta: il trigger non dipende dal breakpoint (la misura si
    // rifà a ogni refresh). Ricrearlo al passaggio mobile↔desktop — che sui
    // telefoni avviene sempre subito dopo il mount — lasciava il layer pinnato
    // traslato di tutta la corsa del pin, cioè fuori schermo.
    { scope: root }
  );

  // Entrata persistente di apertura e tappe: fade+rise, poi RESTANO.
  useEffect(() => {
    const wrap = stepsWrap.current;
    if (!wrap || typeof IntersectionObserver === 'undefined') return;
    const items = Array.from(wrap.querySelectorAll('.ajx-step, .ajx-intro'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3, rootMargin: '0px 0px -10% 0px' }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '20% 0px 20% 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const sideOf = (i) => ((ASSET_LAYOUT[i]?.side ?? (i % 2 ? 1 : -1)) < 0 ? 'left' : 'right');
  const detentIds = ['percorso', ...steps.map((_, i) => `percorso-${i + 1}`), 'percorso-fine'];

  return (
    <div className="ajx-root" ref={root} data-stage="-1" data-on="0">
      {detentIds.map((id, i) => (
        <span key={id} id={id} className="ajx-anchor" data-scroll-detent aria-hidden="true" ref={(n) => (detents.current[i] = n)} />
      ))}

      <div className="ajx-viz" ref={viz}>
        <div className="ajx-atmo" aria-hidden="true">
          <span className="ajx-aura ajx-aura--0 is-left" data-i="-1" />
          {steps.map((_, i) => (
            <span key={i} className={`ajx-aura ajx-aura--${i + 1} is-${sideOf(i)}`} data-i={i} />
          ))}
          <span className="ajx-aura ajx-aura--5" data-i="4" />
          {steps.map((_, i) => (
            <span key={i} className={`ajx-bignum is-${sideOf(i)}`} data-i={i} data-click>
              {`0${i + 1}`}
            </span>
          ))}
        </div>
        {webgl && (
          <Canvas
            dpr={mobile ? [1, 1.5] : [1, 2]}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 6.5], fov: 40 }}
            frameloop="never"
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 4, 5]} intensity={1.1} />
            <directionalLight position={[-4, -2, 2]} intensity={0.4} color="#2748A5" />
            <TickerDriver active={inView} />
            <StudioEnv />
            <JourneyContent
              meta={meta}
              metaRef={metaRef}
              tipsRef={tipsRef}
              progressRef={progressRef}
              clickRef={clickRef}
              onClick={onClick}
              mobile={mobile}
            />
          </Canvas>
        )}

        {/* Finale: fermo nel layer pinnato, se ne va con la pagina. */}
        <div className="ajx-outro" data-i="4">
          <span className="works-kicker ajx-outro-kicker">{copy.outro.kicker}</span>
          <p className="ajx-outro-title font-display" data-type-block="" data-tb-static="">
            <MaskedWords text={copy.outro.title} />
          </p>
          <a className="ajx-outro-btn" href={copy.ctaHref} ref={endBtn} data-i="4" data-click>
            {copy.outro.cta}
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <nav className="ajx-hud" aria-label={copy.kicker}>
          <span className="ajx-hud-label">{copy.kicker}</span>
          <div className="ajx-hud-track">
            <span className="ajx-hud-rail" aria-hidden="true">
              <span className="ajx-hud-fill" ref={hudFill} />
            </span>
            <ol className="ajx-hud-nodes">
              {steps.map((s, i) => (
                <li key={i}>
                  <a className="ajx-hud-node" href={`#percorso-${i + 1}`} data-i={i} data-click>
                    <b>{`0${i + 1}`}</b>
                    <span>{s.year}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
      </div>

      <div className="ajx-steps" ref={stepsWrap}>
        {/* Apertura: titolo + pulsante di partenza (lo clicca il cursore) e
            tabellone delle tappe. */}
        <header className="ajx-intro" data-i="-1">
          <div className="ajx-intro-copy">
            <span className="works-kicker ajx-intro-kicker">{copy.kicker}</span>
            <h2 className="ajx-intro-title font-display" data-type-block="" data-tb-static="">
              <MaskedWords text={copy.title} />
            </h2>
            <p className="ajx-intro-lead">{copy.lead}</p>
            <a className="ajx-start" href="#percorso-1" ref={startBtn} data-i="-1" data-click>
              <span className="ajx-start-mouse" aria-hidden="true">
                <i />
              </span>
              {copy.start}
            </a>
          </div>
          <div className="ajx-board">
            <p className="ajx-board-head">
              <span>{copy.stops}</span>
              <span>{`0${steps.length}`}</span>
            </p>
            <ol>
              {steps.map((s, i) => (
                <li key={i} style={{ '--r': i }}>
                  <a className="ajx-board-row" href={`#percorso-${i + 1}`}>
                    <b>{`0${i + 1}`}</b>
                    <span className="ajx-board-year">{s.year}</span>
                    <span className="ajx-board-title">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </header>

        {steps.map((s, i) => (
          <article key={i} className={`ajx-step ajx-step--${sideOf(i) === 'left' ? 'right' : 'left'}`} data-i={i}>
            <span className="ajx-step-meta">
              <b>{`0${i + 1}`}</b>
              <i aria-hidden="true" />
              <span>{s.year}</span>
            </span>
            <h3 className="ajx-step-title font-display">
              <MaskedWords text={s.title} />
            </h3>
            {/* Il gradino: sotto il titolo grande, il tema della tappa in
                corsivo, una taglia sotto (come "Siti web / che convertono."). */}
            <p className="ajx-step-sub font-display">
              <em>{s.kicker}</em>
            </p>
            <p className="ajx-step-text">
              {String(s.text)
                .split(' ')
                .flatMap((w, wi) => {
                  const word = (
                    <span className="ajx-tword" key={`t${wi}`} style={{ '--wi': wi }}>
                      {w}
                    </span>
                  );
                  return wi === 0 ? [word] : [' ', word];
                })}
            </p>
          </article>
        ))}

        {/* Spazio d'arrivo: il cursore vola al finale e lì si posa. */}
        <div className="ajx-outro-space" aria-hidden="true" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry: tappe sempre renderizzate (anche lato server → testo e altezza della
// sezione presenti da subito); il canvas 3D si monta dopo l'idratazione.
// ---------------------------------------------------------------------------
export default function JourneyPath({ steps = [], copy }) {
  const [webgl, setWebgl] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    // Con reduced-motion niente viaggio 3D: restano tappe, aura e timeline.
    // Idem col telefono in orizzontale (~390px d'altezza): oggetto, cursore e
    // testo della tappa non stanno insieme in una schermata così bassa (vedi
    // `shortViewport` in main.ts, stessa media query).
    const short = window.matchMedia('(max-height: 500px) and (orientation: landscape) and (hover: none)').matches;
    setWebgl(hasWebGL() && !short && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // `mobile` reattivo: curva e scala del cursore dipendono dal breakpoint.
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <div className="ajx-holder">
      <JourneyStage steps={steps} copy={copy} mobile={mobile} webgl={webgl} />
    </div>
  );
}

try {
  useGLTF.preload(MODEL_URL);
} catch {
  /* ignore */
}
