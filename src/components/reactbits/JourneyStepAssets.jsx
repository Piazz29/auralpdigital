/* eslint-disable react/no-unknown-property */
'use client';

// JourneyStepAssets — i 4 asset 3D del "Percorso" (Chi siamo), uno per step,
// posizionati nello SPAZIO VUOTO opposto al testo. Vivono dentro la stessa
// scena traslante di JourneyPath (JourneyScene): scorrono in sincrono con gli
// step e vengono frustum-culled quando fuori vista. Un solo canvas, zero
// contesti extra.
//
// ALLINEAMENTO: la Y di ogni asset NON è fissa — arriva da `anchorsRef`
// (misurata sul DOM da JourneyStage): quando il testo dello step è centrato
// nel viewport (p = p_i), l'asset è a world-Y 0, cioè sulla stessa linea
// mediana orizzontale. I valori in ASSETS sono solo fallback pre-misura.
//
// Interazione (composta, mai erratica — filosofia del file: tutto via ref in
// useFrame, zero re-render):
//  - ENTRATA: molla sottosmorzata su scala+fade+rise quando lo step entra
//    nella sua finestra attiva; si inverte scorrendo via, in entrambe le
//    direzioni. Le finestre di step contigui sono DISGIUNTE (handoff ai punti
//    medi tra ancore): in scena c'è sempre UN solo asset per volta.
//  - TILT/PARALLAX mouse (solo pointer fine): rotazione ±~8° + micro-drift di
//    posizione, con damping esponenziale frame-rate-independent.
//  - HOVER: scala 1.04 e tilt leggermente più vivo. Il raycast avviene su una
//    SFERA-PROXY invisibile (8 tris), mai sulle mesh reali (raycast disattivato
//    sui figli) → mousemove a costo costante.

import { useEffect, useMemo, useRef, Suspense, Component } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Config per-asset. `side` = lato dello spazio vuoto (−1 sx, +1 dx), `y` =
// SOLO fallback (la Y reale è misurata dal DOM, vedi sopra). `rot` =
// orientamento base (il logo arriva "sdraiato" da SketchUp → raddrizzato).
// `colors` = ricolorazione per-materiale (chiave = nome materiale glTF).
// `materials` = sostituzione per-materiale con una factory (chiave = nome glTF
// → funzione che ritorna un THREE.Material), per look non riducibili a un tinta
// (es. la lampadina: vetro + filamento emissivo + metalli). Ha priorità su
// `colors`. Senza né `materials` né `colors` i materiali restano quelli del GLB
// (clonati per il fade) → asset "neutro", pronto a uno swap del file.
// ---------------------------------------------------------------------------
const BRAND_BLUE = '#2748A5'; // blu del sito (il glb del logo usa lo stesso)

const ASSETS = [
  { url: '/assets/step1.glb', side: -1, y: 1.76,  z: -0.35, size: 1.7,  rot: [0.06, 0.55, 0] },
  // Computer: FBX Z-up → X −90° lo mette in piedi; yaw dopo (ordine YXZ).
  { url: '/assets/step2.glb', side: 1,  y: 0.26,  z: -0.35, size: 2.35, rot: [-Math.PI / 2, -0.45, 0] },
  // Logo: arriva sdraiato → X +90° lo alza fronte-camera. Colori brand per
  // parte: "Aura" scuro, lettera centrale blu, "Digital" grigio.
  {
    url: '/assets/step3.glb', side: -1, y: -1.24, z: -0.35, size: 2.1,
    rot: [Math.PI / 2, 0.25, 0],
    colors: { Color_A02: '#1A1A1A', Color_B03: BRAND_BLUE, Color_B06: '#A0A0A0' },
  },
  // Lampadina (bulb.glb, swap lug 2026): vetro realistico + filamento emissivo.
  // Chiave '' = bulbo di vetro (l'unica primitiva SENZA materiale nel glb);
  // `Helix` = filamento; gli altri (`Bottom`/`Material #4/#15/#16`) = metalli.
  {
    url: '/assets/step4.glb', side: 1,  y: -2.74, z: -0.35, size: 1.45,
    rot: [0.05, -0.35, 0],
    materials: {
      '': makeGlassMaterial,
      Helix: makeFilamentMaterial,
      Bottom: makeMetalMaterial,
      'Material #4': makeMetalMaterial,
      'Material #15': makeMetalMaterial,
      'Material #16': makeMetalMaterial,
    },
  },
];

// Geometria condivisa con JourneyPath: il cursore deve sapere DOVE sta ogni
// asset (lato, grandezza, X responsiva) per andarci sopra e "cliccarlo".
export const ASSET_LAYOUT = ASSETS.map((a) => ({ side: a.side, size: a.size }));
export const assetY = (anchorY, mobile) => anchorY + (mobile ? mobileLift() : 0);
// Sui telefoni bassi (SE) l'oggetto rimpicciolisce un filo: alzato di più,
// altrimenti finirebbe sotto la navbar.
export const assetScale = (mobile) =>
  mobile ? MOBILE_SCALE * (typeof window !== 'undefined' && window.innerHeight < 620 ? 0.86 : 1) : 1;
export function assetX(side, halfW, mobile, size = 0) {
  // Su mobile l'oggetto non deve uscire dal bordo (il logo è largo).
  if (mobile) return side * Math.max(0, Math.min(MOBILE_X, halfW - (size * MOBILE_SCALE) / 2 - 0.06));
  return side * THREE.MathUtils.clamp(halfW * 0.52, 1.35, 2.3);
}

// --- Tuning interazione ----------------------------------------------------
const TILT_X = 0.1;   // rad: beccheggio dal mouse Y (~6°)
const TILT_Y = 0.16;  // rad: imbardata dal mouse X (~9°)
const PARALLAX = 0.07; // unità mondo di micro-drift posizionale
const HOVER_SCALE = 1.04;
const HOVER_TILT_BOOST = 1.5;
const DRIFT_GAIN = 0.5; // rotazione Y legata allo scroll attorno al param

// --- Entrata a molla ---------------------------------------------------------
// Molla sottosmorzata: ζ=0.72 dà ~4% di overshoot — un accenno di bounce,
// composto (back.out "addolcito"); ω=8 rad/s assesta in ~0.7s. Semi-implicit
// Euler con dt cappato a 1/30 → stabile anche su frame lunghi.
// Finestra ASIMMETRICA attorno a p_i: si entra un po' prima del centraggio
// (ENTER_SPAN) e si esce più tardi (EXIT_SPAN), quando il testo è ormai
// passato. START_MIN impedisce che il primo step sia già attivo a p=0: anche
// i libri compaiono avvicinandosi, con la stessa logica degli altri.
//
// ESCLUSIVITÀ (un solo asset in scena per volta): le finestre di due step
// contigui sono rese DISGIUNTE per costruzione — il confine tra N e N+1 è il
// punto medio tra le loro ancore, ritirato di HANDOFF_GAP per lato. Con le
// ancore misurate dal DOM (gap ≈ 0.263 di progress ≈ 80vh) la zona morta vale
// 2·HANDOFF_GAP ≈ 24vh di scroll: l'asset N ha il tempo di uscire del tutto
// prima che N+1 cominci a entrare. L'uscita usa una molla più rapida e
// CRITICAMENTE smorzata (EXIT_OMEGA/EXIT_ZETA): niente rimbalzo in uscita e
// sparizione completa (<2%) in ~0.5s, entro la zona morta a scroll normale.
const ENTER_SPAN = 0.12;
const EXIT_SPAN = 0.2;
const START_MIN = 0.015;
const HANDOFF_GAP = 0.04;
const SPRING_OMEGA = 8;
const SPRING_ZETA = 0.72;
const EXIT_OMEGA = 12;
const EXIT_ZETA = 1;
const ENTRANCE_RISE = 0.24; // l'asset "sale" di tanto durante l'entrata
const ENTRANCE_TWIST = 0.9; // rad: l'asset nasce ruotato e si raddrizza

// Fattori mobile: più piccoli, sopra il testo (che è centrato full-width).
const MOBILE_SCALE = 0.56;
const MOBILE_X = 0; // mobile: oggetto centrato sopra il testo
const MOBILE_Y_LIFT = 1.3; // alzata a 390×664 (iPhone con barre di Safari)
// In unità di scena l'alzata vale più o meno pixel a seconda dell'altezza del
// viewport (la camera inquadra sempre la stessa altezza di mondo), mentre il
// testo della tappa è in px: su un telefono basso l'oggetto ricadeva sul
// titolo. Si scala per tenere costante lo stacco in px (sui telefoni bassi il
// testo, in CSS, scende anche verso la HUD).
function mobileLift() {
  if (typeof window === 'undefined') return MOBILE_Y_LIFT;
  const k = THREE.MathUtils.clamp(664 / window.innerHeight, 0.85, 1.6);
  return MOBILE_Y_LIFT * k;
}

// Stesso look del cursore (JourneyPath.makeGlossyMaterial), ma col colore
// parametrico: valori duplicati consapevolmente per evitare import circolare.
function makeGlossyMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    metalness: 0.15,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.25,
    sheen: 0.3,
    sheenColor: new THREE.Color('#A9B6CE'),
  });
}

// --- Materiali della lampadina (step4) --------------------------------------
// QUIRK IMPORTANTE: il `transmission` del MeshPhysicalMaterial NON è usabile
// qui — il canvas è `alpha:true` e dietro al bulbo non c'è nulla in scena, così
// il transmission campiona il vuoto e vira a un bianco lattiginoso che nasconde
// il filamento. Soluzione: vetro trasparente "classico" (opacity bassa +
// clearcoat) con `depthWrite:false`, così il filamento — disegnato nel pass
// opaco — resta visibile attraverso il bulbo.
function makeGlassMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#EDF0F5'),
    metalness: 0,
    roughness: 0.05,
    transmission: 0,
    transparent: true,
    opacity: 0.26,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.4,
    depthWrite: false, // il filamento opaco si vede attraverso il vetro
  });
}

// Filamento: emissivo caldo e `toneMapped:false` così "buca" e sembra acceso.
// A grandezza-pagina il bulbo è piccolo → intensità alta (3.6).
function makeFilamentMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2a1403'),
    emissive: new THREE.Color('#FF6A1F'),
    emissiveIntensity: 3.6,
    roughness: 0.5,
    metalness: 0,
    toneMapped: false,
  });
}

// Attacco/contatti/isolante: metallo neutro leggermente freddo.
function makeMetalMaterial() {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#9EA1A6'),
    metalness: 0.9,
    roughness: 0.34,
    envMapIntensity: 1.2,
  });
}

// Boundary silenzioso: se un GLB manca o fallisce, lo spazio resta pulito.
class AssetBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const noRaycast = () => null;

// ---------------------------------------------------------------------------
// Singolo asset: carica (cache drei condivisa), normalizza (rotazione base →
// centering → auto-scala, come ArrowModel), poi anima tutto in useFrame.
// ---------------------------------------------------------------------------
// Compila gli shader e carica le texture di `object` PRIMA che compaia:
// altrimenti lo fa il primo frame in cui è visibile, cioè a metà scroll → scatto.
// compileAsync usa KHR_parallel_shader_compile dove c'è (niente blocco del
// thread principale); `scene` serve per luci ed environment, che fanno parte
// della chiave del programma.
export function prewarm(gl, object, camera, scene) {
  const wasVisible = object.visible;
  object.visible = true;
  object.traverse((o) => {
    for (const m of o.material ? [].concat(o.material) : []) {
      for (const v of Object.values(m)) if (v?.isTexture) gl.initTexture(v);
    }
  });
  if (gl.compileAsync) gl.compileAsync(object, camera, scene).catch(() => {});
  else gl.compile(object, camera, scene);
  object.visible = wasVisible;
}

function StepAsset({ cfg, index, params, progressRef, anchorsRef, tipsRef, clickRef, pressDelay = 0, mouseRef, masksRef, mobile }) {
  const group = useRef();
  const hover = useRef(0); // 0..1, smorzato
  const hovering = useRef(false);
  const spring = useRef({ e: 0, v: 0 }); // entrata: valore + velocità
  const fadeApplied = useRef(-1);
  const { scene } = useGLTF(cfg.url);
  const { camera } = useThree();

  const { prepared, fadeMats, hitRadius } = useMemo(() => {
    const s = scene.clone(true);
    // Tutti i materiali diventano NOSTRI (ricolorati o clonati): il fade di
    // entrata muta opacity/transparent e non deve toccare la cache GLTF.
    const byName = new Map(); // nome materiale → materiale sostituito
    const fadeMats = [];
    const own = (mat) => {
      fadeMats.push({
        mat,
        baseOpacity: mat.opacity,
        baseTransparent: mat.transparent,
      });
      return mat;
    };
    s.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        o.raycast = noRaycast; // il raycast lo fa la sfera-proxy
        const name = o.material?.name ?? '';
        if (!byName.has(name + (o.geometry.attributes.normal ? '' : '|flat'))) {
          const factory = cfg.materials?.[name];
          const hex = cfg.colors?.[name];
          // `materials` (factory → THREE.Material) ha priorità su `colors`
          // (ricolorazione) e sul clone del materiale originale del GLB.
          const m = factory ? factory() : hex ? makeGlossyMaterial(hex) : o.material.clone();
          // Mesh senza normali (es. logo estruso da SketchUp) → flat shading,
          // come farebbe GLTFLoader coi materiali originali.
          if (!o.geometry.attributes.normal) m.flatShading = true;
          byName.set(name + (o.geometry.attributes.normal ? '' : '|flat'), own(m));
        }
        o.material = byName.get(
          name + (o.geometry.attributes.normal ? '' : '|flat')
        );
      }
    });
    // Orientamento base PRIMA della misura: il bbox riflette la posa finale.
    // Ordine YXZ: lo yaw estetico compone DOPO il raddrizzamento sull'asse X
    // (i modelli Z-up/sdraiati vengono prima messi in piedi, poi angolati).
    s.rotation.order = 'YXZ';
    s.rotation.set(...cfg.rot);
    const wrap = new THREE.Group();
    wrap.add(s);
    const box = new THREE.Box3().setFromObject(wrap);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const k = cfg.size / maxDim;
    wrap.scale.setScalar(k);
    // `position` vive nello spazio del wrap → basta sottrarre il centro del
    // bbox (misurato a scala 1), qualunque sia la rotazione del modello.
    s.position.sub(center);
    const hitRadius =
      (Math.hypot(size.x, size.y, size.z) / 2) * k * 0.72;
    return { prepared: wrap, fadeMats, hitRadius };
  }, [scene, cfg]);

  // L'asset resta invisibile fino alla sua tappa: shader e texture si preparano
  // subito, in entrambe le varianti del materiale (trasparente durante il fade,
  // opaca a regime).
  const gl = useThree((s) => s.gl);
  const rootScene = useThree((s) => s.scene);
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    for (const rec of fadeMats) rec.mat.transparent = true;
    prewarm(gl, g, camera, rootScene);
    for (const rec of fadeMats) rec.mat.transparent = rec.baseTransparent;
    prewarm(gl, g, camera, rootScene);
  }, [gl, camera, rootScene, fadeMats]);

  // I materiali sono nostri (non della cache GLTF) → vanno rilasciati.
  // (Le texture restano della cache: material.dispose() non le tocca.)
  useEffect(() => {
    return () => {
      for (const rec of fadeMats) rec.mat.dispose();
    };
  }, [fadeMats]);

  // X responsiva: centro dello spazio vuoto, in funzione della larghezza mondo
  // visibile (camera fissa a z=6.5 → si ricalcola solo al resize del canvas).
  const baseX = useThree((state) => {
    const worldH =
      2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    const halfW = (worldH * state.size.width) / state.size.height / 2;
    return assetX(cfg.side, halfW, mobile, cfg.size);
  });
  const baseScale = assetScale(mobile);
  const hoverScale = useRef(baseScale);

  // La rotta tratteggiata si spegne attorno alla sagoma di questo oggetto.
  useEffect(() => {
    if (!masksRef) return;
    masksRef.current[index] = { group: group.current, size: cfg.size };
    return () => {
      masksRef.current[index] = null;
    };
  }, [masksRef, index, cfg.size]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const p = THREE.MathUtils.clamp(progressRef.current ?? 0, 0, 1);

    // Ancoraggio misurato dal DOM (JourneyStage): p_i = progress al quale il
    // testo dello step è centrato nel viewport; y_i = Y locale che mette
    // l'asset a world-Y 0 in quello stesso istante. Fallback: valori statici.
    const anchors = anchorsRef?.current;
    const par = anchors?.[index]?.p ?? params[index];
    const baseY = assetY(anchors?.[index]?.y ?? cfg.y, mobile);

    // Finestra attiva DISGIUNTA dai vicini: il confine con lo step precedente/
    // successivo è il punto medio tra le ancore meno HANDOFF_GAP → mai due
    // asset con target=1 nello stesso istante (vedi nota in testa al file).
    const pPrev = index > 0 ? (anchors?.[index - 1]?.p ?? params[index - 1]) : null;
    const pNext =
      index < params.length - 1
        ? (anchors?.[index + 1]?.p ?? params[index + 1])
        : null;
    // Se JourneyStage ha già calcolato le finestre (allineate al CLICK del
    // cursore), comandano quelle; altrimenti la logica storica a punti medi.
    let enterAt = anchors?.[index]?.enterAt;
    let exitAt = anchors?.[index]?.exitAt;
    if (enterAt == null || exitAt == null) {
      enterAt = Math.max(par - ENTER_SPAN, START_MIN);
      if (pPrev != null) enterAt = Math.max(enterAt, (pPrev + par) / 2 + HANDOFF_GAP);
      exitAt = par + EXIT_SPAN;
      if (pNext != null) exitAt = Math.min(exitAt, (par + pNext) / 2 - HANDOFF_GAP);
    }

    // Entrata a molla: target 1 quando lo step è nella finestra attiva, 0
    // fuori → l'uscita è la stessa animazione al contrario, scroll-reversibile
    // ma con parametri più rapidi e senza overshoot (handoff pulito).
    // Se il cursore ha appena cliccato QUESTA tappa, l'oggetto aspetta la
    // pressione del click per nascere (prima si vede il cursore premere).
    const click = clickRef?.current;
    const waiting = click && click.index === index && state.clock.elapsedTime - click.time < pressDelay + 0.04;
    const active = p > enterAt && p < exitAt && !waiting;
    const target = active ? 1 : 0;
    const w = target ? SPRING_OMEGA : EXIT_OMEGA;
    const z = target ? SPRING_ZETA : EXIT_ZETA;
    const dt = Math.min(delta, 1 / 30);
    const sp = spring.current;
    sp.v += (-2 * z * w * sp.v - w * w * (sp.e - target)) * dt;
    sp.e += sp.v * dt;
    const eC = THREE.MathUtils.clamp(sp.e, 0, 1); // per fade e rise
    const eS = Math.max(sp.e, 0.0001); // per la scala (overshoot = bounce)

    // Fade: opacity sui materiali SOLO finché cambia; `transparent` attivo
    // solo durante la transizione (a regime niente sorting alpha).
    const q = eC > 0.995 ? 1 : eC < 0.005 ? 0 : eC;
    if (q !== fadeApplied.current) {
      for (const rec of fadeMats) {
        rec.mat.opacity = rec.baseOpacity * q;
        rec.mat.transparent = q < 1 ? true : rec.baseTransparent;
      }
      fadeApplied.current = q;
    }

    // Hover smorzato (frame-rate independent).
    const kHover = 1 - Math.pow(0.002, delta);
    hover.current += ((hovering.current ? 1 : 0) - hover.current) * kHover;

    const m = mouseRef.current;
    const boost = 1 + hover.current * (HOVER_TILT_BOOST - 1);

    // Target di posa: tilt dal mouse + drift di rotazione legato allo scroll.
    const tRotX = m.y * TILT_X * boost;
    const tRotY =
      m.x * TILT_Y * boost + (p - par) * DRIFT_GAIN - (1 - eC) * ENTRANCE_TWIST * cfg.side;
    // NASCITA DAL CLICK: a molla scarica l'asset sta sulla punta del cursore
    // (tipsRef, dove avviene il click) e si espande fino al suo posto.
    const tip = tipsRef?.current?.[index];
    const grow = eC * eC * (3 - 2 * eC);
    const fromX = tip ? tip.x : baseX;
    const fromY = tip ? tip.y : baseY - ENTRANCE_RISE;
    const tX = fromX + (baseX - fromX) * grow + m.x * PARALLAX * boost;
    const tY = fromY + (baseY - fromY) * grow + m.y * PARALLAX * 0.6;

    const k = 1 - Math.pow(0.005, delta); // damping morbido comune
    g.rotation.x += (tRotX - g.rotation.x) * k;
    g.rotation.y += (tRotY - g.rotation.y) * k;
    g.position.x += (tX - g.position.x) * k;
    g.position.y += (tY - g.position.y) * k;

    // Scala = base smorzata (hover) × molla di entrata (col suo overshoot).
    const tBase = baseScale * (1 + hover.current * (HOVER_SCALE - 1));
    hoverScale.current += (tBase - hoverScale.current) * k;
    g.scale.setScalar(Math.max(hoverScale.current * eS, 0.0001));
    // Molla a riposo sullo 0 → si salta anche il draw.
    g.visible = sp.e > 0.005 || target === 1;
  });

  return (
    <group
      ref={group}
      position={[baseX, cfg.y, cfg.z]}
      scale={0.0001}
      visible={false}
      onPointerOver={mobile ? undefined : () => (hovering.current = true)}
      onPointerOut={mobile ? undefined : () => (hovering.current = false)}
    >
      <primitive object={prepared} />
      {/* Sfera-proxy per il raycast dell'hover: invisibile, 8 segmenti. */}
      {!mobile && (
        <mesh visible={false}>
          <sphereGeometry args={[hitRadius, 8, 8]} />
        </mesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Wrapper: UN solo listener pointermove (solo pointer fine) condiviso dai 4
// asset; ogni asset è isolato da Suspense + boundary (un GLB rotto non
// compromette gli altri né il cursore).
// ---------------------------------------------------------------------------
export default function StepAssets({ progressRef, stepParams, anchorsRef, tipsRef, clickRef, pressDelay, masksRef, mobile }) {
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (mobile || !window.matchMedia('(pointer: fine)').matches) return;
    const onMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [mobile]);

  return (
    <group>
      {ASSETS.map((cfg, i) => (
        <AssetBoundary key={cfg.url}>
          <Suspense fallback={null}>
            <StepAsset
              cfg={cfg}
              index={i}
              params={stepParams}
              progressRef={progressRef}
              anchorsRef={anchorsRef}
              tipsRef={tipsRef}
              clickRef={clickRef}
              pressDelay={pressDelay}
              masksRef={masksRef}
              mouseRef={mouseRef}
              mobile={mobile}
            />
          </Suspense>
        </AssetBoundary>
      ))}
    </group>
  );
}

// Precarica i 4 GLB (cache condivisa con useGLTF).
for (const a of ASSETS) {
  try {
    useGLTF.preload(a.url);
  } catch {
    /* ignore */
  }
}
