// HeroJourney — la hero della home come un VIAGGIO: lo scroll fa volare la
// camera dentro una valle dolomitica disegnata a curve di livello, come una
// carta topografica stampata sulla carta del sito. È la strada da Bolzano
// allo Sciliar: tre "picchetti" lungo la valle sono luoghi veri, in fondo la
// camera scavalca il passo e arriva allo Sciliar, con un sole EMBER che sorge
// dalla foschia. Lo Sciliar è il fondale di "Il punto", la sezione dopo: la
// carta diventa la foto. Le tappe NON sono i servizi (verrebbero ripetuti).
//
// Regia: la sezione è alta (vedi .hero-journey in global.css) e il palco è
// sticky. Il progresso p ∈ [0,1] si legge dal rettangolo della sezione a ogni
// frame (lo scroll è già smorzato da Lenis), viene smorzato ancora un filo e
// scritto in `--p` sulla sezione: il testo HTML (titolo, finale) è guidato in
// CSS da quella variabile, la camera da qui. Una sola fonte → testo e scena
// non si scollano mai.
//
// Tutto il terreno è UN plane spostato nel vertex shader (rumore "ridged" +
// solco della valle lungo pathX + passo trasversale in fondo); le curve di
// livello sono calcolate nel fragment con fwidth, quindi restano di spessore
// costante a qualunque distanza. Colori scritti GIÀ in sRGB e renderer `flat`:
// nessuna conversione, il fondo coincide esattamente con --color-bg.
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// ---------- Percorso della valle (identico nello shader) ----------
const pathX = (z) => Math.sin(z * 0.031) * 7 + Math.sin(z * 0.0123 + 1.3) * 11;
const dPathX = (z) =>
  0.031 * 7 * Math.cos(z * 0.031) + 0.0123 * 11 * Math.cos(z * 0.0123 + 1.3);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// Corsa della camera: metà lineare, metà coseno → parte e arriva piano ma non
// "si ferma" mai a metà valle.
const Z_START = 34;
const Z_END = -232;
const travel = (s) => 0.5 * s + 0.25 * (1 - Math.cos(Math.PI * s));
const camZAt = (s) => mix(Z_START, Z_END, travel(s));

// Il passo da scavalcare sta dove la camera arriva a s ≈ 0.82.
const Z_PASS = -195;

// Le tre tappe: progresso a cui la camera "si ferma" (fermata di
// scroll) e il picchetto sta 14 unità più avanti, alternato ai lati del solco.
export const STOP_S = [0.36, 0.5, 0.64];
const MARK_AHEAD = 14;
// Su telefono il picchetto sta quasi sull'asse: l'etichetta non esce dallo
// schermo stretto.
// La strada vera: Bolzano → Fiè → Castelrotto → Alpe di Siusi → Sciliar
// (Monte Pez), agganciata ai progressi delle tappe e dell'arrivo.
const ROUTE = [
  { s: 0, lat: 46.4983, lon: 11.3548, alt: 262 },
  { s: STOP_S[0], lat: 46.5167, lon: 11.5, alt: 880 },
  { s: STOP_S[1], lat: 46.5667, lon: 11.5594, alt: 1060 },
  { s: STOP_S[2], lat: 46.5411, lon: 11.6214, alt: 1850 },
  { s: 0.92, lat: 46.5047, lon: 11.6008, alt: 2563 },
];
const routeAt = (s) => {
  let i = 0;
  while (i < ROUTE.length - 2 && s > ROUTE[i + 1].s) i++;
  const a = ROUTE[i];
  const b = ROUTE[i + 1];
  const t = smooth(a.s, b.s, s);
  return { lat: mix(a.lat, b.lat, t), lon: mix(a.lon, b.lon, t), alt: mix(a.alt, b.alt, t) };
};

const makeMarks = (mobile) =>
  STOP_S.map((s, i) => {
    const z = camZAt(s) - MARK_AHEAD;
    return { s, z, x: pathX(z) + (i % 2 ? -1 : 1) * (mobile ? 0.7 : 2.4) };
  });

// ---------- Shader ----------
// Simplex 2D — Ian McEwan, Ashima Arts (MIT).
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;
  vec3 h=abs(x)-0.5;
  vec3 ox=floor(x+0.5);
  vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;
  g.x=a0.x*x0.x+h.x*x0.y;
  g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float ridged(vec2 p){
  float s=0.0, a=0.5;
  for(int i=0;i<4;i++){
    float n=1.0-abs(snoise(p));
    s+=n*n*a;
    p=p*2.03+vec2(17.1,9.7);
    a*=0.5;
  }
  return s;
}
float pathX(float z){ return sin(z*0.031)*7.0 + sin(z*0.0123+1.3)*11.0; }
float terrain(vec2 q){
  float d = abs(q.x - pathX(q.y));
  float valley = smoothstep(3.0, 17.0, d);
  float r = ridged(q*0.017);
  // Massicci larghi (rumore lento) con creste e torri sopra (ridged):
  // pareti ripide ma non un bosco di aghi.
  float massif = smoothstep(-0.4, 0.8, snoise(q*0.007 + 3.7));
  float h = (pow(r, 1.7) * 30.0 + massif * 9.0) * valley;
  // Il passo in fondo alla valle, trasversale al solco.
  float pass = exp(-pow((q.y - (${Z_PASS.toFixed(1)}))/9.0, 2.0));
  h += pass * 12.5 * (0.8 + 0.25*r);
  // Oltre il passo la valle si apre: rilievi bassi verso l'orizzonte.
  h *= mix(1.0, 0.22, 1.0 - smoothstep(${(Z_PASS - 55).toFixed(1)}, ${(Z_PASS - 8).toFixed(1)}, q.y));
  // Il fondo non è piatto: ondulazioni lente (diventano "anelli" sulla carta).
  h += snoise(q*0.07) * 0.55;
  return h;
}
`;

const terrainVert = /* glsl */ `
${NOISE}
varying vec3 vW;
varying vec3 vN;
void main(){
  vec3 p = (modelMatrix * vec4(position,1.0)).xyz;
  float e = 0.35;
  float h  = terrain(p.xz);
  float hx = terrain(p.xz + vec2(e,0.0));
  float hz = terrain(p.xz + vec2(0.0,e));
  p.y = h;
  vN = normalize(vec3(h-hx, e, h-hz));
  vW = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p,1.0);
}
`;

const terrainFrag = /* glsl */ `
uniform vec3 uCam;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTime;
uniform float uScanZ;
uniform float uEnd;
uniform vec4 uWay[3];
varying vec3 vW;
varying vec3 vN;

const vec3 PAPER  = vec3(0.996,0.992,0.925);  // #FEFDEC
const vec3 SHADE  = vec3(0.905,0.890,0.800);
const vec3 INK    = vec3(0.090,0.075,0.063);  // #171310
const vec3 ACCENT = vec3(0.153,0.282,0.647);  // #2748A5
const vec3 EMBER  = vec3(0.847,0.251,0.008);  // #D84002
const vec3 CLAY   = vec3(0.980,0.875,0.788);  // #FADFC9

float iso(float v, float k){
  float d = abs(fract(v + 0.5) - 0.5);
  return 1.0 - smoothstep(0.0, fwidth(v) * k, d);
}

void main(){
  vec3 N = normalize(vN);
  vec3 L = normalize(vec3(-0.55, 0.72, 0.25));
  float diff = dot(N, L) * 0.5 + 0.5;
  vec3 col = mix(SHADE, PAPER, smoothstep(0.25, 0.95, diff));

  // Curve di livello: ordinarie ogni 1.2, direttrici ogni 6. Dove si
  // addensano troppo (lontano o su pareti verticali) sfumano: niente moiré.
  float c1 = vW.y / 1.2;
  float c2 = vW.y / 6.0;
  float dens = fwidth(c1);
  float minor = iso(c1, 1.1) * (1.0 - smoothstep(0.22, 0.55, dens));
  float major = iso(c2, 1.7) * (1.0 - smoothstep(0.35, 0.9, fwidth(c2) * 5.0));
  float lines = clamp(minor * 0.30 + major * 0.55, 0.0, 1.0);
  col = mix(col, INK, lines);

  // Scansione: una banda ACCENT corre avanti nella valle e "digitalizza" le
  // curve che attraversa.
  float band = exp(-pow((vW.z - uScanZ) / 1.6, 2.0));
  col = mix(col, ACCENT, band * clamp(minor + major, 0.0, 1.0) * 0.85);
  col = mix(col, ACCENT, band * 0.035);

  // Tappe: le curve attorno al picchetto si accendono EMBER e un'onda si
  // allarga dal punto, come un segnale.
  for (int i = 0; i < 3; i++) {
    vec4 w = uWay[i];
    float d = length(vW.xz - w.xz);
    float glow = w.w * (1.0 - smoothstep(3.0, 13.0, d));
    col = mix(col, EMBER, glow * clamp(minor + major, 0.0, 1.0) * 0.95);
    float r = mod(uTime * 5.0 + float(i) * 3.0, 15.0);
    float ring = exp(-pow((d - r) / 0.45, 2.0)) * w.w * (1.0 - r / 15.0);
    col = mix(col, EMBER, ring * 0.55);
  }

  // Finale: oltre il passo le curve si scaldano verso il sole.
  float warm = uEnd * (1.0 - smoothstep(${(Z_PASS - 40).toFixed(1)}, ${(Z_PASS + 10).toFixed(1)}, vW.z));
  col = mix(col, mix(col, EMBER, 0.7), warm * clamp(minor + major, 0.0, 1.0));

  // Foschia verso la carta (in fondo, col sole, un velo di CLAY).
  float dist = length(vW - uCam);
  float f = smoothstep(uFogNear, uFogFar, dist);
  vec3 fogCol = mix(PAPER, mix(PAPER, CLAY, 0.55), uEnd * (1.0 - smoothstep(-420.0, -260.0, vW.z)));
  col = mix(col, fogCol, f);

  gl_FragColor = vec4(col, 1.0);
}
`;

const sunVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;
// Sole da manifesto: disco EMBER→AMBER, la metà bassa tagliata da fasce di
// carta che si allargano verso il basso, alone morbido attorno.
const sunFrag = /* glsl */ `
uniform float uOpacity;
varying vec2 vUv;
void main(){
  vec2 q = vUv * 2.0 - 1.0;
  float d = length(q) / 0.5;
  float disc = 1.0 - smoothstep(0.985, 1.0, d);
  float y = q.y / 0.5;
  float gap = smoothstep(0.12, 1.0, -y) * 0.62;
  float sv = y * 6.0 + 0.5;
  float aa = fwidth(sv) * 0.75;
  // Calcolata sempre (niente ramo): fwidth dentro un if è indefinita e
  // spezzava le fasce in tronconi sfalsati.
  float stripe = mix(1.0, smoothstep(gap - aa, gap + aa, fract(sv)), step(0.02, gap));
  disc *= stripe;
  vec3 ember = vec3(0.847,0.251,0.008);
  vec3 amber = vec3(0.949,0.569,0.247);
  vec3 col = mix(ember, amber, smoothstep(-1.0, 1.0, y));
  float halo = exp(-max(d - 1.0, 0.0) * 1.6) * (1.0 - disc) * 0.3 * (1.0 - smoothstep(1.3, 1.95, d));
  float a = (disc + halo) * uOpacity;
  vec3 haloCol = vec3(0.98,0.80,0.62);
  gl_FragColor = vec4(mix(haloCol, col, disc), a);
}
`;

const dustVert = /* glsl */ `
uniform float uTime;
uniform float uPx;
attribute float aSeed;
varying float vA;
void main(){
  vec3 p = position;
  p.y += sin(uTime * 0.4 + aSeed * 6.28) * 0.35;
  p.x += cos(uTime * 0.3 + aSeed * 12.0) * 0.25;
  vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  vA = (1.0 - smoothstep(30.0, 70.0, dist)) * smoothstep(0.5, 3.0, dist);
  gl_PointSize = uPx * (0.6 + aSeed) * (14.0 / dist);
  gl_Position = projectionMatrix * mv;
}
`;
const dustFrag = /* glsl */ `
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.3, 0.5, d)) * vA * 0.45;
  gl_FragColor = vec4(0.090,0.075,0.063, a);
}
`;

// ---------- Scena ----------
function Terrain({ uniforms, mobile }) {
  const geo = useMemo(() => {
    const W = 170;
    const Z0 = 60;
    const Z1 = -440;
    const L = Z0 - Z1;
    const g = new THREE.PlaneGeometry(W, L, mobile ? 150 : 300, mobile ? 440 : 880);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, (Z0 + Z1) / 2);
    return g;
  }, [mobile]);
  // Materiale istanziato qui: passato come prop JSX, R3F clonerebbe gli
  // uniform e gli aggiornamenti per frame non arriverebbero allo shader.
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: terrainVert, fragmentShader: terrainFrag, uniforms }),
    [uniforms]
  );
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  return <mesh geometry={geo} material={mat} frustumCulled={false} />;
}

function Dust({ mobile, time }) {
  const { geo, mat } = useMemo(() => {
    const n = mobile ? 500 : 1200;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const z = mix(40, -260, Math.random());
      pos[i * 3] = pathX(z) + (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = 0.8 + Math.random() * 14;
      pos[i * 3 + 2] = z;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: dustVert,
      fragmentShader: dustFrag,
      uniforms: { uTime: time, uPx: { value: Math.min(window.devicePixelRatio, 1.75) * 2.2 } },
      transparent: true,
      depthWrite: false,
    });
    return { geo: g, mat: m };
  }, [mobile, time]);
  useEffect(() => () => (geo.dispose(), mat.dispose()), [geo, mat]);
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

function Marker({ mark, index, label, labelRef, poleRef }) {
  return (
    <group position={[mark.x, 0, mark.z]}>
      <mesh ref={poleRef} position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 6.4, 6]} />
        <meshBasicMaterial color="#171310" transparent opacity={0} />
      </mesh>
      <Html position={[0, 6.6, 0]} center zIndexRange={[20, 10]} wrapperClass="hj-mark-wrap">
        <div ref={labelRef} className="hj-mark" style={{ opacity: 0 }}>
          <span className="hj-mark-num">{String(index + 1).padStart(2, "0")}</span>
          <span className="hj-mark-name">{label.name}</span>
          <span className="hj-mark-alt">{label.alt}</span>
        </div>
      </Html>
    </group>
  );
}

function Rig({ section, stops, mobile, still }) {
  const { camera } = useThree();
  const marks = useMemo(() => makeMarks(mobile), [mobile]);
  const time = useMemo(() => ({ value: 0 }), []);
  const uniforms = useMemo(
    () => ({
      uCam: { value: new THREE.Vector3() },
      uFogNear: { value: 40 },
      uFogFar: { value: 150 },
      uTime: time,
      uScanZ: { value: 0 },
      uEnd: { value: 0 },
      uWay: { value: marks.map((m) => new THREE.Vector4(m.x, 0, m.z, 0)) },
    }),
    [time, marks]
  );
  const sunMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: sunVert,
        fragmentShader: sunFrag,
        uniforms: { uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
    []
  );
  const sunRef = useRef();
  const labelRefs = useRef([]);
  const poleRefs = useRef([]);
  const state = useRef({ p: 0, mx: 0, my: 0, tx: 0, ty: 0 });
  const look = useMemo(() => new THREE.Vector3(), []);
  const sunDir = useMemo(() => new THREE.Vector3(), []);
  const hud = useMemo(
    () => ({
      lat: section.querySelector("[data-hj-lat]"),
      lon: section.querySelector("[data-hj-lon]"),
      alt: section.querySelector("[data-hj-alt]"),
    }),
    [section]
  );

  useEffect(() => {
    if (still) return;
    const onMove = (e) => {
      state.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      state.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [still]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    const st = state.current;
    time.value += dt;

    // Progresso dalla sezione (lo scroll è già smorzato da Lenis).
    const rect = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    const raw = still || total <= 0 ? 0 : clamp01(-rect.top / total);
    st.p += (raw - st.p) * (1 - Math.exp(-dt * 9));
    if (Math.abs(raw - st.p) < 1e-4) st.p = raw;
    const s = st.p;
    section.style.setProperty("--p", s.toFixed(4));
    section.classList.toggle("is-travelling", s > 0.06);

    // Mouse: la camera "guarda attorno" di poco, con inerzia.
    st.mx += (st.tx - st.mx) * (1 - Math.exp(-dt * 3));
    st.my += (st.ty - st.my) * (1 - Math.exp(-dt * 3));

    // Camera: in alto sopra la valle → giù nel solco → su per il passo.
    const z = camZAt(s);
    const xPath = pathX(z);
    const dive = smooth(0.04, 0.24, s);
    const climb = smooth(0.7, 0.84, s);
    const settle = smooth(0.88, 1, s);
    const y = mix(30, 4.2, dive) + climb * 20 - settle * 3 + Math.sin(time.value * 0.6) * 0.15;
    const ahead = mix(mix(46, 18, dive), 60, smooth(0.78, 0.92, s));
    const tz = z - ahead;
    let ty = mix(0, y - 1.3, dive);
    ty = mix(ty, y + 1.2, smooth(0.78, 0.92, s));
    camera.position.set(xPath + st.mx * 1.4, y - st.my * 0.8, z);
    look.set(pathX(tz) + st.mx * 3, ty - st.my * 1.5, tz);
    camera.lookAt(look);
    // Inclinazione in curva, come un volo vero.
    const end = smooth(0.8, 0.95, s);
    camera.rotateZ(-dPathX(z) * 0.9 * (1 - climb * 0.6) * (1 - end));

    // Shader
    uniforms.uCam.value.copy(camera.position);
    uniforms.uScanZ.value = z - 8 - ((time.value * 22) % 110);
    uniforms.uEnd.value = end;
    uniforms.uFogFar.value = mix(150, 175, end);
    uniforms.uFogNear.value = mix(mix(70, 30, dive), 55, end);

    // Tappe: picchetto, etichetta e curve accese quando la camera ci arriva.
    marks.forEach((m, i) => {
      const k = smooth(0.06, 0.0, Math.abs(s - m.s)) * (1 - smooth(m.z + 6, m.z + 2, z));
      const vis = clamp01(smooth(0.075, 0.02, Math.abs(s - m.s)));
      uniforms.uWay.value[i].w = k;
      const lab = labelRefs.current[i];
      if (lab) {
        lab.style.opacity = vis.toFixed(3);
        lab.style.transform = `translateY(${((1 - vis) * 10).toFixed(1)}px)`;
      }
      const pole = poleRefs.current[i];
      if (pole) pole.material.opacity = vis * 0.85;
    });

    // Sole: sorge oltre il passo e guarda sempre la camera.
    if (sunRef.current) {
      // All'infinito: segue la camera lungo la direzione di volo (senza il
      // mouse, così guardandosi attorno il sole resta fermo nel cielo).
      sunDir.set(pathX(tz) - xPath, 0, tz - z).normalize();
      sunRef.current.position.set(xPath + sunDir.x * 250, y + mix(-34, 9, end), z + sunDir.z * 250);
      // Orientato come la camera (non lookAt): le fasce restano parallele ai
      // bordi dello schermo anche col rollio, niente scalini sulle orizzontali.
      sunRef.current.quaternion.copy(camera.quaternion);
      sunMat.uniforms.uOpacity.value = smooth(0.74, 0.86, s);
    }

    // HUD: posizione vera lungo la strada (tappa per tappa) e quota = quota
    // del luogo + altezza di volo della camera, che all'arrivo si annulla:
    // in vetta l'HUD dice esattamente la quota dello Sciliar.
    if (hud.lat) {
      const r = routeAt(s);
      const fly = (y - 4.2) * 40 * (1 - smooth(0.84, 0.92, s));
      hud.lat.textContent = `${r.lat.toFixed(4)}° N`;
      hud.lon.textContent = `${r.lon.toFixed(4)}° E`;
      hud.alt.textContent = `${Math.round(r.alt + fly).toLocaleString("it-IT")} m`;
    }
  });

  return (
    <>
      <Terrain uniforms={uniforms} mobile={mobile} />
      <Dust mobile={mobile} time={time} />
      <mesh ref={sunRef} material={sunMat} renderOrder={-1}>
        <planeGeometry args={[96, 96]} />
      </mesh>
      {marks.map((m, i) => (
        <Marker
          key={i}
          mark={m}
          index={i}
          label={stops[i]}
          labelRef={(el) => (labelRefs.current[i] = el)}
          poleRef={(el) => (poleRefs.current[i] = el)}
        />
      ))}
    </>
  );
}

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

export default function HeroJourney({ stops }) {
  const host = useRef(null);
  const [section, setSection] = useState(null);
  const [visible, setVisible] = useState(true);
  const [env] = useState(() => ({
    ok: hasWebGL(),
    mobile: window.matchMedia("(max-width: 767px)").matches,
    // Stessa regola di main.ts: reduced motion o telefono in orizzontale →
    // niente viaggio, una sola inquadratura ferma.
    still:
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-height: 500px) and (orientation: landscape) and (hover: none)").matches,
  }));

  useEffect(() => {
    const sec = host.current?.closest(".hero-journey");
    if (!sec) return;
    // La sezione nasce GIÀ .is-live (alta, nel markup): così i pin delle
    // sezioni sotto (Il punto…) si misurano sull'altezza giusta fin dal primo
    // calcolo. Solo se il viaggio non parte la si accorcia, e allora pin e
    // fermate vanno rimisurati.
    if (!env.ok || env.still) {
      sec.classList.remove("is-live");
      ScrollTrigger.refresh();
      window.dispatchEvent(new Event("apd:detents"));
    }
    if (!env.ok) return;
    setSection(sec);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: "10% 0px",
    });
    io.observe(sec);
    return () => io.disconnect();
  }, [env]);

  return (
    <div ref={host} className="hj-canvas" aria-hidden="true">
      {env.ok && section && (
        <Canvas
          flat
          dpr={[1, env.mobile ? 1.5 : 1.75]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          camera={{ fov: env.mobile ? 62 : 50, near: 0.1, far: 900, position: [0, 30, Z_START] }}
          frameloop={env.still ? "demand" : visible ? "always" : "never"}
          onCreated={({ gl }) => gl.setClearColor("#FEFDEC")}
        >
          <Rig section={section} stops={stops} mobile={env.mobile} still={env.still} />
        </Canvas>
      )}
    </div>
  );
}
