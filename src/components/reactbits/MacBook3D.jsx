/* eslint-disable react/no-unknown-property */
'use client';

// MacBook3D — stage "MacBook Scroll" con un MacBook Pro 3D REALE.
// Sostituisce la vecchia reimplementazione CSS del laptop: qui il PC è il modello
// glTF `mac.glb` (da github.com/shahdinsalman23/react-macbookpro) renderizzato in
// WebGL via React Three Fiber. Il CONCETTO resta identico: la sezione si pinna,
// lo scroll (1) apre il coperchio e (2) fa avvicendare sullo schermo i progetti
// reali, con le tab sotto per il salto diretto.
//
// PONTE GSAP ↔ 3D — questa isola NON guida lo scroll (lo fa Lenis+ScrollTrigger
// in main.ts, unico driver, per non entrare in conflitto). main.ts scrive su uno
// store globale `window.__mbp`:
//   • .open  (0→1 continuo) = frazione di apertura del coperchio → letta in
//     useFrame per ruotare la mesh del coperchio (nessun re-render React).
//   • setIndex(i) (discreto) = slide attiva → aggiorna stato React (slide+tab).
// L'isola espone `window.__mbpApi.setIndex` e chiama `window.__mbpSeek(i)` al
// click di una tab (main.ts fa lo scrollTo). Senza pin (mobile/reduced-motion)
// la tab cambia slide localmente e il coperchio resta aperto.
//
// SCHERMO — le slide (video live + barra browser + link cliccabile) sono HTML
// reale proiettato sul pannello del Mac con <Html transform occlude> (drei): il
// gruppo che ospita l'HTML viene agganciato ogni frame alla matrice mondo della
// mesh `matte` (il pannello display), così segue esattamente il coperchio che
// si apre. La fedeltà è piena: stesso markup/CSS di prima (.mbp-display ecc.).

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer, Html } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/mac.glb';

// ─────────────────────────────────────────────────────────────────────────────
// KNOB DI CALIBRAZIONE — regolabili a occhio dal risultato a schermo.
// (Sono state stimate senza anteprima: qui si tara la scena finché è perfetta.)
// ─────────────────────────────────────────────────────────────────────────────
const TUNING = {
  // Camera: inquadratura del laptop. Il modello è "grande", quindi z alto + fov
  // stretto (come nel repo originale). Alza z per allontanare, cambia y per
  // alzare/abbassare l'inquadratura.
  // z più BASSO = laptop più GRANDE nell'inquadratura (era 220 → troppo piccolo).
  camera: { fov: 12, position: [0, -6, 150] },
  // Posizione del gruppo che contiene il modello (centra il Mac nell'inquadratura).
  groupPosition: [0, -10, 20],
  groupRotation: [0, 0, 0],
  // Apertura del coperchio: rotazione X della mesh `screen` (in gradi).
  // closed = coperchio chiuso (sdraiato); open = coperchio alzato/leggibile.
  lid: { closedDeg: 180, openDeg: 93 },
  // Proiezione HTML sullo schermo. La SCALA e l'ORIENTAMENTO sono ora AUTOMATICI
  // (misurati dal pannello del modello), quindi niente più numeri magici:
  //   fit          → margine di riempimento del pannello (0.98 = 2% di bezel)
  //   offset       → quanto l'HTML "galleggia" davanti al vetro (anti z-fight)
  //   extraRotDeg  → nudge manuale se il testo esce specchiato/capovolto
  html: { fit: 0.98, offset: 0.2, extraRotDeg: [0, 0, 0] },
  // Larghezza logica (px) del contenuto schermo; l'altezza segue l'aspect reale
  // del pannello (calcolato). Alta risoluzione → testo/video nitidi.
  screenPx: { w: 1000 },
};

// Store globale condiviso con main.ts (ponte scroll → 3D).
function getStore() {
  if (typeof window === 'undefined') return { open: 0, index: 0 };
  if (!window.__mbp) window.__mbp = { open: 0, index: 0 };
  return window.__mbp;
}

const deg = THREE.MathUtils.degToRad;

// ── Il modello 3D: apre il coperchio da store.open e aggancia l'HTML al pannello.
function MacModel({ children, onScreenReady }) {
  const { scene } = useGLTF(MODEL_URL);
  const store = getStore();

  // Individua le mesh chiave del modello: `screen` = coperchio (pivot apertura),
  // `matte` = pannello display (dove agganciamo l'HTML). Prepara il pannello a
  // nero opaco: se l'HTML fosse un filo disallineato, dietro resta nero (non la
  // texture rossa demo).
  const { screen, matte, align } = useMemo(() => {
    let screen = null;
    let matte = null;
    scene.traverse((o) => {
      if (o.name === 'screen') screen = o;
      if (o.name === 'matte') matte = o;
    });
    if (matte && matte.material) {
      matte.material.map = null;
      matte.material.emissive = new THREE.Color(0x000000);
      matte.material.emissiveIntensity = 0;
      matte.material.color = new THREE.Color(0x05060a);
      matte.material.metalness = 0;
      matte.material.roughness = 1;
      matte.material.needsUpdate = true;
    }

    // FIT AUTOMATICO — misura le dimensioni REALI del pannello display e ne
    // ricava scala, aspect e orientamento per l'HTML, così lo schermo riempie
    // esattamente il pannello (niente più scala "magica" da indovinare).
    // Costante 40: drei <Html transform> senza distanceFactor divide la matrice
    // per 40 → larghezza_mondo = px * scaleGruppo / 40. Invertiamo per il fit.
    let align = null;
    if (matte) {
      matte.updateWorldMatrix(true, false);
      matte.geometry.computeBoundingBox();
      const bb = matte.geometry.boundingBox;
      const size = bb.getSize(new THREE.Vector3());
      const center = bb.getCenter(new THREE.Vector3());
      const ws = matte.getWorldScale(new THREE.Vector3());
      const wd = new THREE.Vector3(
        Math.abs(size.x * ws.x),
        Math.abs(size.y * ws.y),
        Math.abs(size.z * ws.z)
      );
      // Asse "normale" = estensione più piccola (spessore del pannello). La
      // faccia è data dagli altri due assi; ruotiamo l'HTML per posarlo lì.
      let faceW, faceH, euler;
      if (wd.z <= wd.x && wd.z <= wd.y) {
        faceW = wd.x; faceH = wd.y; euler = new THREE.Euler(0, 0, 0);
      } else if (wd.y <= wd.x && wd.y <= wd.z) {
        faceW = wd.x; faceH = wd.z; euler = new THREE.Euler(Math.PI / 2, 0, 0);
      } else {
        faceW = wd.z; faceH = wd.y; euler = new THREE.Euler(0, Math.PI / 2, 0);
      }
      const manual = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          deg(TUNING.html.extraRotDeg[0]),
          deg(TUNING.html.extraRotDeg[1]),
          deg(TUNING.html.extraRotDeg[2])
        )
      );
      align = {
        scale: ((faceW * 40) / TUNING.screenPx.w) * TUNING.html.fit,
        aspect: faceH / faceW,
        extraQuat: new THREE.Quaternion().setFromEuler(euler).multiply(manual),
        centerLocal: center,
      };
    }
    return { screen, matte, align };
  }, [scene]);

  const camera = useThree((s) => s.camera);
  const htmlAnchor = useRef(null);
  const tmpQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpCenter = useMemo(() => new THREE.Vector3(), []);
  const normalOffset = useMemo(() => new THREE.Vector3(), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const toCam = useMemo(() => new THREE.Vector3(), []);
  const quatY180 = useMemo(
    () => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI),
    []
  );

  useEffect(() => {
    if (onScreenReady) onScreenReady(!!(screen && matte));
  }, [screen, matte, onScreenReady]);

  useFrame(() => {
    // 1) Apertura coperchio: interpola la rotazione X tra chiuso e aperto.
    if (screen) {
      const t = THREE.MathUtils.clamp(store.open ?? 0, 0, 1);
      screen.rotation.x = deg(
        THREE.MathUtils.lerp(TUNING.lid.closedDeg, TUNING.lid.openDeg, t)
      );
    }
    // 2) Aggancia l'HTML alla faccia del pannello `matte`: centro esatto,
    //    orientamento (+ correzione faccia), scala di fit. Segue il coperchio.
    if (matte && htmlAnchor.current && align) {
      matte.updateWorldMatrix(true, false);
      matte.matrixWorld.decompose(tmpCenter, tmpQuat, normalOffset);
      // Orientamento: rotazione mondo del pannello × correzione faccia.
      htmlAnchor.current.quaternion.copy(tmpQuat).multiply(align.extraQuat);
      // Centro della faccia del pannello in coordinate mondo.
      tmpCenter.copy(align.centerLocal).applyMatrix4(matte.matrixWorld);
      // AUTO-FLIP fronte/retro: se lo schermo guarda LONTANO dalla camera, lo
      // giro di 180° attorno al suo asse verticale, così l'HTML è sempre
      // rivolto verso l'osservatore (testo leggibile, non specchiato) e l'offset
      // lo spinge DAVANTI al vetro invece che dietro il pannello opaco.
      fwd.set(0, 0, 1).applyQuaternion(htmlAnchor.current.quaternion);
      toCam.copy(camera.position).sub(tmpCenter);
      if (fwd.dot(toCam) < 0) {
        htmlAnchor.current.quaternion.multiply(quatY180);
      }
      // Posizione: centro faccia + un filo lungo la normale (verso la camera).
      normalOffset.set(0, 0, TUNING.html.offset).applyQuaternion(htmlAnchor.current.quaternion);
      htmlAnchor.current.position.copy(tmpCenter).add(normalOffset);
      htmlAnchor.current.scale.setScalar(align.scale);
      // Nascondi l'HTML quando il coperchio è quasi chiuso (guarda altrove).
      htmlAnchor.current.visible = (store.open ?? 0) > 0.12;
    }
  });

  const screenHeightPx = align ? Math.round(TUNING.screenPx.w * align.aspect) : 625;

  return (
    <group position={TUNING.groupPosition} rotation={TUNING.groupRotation}>
      <primitive object={scene} />
      <group ref={htmlAnchor}>
        <Html
          transform
          zIndexRange={[10, 0]}
          style={{
            width: `${TUNING.screenPx.w}px`,
            height: `${screenHeightPx}px`,
            pointerEvents: 'auto',
          }}
        >
          {typeof children === 'function' ? children(screenHeightPx) : children}
        </Html>
      </group>
    </group>
  );
}

// ── Contenuto dello schermo: barra browser + slide (stesso markup/CSS di prima).
function ScreenContent({ projects, previewLabel, ctaAddress, index, heightPx = 625 }) {
  const videoRefs = useRef([]);
  const active = projects[index] ?? projects[0];
  const address = active?.status === 'soon' ? ctaAddress : active?.flag;

  // Play/pausa del video attivo (gli altri in pausa e riavvolti).
  useEffect(() => {
    videoRefs.current.forEach((v, k) => {
      if (!v) return;
      if (k === index) {
        v.play().catch(() => {});
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [index]);

  return (
    <div className="mbp-html-screen" style={{ width: 1000, height: heightPx }}>
      <div className="mbp-display">
        <div className="mbp-chrome">
          <span className="mbp-dots" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
          </span>
          <span className="mbp-address">{address}</span>
          <span className="mbp-chrome-badge">{previewLabel}</span>
        </div>

        <div className="mbp-viewport">
          {projects.map((p, i) => {
            const external = !!p.url && !p.url.startsWith('#');
            const isActive = i === index;
            if (p.status === 'soon') {
              return (
                <div
                  key={i}
                  className={`mbp-slide mbp-slide--cta grad-2${isActive ? ' is-active' : ''}`}
                  data-index={i}
                >
                  <span className="mbp-grain" aria-hidden="true"></span>
                  <svg className="mbp-emblem" viewBox="0 0 120 120" fill="none" aria-hidden="true">
                    <circle cx="60" cy="60" r="46" stroke="currentColor" strokeWidth="1" strokeDasharray="3 7" opacity="0.5" />
                    <circle cx="60" cy="60" r="30" stroke="currentColor" strokeWidth="1" opacity="0.35" />
                    <line x1="60" y1="46" x2="60" y2="74" stroke="currentColor" strokeWidth="1.4" />
                    <line x1="46" y1="60" x2="74" y2="60" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="60" cy="60" r="3.4" fill="currentColor" />
                  </svg>
                  <span className="mbp-cta-kicker">{p.type}</span>
                  <h3 className="mbp-cta-title">
                    {p.title} <em>{p.titleEm}</em>
                  </h3>
                  {p.desc && <p className="mbp-cta-desc">{p.desc}</p>}
                  <a className="mbp-open mbp-open--cta" href={p.url}>
                    <span className="mbp-open-label">{p.cta}</span>
                    <span className="mbp-open-arrow" aria-hidden="true">→</span>
                  </a>
                </div>
              );
            }
            return (
              <a
                key={i}
                className={`mbp-slide${isActive ? ' is-active' : ''}`}
                data-index={i}
                href={p.url}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {p.video && (
                  <video
                    ref={(el) => (videoRefs.current[i] = el)}
                    className="mbp-media"
                    src={p.video}
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  ></video>
                )}
                <span className="mbp-scrim" aria-hidden="true"></span>
                <span className="mbp-caption">
                  <span className="mbp-caption-meta">
                    <span className="mbp-caption-tick" aria-hidden="true"></span>
                    {p.type}
                    {p.year ? ` · ${p.year}` : ''}
                  </span>
                  <span className="mbp-caption-row">
                    <span className="mbp-caption-title">
                      {p.title} <em>{p.titleEm}</em>
                    </span>
                    <span className="mbp-open">
                      <span className="mbp-open-label">{p.cta}</span>
                      <span className="mbp-open-arrow" aria-hidden="true">↗</span>
                    </span>
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MacBook3D({ projects = [], previewLabel = '', ctaAddress = '' }) {
  const [index, setIndex] = useState(() => getStore().index || 0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    // Espone l'API all'orchestratore GSAP (main.ts). setIndex è idempotente.
    // Allinea subito l'indice allo store (se l'isola monta a scroll già dentro).
    setIndex(Math.max(0, Math.min(projects.length - 1, getStore().index || 0)));
    window.__mbpApi = { setIndex: (i) => setIndex(Math.max(0, Math.min(projects.length - 1, i))) };
    // Segnala il numero di slide a main.ts (per la lunghezza del pin).
    window.__mbp.count = projects.length;
    // Marca il mount → il CSS nasconde il fallback statico.
    document.querySelector('[data-mbp-mount]')?.classList.add('is-live');
    return () => {
      if (window.__mbpApi) delete window.__mbpApi;
    };
  }, [projects.length]);

  const onTab = (i) => {
    if (typeof window !== 'undefined' && typeof window.__mbpSeek === 'function') {
      window.__mbpSeek(i); // pin attivo → main.ts fa lo scrollTo, poi setIndex
    } else {
      setIndex(i); // fallback senza pin → switch immediato
      getStore().open = 1;
    }
  };

  return (
    <div className="mbp" data-mbp>
      <div className="mbp-scene">
        <div className="mbp-stage">
          <Canvas
            camera={TUNING.camera}
            dpr={[1, isMobile ? 1.5 : 2]}
            gl={{ alpha: true, antialias: true }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.6} />
            <Suspense fallback={null}>
              <MacModel>
                {(heightPx) => (
                  <ScreenContent
                    projects={projects}
                    previewLabel={previewLabel}
                    ctaAddress={ctaAddress}
                    index={index}
                    heightPx={heightPx}
                  />
                )}
              </MacModel>
              {/* Studio procedurale (Lightformer): riflessi sull'alluminio senza
                  asset HDRI esterni → build self-contained. */}
              <Environment blur={0.7}>
                <Lightformer intensity={2} color="white" position={[0, 4, -6]} rotation={[0, 0, 0]} scale={[10, 10, 1]} />
                <Lightformer intensity={1.4} color="#cbd6ff" position={[-6, 2, 4]} rotation={[0, Math.PI / 3, 0]} scale={[8, 8, 1]} />
                <Lightformer intensity={1.2} color="white" position={[6, 2, 4]} rotation={[0, -Math.PI / 3, 0]} scale={[8, 8, 1]} />
                <Lightformer intensity={1} color="#8aa0ff" position={[0, -4, 2]} scale={[10, 4, 1]} />
              </Environment>
            </Suspense>
          </Canvas>
        </div>

        <div className="mbp-tabs" role="tablist" aria-label={previewLabel}>
          {projects.map((p, i) => (
            <button
              key={i}
              className={`mbp-tab${i === index ? ' is-active' : ''}${p.status === 'soon' ? ' mbp-tab--cta' : ''}`}
              type="button"
              role="tab"
              aria-selected={i === index ? 'true' : 'false'}
              onClick={() => onTab(i)}
            >
              <span className="mbp-tab-n">{p.n}</span>
              <span className="mbp-tab-name">
                {p.title} <em>{p.titleEm}</em>
              </span>
              <span className="mbp-tab-dot" aria-hidden="true"></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
