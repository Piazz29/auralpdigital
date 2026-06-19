/* eslint-disable react/no-unknown-property */
'use client';

// JourneyPath — "Il percorso / Da studente a studio" (pagina Chi siamo).
// Scrollytelling VERTICALE (niente pin): la sezione si scrolla normalmente, i 4
// step vivono distribuiti lungo l'altezza (alternati destra/sinistra) e RESTANO
// visibili dopo una leggera entrata. Un canvas 3D STICKY resta in viewport mentre
// la sezione scorre; dentro, un cursore blu (cursor_arrow.glb) — un piccolo
// "aeroplanino" — viaggia lungo una curva lunga e verticale guidato dallo scroll.
//
// Principio del movimento: TUTTO è guidato dallo scroll (progressRef, mutato in
// onUpdate di ScrollTrigger → zero re-render). Nessuna animazione a tempo → da
// fermo il cursore è fermo, niente loop, niente spin/piroette. La scena (curva +
// linea + cursore) trasla in Y in sincrono con lo scroll così il percorso scorre
// nel viewport e appare lungo. Il cursore si orienta in 3D (banking + yaw + pitch)
// in base alla direzione di moto e si può anche trascinare col mouse: al rilascio
// torna alla posizione di scroll.
//
// Si attiva solo con WebGL e senza reduced-motion; altrimenti resta la timeline
// statica di fallback (AboutPage).

import { useEffect, useMemo, useRef, useState, Suspense, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer } from '@react-three/drei';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// COSTANTI DI CALIBRAZIONE — tarabili a occhio dopo il primo render reale.
// ---------------------------------------------------------------------------
const MODEL_URL = '/models/cursor_arrow.glb';

// --- Normalizzazione modello ---------------------------------------------
const TARGET_SIZE = 1.4; // dimensione max (unità scena) dopo auto-scala
const MODEL_SCALE = 1; // moltiplicatore fine

// --- Orientamento base (faccia verso camera) -----------------------------
const FACE_ROT = -Math.PI / 2; // porta la faccia piatta verso la camera
const TIP_OFFSET = 0; // correzione rotazione punta (rad) — da tarare a occhio
const FACE_FLIP = false; // true se la freccia appare specchiata/di spalle

// --- Volo "aeroplanino": più assi 3D, mai piatto, mai troppo -------------
const PITCH = 0.16; // inclinazione 3D fissa (rad ≈ 9°): dà volume
const BANK_MAX = 0.5; // roll massimo in curva (rad ≈ 29°)
const BANK_GAIN = 4.8; // quanto la variazione di direzione genera roll (più calmo)
const BANK_SMOOTH = 0.08; // smoothing del roll (0..1) — più morbido, meno nervoso
const YAW_MAX = 0.5; // imbardata massima (rad ≈ 29°): mostra il fianco 3D
const YAW_GAIN = 1.6; // quanto la direzione orizzontale genera yaw
const YAW_SMOOTH = 0.09; // smoothing dello yaw
const STEP_PULSE = 0.05; // +scala sobria all'arrivo su uno step

// --- Materiale blu glossy ------------------------------------------------
const MAT_COLOR = '#3b5bdb';
const MAT_ROUGHNESS = 0.12;
const MAT_METALNESS = 0.15;
const MAT_CLEARCOAT = 1.0;
const MAT_CLEARCOAT_ROUGHNESS = 0.18;
const MAT_ENV_INTENSITY = 1.25;

// --- Scena che scorre col page-scroll ------------------------------------
// La curva è alta (Y da +A a −A). La scena trasla in Y di SCENE_BASE +
// progress*SCENE_TRAVEL così il percorso scorre nel viewport e il cursore resta
// in una fascia centrale (con lieve discesa). Calibrati su camera z=6.5/fov40
// (altezza mondo visibile ≈ 4.73). SCENE_BASE ≈ −(Y top) per centrare a inizio.
const SCENE_BASE = -2.7;
const SCENE_TRAVEL = 5.7;

// --- Interazione: trascinamento del cursore ------------------------------
const DRAG_RADIUS = 1.5; // spostamento massimo dal percorso (unità mondo)
const DRAG_RETURN = 0.07; // velocità di ritorno alla posizione di scroll (0..1)

// Stazioni del percorso (x: sx/dx, y: alto→basso MONOTONA, z: lieve profondità
// per far vedere la tridimensionalità). Vincolo: ogni PIEGA deve avere ampiezza
// (angolo interno del vertice, sul piano X/Y che è quello visto a schermo) NON
// inferiore a 65° → niente svolte strette/nervose. Le escursioni laterali sono
// state ridotte rispetto alla versione precedente perché due inversioni profonde
// (Step 2 e Step 3) scendevano a ~54°/56°. Angoli interni attuali ai vertici:
// ≈113° / 70° / 73° / 91° — minimo ~70°, con margine sopra la soglia di 65°.
// La PARTENZA è alta (y 4.05) ma interamente visibile sotto la navbar fissa: per
// alzarla ancora aumentare `[0][1]` (accettando un possibile overlap navbar).
const STATIONS_DESKTOP = [
  [1.1, 4.05, 0.15], // partenza: alto-destra, accanto al titolo
  [1.35, 2.2, -0.25], // Step 1 (destra)
  [-0.95, 0.85, 0.3], // Step 2 (sinistra) — escursione ridotta (vertice ≈70°)
  [0.95, -0.7, -0.3], // Step 3 (destra) — escursione ridotta (vertice ≈73°)
  [-1.15, -2.1, 0.22], // Step 4 (sinistra)
  [-0.2, -3.6, 0.0], // uscita: basso, quasi al centro
];
const STATIONS_MOBILE = [
  [0.72, 4.05, 0.1],
  [0.9, 2.2, -0.2],
  [-0.63, 0.85, 0.25],
  [0.63, -0.7, -0.24],
  [-0.76, -2.1, 0.18],
  [-0.13, -3.6, 0.0],
];

// Parametri (progress 0→1) ai quali il cursore "arriva" vicino a ogni step → vi
// scatta la micro-pulsazione di scala. Allineati ai punti in cui ogni .ajx-step si
// centra nel viewport, dati il runway/coda di .ajx-steps (≈16/43/69/95%).
const STEP_PARAMS = [0.16, 0.43, 0.69, 0.95];

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    sheenColor: new THREE.Color('#9db4ff'),
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
          color="#1a2340"
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
        color="#9db4ff"
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
// Linea di percorso: guida tenue (full) + tratto "percorso" più acceso che
// cresce con lo scroll. Vive dentro la scena che scorre.
// ---------------------------------------------------------------------------
const LINE_SAMPLES = 200;

function PathLine({ curve, progressRef }) {
  const { fullObj, growObj, growGeometry, vertexCount } = useMemo(() => {
    // getSpacedPoints = equidistanti per lunghezza d'arco, come getPointAt(p) del
    // cursore → il drawRange e la punta del cursore restano allineati esattamente.
    const pts = curve.getSpacedPoints(LINE_SAMPLES);
    const positions = new Float32Array(pts.length * 3);
    pts.forEach((pt, i) => {
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = pt.z;
    });

    const fullGeometry = new THREE.BufferGeometry();
    fullGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const growGeometry = new THREE.BufferGeometry();
    growGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions.slice(), 3)
    );
    growGeometry.setDrawRange(0, 2);

    const fullObj = new THREE.Line(
      fullGeometry,
      new THREE.LineBasicMaterial({
        color: '#3b5bdb',
        transparent: true,
        opacity: 0.13,
      })
    );
    const growObj = new THREE.Line(
      growGeometry,
      new THREE.LineBasicMaterial({
        color: '#3b5bdb',
        transparent: true,
        opacity: 0.62,
      })
    );
    return { fullObj, growObj, growGeometry, vertexCount: pts.length };
  }, [curve]);

  useFrame(() => {
    const p = THREE.MathUtils.clamp(progressRef.current ?? 0, 0, 1);
    const count = Math.max(2, Math.floor(p * vertexCount));
    growGeometry.setDrawRange(0, count);
  });

  return (
    <group>
      <primitive object={fullObj} />
      <primitive object={growObj} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scena che scorre: trasla curva+linea+cursore in Y in sincrono col progress,
// così il percorso (alto) scorre nel viewport e appare lungo e verticale.
// ---------------------------------------------------------------------------
function JourneyScene({ progressRef, children }) {
  const g = useRef();
  useFrame(() => {
    if (!g.current) return;
    const p = THREE.MathUtils.clamp(progressRef.current ?? 0, 0, 1);
    g.current.position.y = SCENE_BASE + p * SCENE_TRAVEL;
  });
  return <group ref={g}>{children}</group>;
}

// ---------------------------------------------------------------------------
// Cursore: posizione lungo la curva pilotata da progressRef; orientamento 3D
// (banking + yaw + pitch) in base alla direzione di moto; trascinabile col mouse
// con ritorno morbido. Tutto in useFrame via ref → zero re-render.
// ---------------------------------------------------------------------------
function Cursor({ curve, progressRef, mobile }) {
  const group = useRef();
  const bank = useRef(0);
  const yaw = useRef(0);
  const prevTheta = useRef(0);
  const inited = useRef(false);
  const { camera, size, gl } = useThree();

  // Stato del drag (in ref → niente re-render).
  const drag = useRef({
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
    offX: 0,
    offY: 0,
  });

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
    }),
    []
  );

  // Mondo visibile per pixel (per convertire il drag schermo→mondo).
  const worldPerPx = useMemo(() => {
    const h = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    return h / size.height;
  }, [camera, size.height]);

  // --- Drag: pointer down sul cursore, move/up sulla finestra ---------------
  useEffect(() => {
    const onMove = (e) => {
      const d = drag.current;
      if (!d.active) return;
      const dxPx = e.clientX - d.startX;
      const dyPx = e.clientY - d.startY;
      let ox = d.baseX + dxPx * worldPerPx;
      let oy = d.baseY - dyPx * worldPerPx; // schermo giù → mondo su
      const len = Math.hypot(ox, oy);
      if (len > DRAG_RADIUS) {
        const k = DRAG_RADIUS / len;
        ox *= k;
        oy *= k;
      }
      d.offX = ox;
      d.offY = oy;
    };
    const onUp = () => {
      drag.current.active = false;
      gl.domElement.style.cursor = 'grab';
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

  useFrame((_, delta) => {
    const g = group.current;
    if (!g || !curve) return;
    const p = THREE.MathUtils.clamp(progressRef.current ?? 0, 0, 1);

    curve.getPointAt(p, tmp.pos);

    // Direzione di moto proiettata su (x,y) per orientare la punta.
    const eps = 0.004;
    if (p > 1 - eps) {
      curve.getPointAt(p - eps, tmp.posB);
      var dx = tmp.pos.x - tmp.posB.x;
      var dy = tmp.pos.y - tmp.posB.y;
    } else {
      curve.getPointAt(Math.min(p + eps, 1), tmp.posB);
      dx = tmp.posB.x - tmp.pos.x;
      dy = tmp.posB.y - tmp.pos.y;
    }
    const theta = Math.atan2(dy, dx);

    // Drag: quando non si trascina, l'offset decade verso 0 (ritorno morbido).
    const d = drag.current;
    if (!d.active) {
      d.offX += (0 - d.offX) * DRAG_RETURN;
      d.offY += (0 - d.offY) * DRAG_RETURN;
    }
    tmp.pos.x += d.offX;
    tmp.pos.y += d.offY;

    if (!inited.current) {
      g.position.copy(tmp.pos);
      prevTheta.current = theta;
      inited.current = true;
    } else {
      const lerp = d.active ? 1 - Math.pow(0.0001, delta) : 1 - Math.pow(0.0015, delta);
      g.position.lerp(tmp.pos, lerp);
    }

    // Banking (roll): proporzionale alla variazione orizzontale di direzione.
    let dTheta = theta - prevTheta.current;
    while (dTheta > Math.PI) dTheta -= Math.PI * 2;
    while (dTheta < -Math.PI) dTheta += Math.PI * 2;
    prevTheta.current = theta;
    const targetBank = THREE.MathUtils.clamp(
      -dTheta * BANK_GAIN * (mobile ? 0.6 : 1),
      -BANK_MAX,
      BANK_MAX
    );
    bank.current += (targetBank - bank.current) * BANK_SMOOTH;

    // Yaw (imbardata): in base alla componente orizzontale del moto → mostra il
    // fianco del modello quando curva a dx/sx (più assi 3D, mai piatto).
    const horiz = Math.cos(theta); // +1 verso destra, −1 verso sinistra
    const targetYaw = THREE.MathUtils.clamp(
      horiz * YAW_GAIN * (mobile ? 0.7 : 1),
      -YAW_MAX,
      YAW_MAX
    );
    yaw.current += (targetYaw - yaw.current) * YAW_SMOOTH;

    // Composizione: faccia→pitch→roll(spin), poi yaw attorno all'asse verticale.
    const angleZ = theta - Math.PI / 2 + TIP_OFFSET;
    tmp.qFace.setFromAxisAngle(tmp.axisY, FACE_ROT + (FACE_FLIP ? Math.PI : 0));
    tmp.qPitch.setFromAxisAngle(tmp.axisX, PITCH);
    tmp.qSpin.setFromAxisAngle(tmp.axisZ, angleZ + bank.current);
    tmp.qYaw.setFromAxisAngle(tmp.axisY, yaw.current);
    tmp.target
      .copy(tmp.qYaw)
      .multiply(tmp.qSpin)
      .multiply(tmp.qPitch)
      .multiply(tmp.qFace);

    if (!inited.current) {
      g.quaternion.copy(tmp.target);
    } else {
      const slerp = 1 - Math.pow(0.0009, delta);
      g.quaternion.slerp(tmp.target, slerp);
    }

    // Micro-pulsazione di scala all'arrivo su uno step (dal progress, non a tempo).
    let pulse = 0;
    for (let i = 0; i < STEP_PARAMS.length; i++) {
      const dP = Math.abs(p - STEP_PARAMS[i]);
      if (dP < 0.09) {
        const u = 1 - dP / 0.09;
        pulse = Math.max(pulse, STEP_PULSE * (u * u * (3 - 2 * u)));
      }
    }
    const baseScale = (mobile ? 0.82 : 1) * MODEL_SCALE;
    const targetScale = baseScale * (1 + pulse);
    const sLerp = inited.current ? 1 - Math.pow(0.02, delta) : 1;
    const cur = g.scale.x + (targetScale - g.scale.x) * sLerp;
    g.scale.setScalar(cur);
  });

  return (
    <group
      ref={group}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <ModelBoundary fallback={<PlaceholderArrow />}>
        <Suspense fallback={<PlaceholderArrow />}>
          <ArrowModel />
        </Suspense>
      </ModelBoundary>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Stage: canvas sticky + step nel flusso + ScrollTrigger scrub (niente pin).
// ---------------------------------------------------------------------------
function JourneyStage({ steps, mobile }) {
  const root = useRef(null);
  const viz = useRef(null);
  const stepsWrap = useRef(null);
  const progressRef = useRef(0);
  const [inView, setInView] = useState(true);

  const curve = useMemo(() => {
    const pts = (mobile ? STATIONS_MOBILE : STATIONS_DESKTOP).map(
      (p) => new THREE.Vector3(...p)
    );
    // 'centripetal' = la variante più naturale di Catmull-Rom: niente overshoot
    // né cuspidi anche con spaziatura irregolare → curve morbide ed eleganti.
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  }, [mobile]);

  // ScrollTrigger: la pagina scorre NORMALMENTE; viene "agganciato" (pin) solo il
  // canvas di sfondo, così resta al centro del viewport mentre gli step scorrono
  // sopra. NB: non si usa `position: sticky` perché il <body> ha overflow-x:hidden
  // (scroll-container) che lo neutralizza — il pin GSAP è immune. `pinSpacing:false`
  // perché la viz è `position:absolute` (overlay) e non occupa il flusso.
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
          progressRef.current = self.progress;
        },
      });
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        window.dispatchEvent(new Event('resize'));
      });
      return () => st.kill();
    },
    { scope: root, dependencies: [mobile] }
  );

  // Entrata persistente degli step: fade+rise quando entrano, poi RESTANO.
  useEffect(() => {
    const wrap = stepsWrap.current;
    if (!wrap || typeof IntersectionObserver === 'undefined') return;
    const items = Array.from(wrap.querySelectorAll('.ajx-step'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target); // una volta dentro, resta
          }
        });
      },
      { threshold: 0.35, rootMargin: '0px 0px -10% 0px' }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [steps.length]);

  // Pausa/ripresa del render in base alla visibilità.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '20% 0px 20% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="ajx-root" ref={root}>
      <div className="ajx-viz" ref={viz}>
        <Canvas
          dpr={mobile ? [1, 1.5] : [1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 0, 6.5], fov: 40 }}
          frameloop={inView ? 'always' : 'never'}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 4, 5]} intensity={1.1} />
          <directionalLight position={[-4, -2, 2]} intensity={0.4} color="#3b5bdb" />
          <StudioEnv />
          <JourneyScene progressRef={progressRef}>
            <PathLine curve={curve} progressRef={progressRef} />
            <Cursor curve={curve} progressRef={progressRef} mobile={mobile} />
          </JourneyScene>
        </Canvas>
      </div>

      <div className="ajx-steps" ref={stepsWrap}>
        {steps.map((s, i) => (
          <article
            key={i}
            className={`ajx-step ajx-step--${i % 2 === 0 ? 'right' : 'left'}`}
          >
            <span className="ajx-step-index">{`0${i + 1}`}</span>
            <span className="ajx-step-year">{s.year}</span>
            <span className="ajx-step-kicker">{s.kicker}</span>
            <h3 className="ajx-step-title font-display">
              {String(s.title)
                .split(' ')
                .flatMap((w, wi) => {
                  const word = (
                    <span className="ajx-word" key={`w${wi}`} style={{ '--wi': wi }}>
                      <span>{w}</span>
                    </span>
                  );
                  // spazio reale (text node) TRA le parole → la riga può andare a
                  // capo solo tra una parola e l'altra, mai dentro una parola.
                  return wi === 0 ? [word] : [' ', word];
                })}
            </h3>
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
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry: decide se attivare l'esperienza 3D. Se non idoneo (no WebGL o
// reduced-motion) resta la timeline statica (fallback in AboutPage).
// ---------------------------------------------------------------------------
export default function JourneyPath({ steps = [] }) {
  const [mode, setMode] = useState('idle'); // idle | on | off
  const [mobile, setMobile] = useState(false);
  const holder = useRef(null);

  useEffect(() => {
    const eligible = hasWebGL() && !prefersReduced();
    setMode(eligible ? 'on' : 'off');

    const section = holder.current?.closest('.ap-journey-3d');
    if (section && eligible) section.classList.add('ap-journey-3d--on');

    // `mobile` REATTIVO: la curva (STATIONS_MOBILE/DESKTOP) e la scala del cursore
    // dipendono dal breakpoint. Letto una sola volta al mount, restava sbagliato
    // dopo un resize desktop o la rotazione di tablet/telefono. matchMedia.change
    // scatta solo all'attraversamento della soglia → ricostruzione mirata, non a
    // ogni pixel di resize.
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);

    return () => {
      mq.removeEventListener('change', sync);
      if (section) section.classList.remove('ap-journey-3d--on');
    };
  }, []);

  if (mode !== 'on') {
    return <div ref={holder} className="ajx-holder" aria-hidden="true" />;
  }

  return (
    <div ref={holder} className="ajx-holder">
      <JourneyStage steps={steps} mobile={mobile} />
    </div>
  );
}

// Precarica il modello (no-op innocuo se il file non è ancora presente).
try {
  useGLTF.preload(MODEL_URL);
} catch {
  /* ignore */
}
