// LO SCILIAR A CURVE DI LIVELLO — hero del telefono. Il rilievo è vero: le
// quote vengono da un modello digitale del terreno (tile Terrarium di
// Mapzen/AWS, zoom 13, ~26 m per punto) ritagliato attorno al massiccio e
// salvato in public/pics/sciliar-dem.png (R·256 + G = quota in metri).
// Qui diventa una superficie 3D bianca, vista da nord-nord-est (come
// dall'Alpe di Siusi), e lo shader ci disegna sopra le isoipse ogni 50 m
// (maestre ogni 250 m, più scure). La superficie è dello stesso bianco della
// pagina, quindi copre le linee che stanno dietro: si leggono solo quelle
// davanti, come su un disegno a mano.
//
// Entrata: le curve salgono dal fondovalle alla cima. Poi la camera gira
// piano di pochi gradi, avanti e indietro. Disegnato SOLO con la hero in
// vista e la scheda attiva; con reduced motion un fotogramma fermo; senza
// WebGL resta l'immagine ferma di riserva (.htopo-still).

const DEM_URL = "/pics/sciliar-dem.png";
// Il ritaglio: 700×560 pixel a zoom 13 (13,15 m l'uno a 46,5° N), ridotti a
// metà. Monte Pez, la cima, sta qui dentro (coordinate del ritaglio ridotto).
const M_PER_PX = 26.3;
const PEZ = { x: 167, y: 160, q: 2563 };
const MASSIF = { x: 152, y: 136 }; // centro del pianoro
const STEP = 50; // equidistanza delle isoipse, in metri
const EXAG = 1.35; // esagerazione verticale, come nei plastici

const VERT = `
attribute vec3 aPos;
attribute vec2 aUv;
uniform mat4 uMvp;
varying float vH;
varying vec2 vUv;
varying float vDepth;
void main() {
  vH = aPos.y;
  vUv = aUv;
  gl_Position = uMvp * vec4(aPos.x, aPos.y * ${EXAG.toFixed(2)}, aPos.z, 1.0);
  vDepth = gl_Position.w;
}
`;

const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform float uReveal;   // quota fin dove le curve sono già disegnate
uniform vec3 uBg;
uniform vec3 uLine;
uniform vec3 uMajor;
uniform vec2 uFog;       // distanza in cui le curve sfumano nel bianco
uniform vec2 uCenter;    // il massiccio, in coordinate del ritaglio
uniform vec2 uSize;      // ritaglio in metri
uniform vec2 uRad;       // raggio (m) oltre il quale il terreno sfuma
uniform vec2 uHaze;      // quote (m) in cui il fondovalle compare
varying float vH;
varying vec2 vUv;
varying float vDepth;
void main() {
  float q = vH / ${STEP.toFixed(1)};
  float w = fwidth(q);
  float d = abs(fract(q - 0.5) - 0.5) / max(w, 1e-4);
  float line = 1.0 - smoothstep(0.35, 1.25, d);
  // Maestre: ogni 5 curve, appena più spesse e più scure.
  float qm = vH / ${(STEP * 5).toFixed(1)};
  float wm = fwidth(qm);
  float dm = abs(fract(qm - 0.5) - 0.5) / max(wm, 1e-4);
  float major = 1.0 - smoothstep(0.9, 1.9, dm);
  // Le curve compaiono salendo; appena sopra la quota raggiunta, sfumano.
  float shown = 1.0 - smoothstep(uReveal - 30.0, uReveal, vH);
  // Bordo del ritaglio e lontananza: si sciolgono nel bianco, niente rettangolo.
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = smoothstep(0.0, 0.08, e.x) * smoothstep(0.0, 0.08, e.y)
    * (1.0 - smoothstep(uRad.x, uRad.y, length((vUv - uCenter) * uSize)));
  float fog = 1.0 - smoothstep(uFog.x, uFog.y, vDepth);
  // Il fondovalle si perde nella foschia: resta in piedi solo la montagna.
  float haze = smoothstep(uHaze.x, uHaze.y, vH);
  float a = max(line * 0.55, major) * shown * edge * fog * haze;
  vec3 c = mix(uLine, uMajor, major);
  gl_FragColor = vec4(mix(uBg, c, a), 1.0);
}
`;

type Mat = Float32Array;
const persp = (fov: number, asp: number, n: number, f: number): Mat => {
  const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f);
  return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]);
};
const lookAt = (e: number[], c: number[]): Mat => {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
  let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
  let xx = zz, xy = 0, xz = -zx; // up = (0,1,0) × z
  l = Math.hypot(xx, xy, xz); xx /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  return new Float32Array([
    xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
    -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1,
  ]);
};
const mul = (a: Mat, b: Mat): Mat => {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
    o[i * 4 + j] = s;
  }
  return o;
};

const css = (v: string) => {
  const m = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const h = /^#([0-9a-f]{6})$/i.exec(m)?.[1] ?? "000000";
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};

export function mountTopo(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-topo-canvas]");
  const pin = root.querySelector<HTMLElement>("[data-topo-pin]");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false, premultipliedAlpha: false });
  if (!gl || !gl.getExtension("OES_standard_derivatives")) return;
  const uint = gl.getExtension("OES_element_index_uint");

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uMvp = U("uMvp"), uReveal = U("uReveal"), uFog = U("uFog");

  const img = new Image();
  img.decoding = "async";
  img.src = DEM_URL;
  img.onload = () => {
    // Le quote dal PNG: R·256 + G metri.
    let W = img.naturalWidth, H = img.naturalHeight;
    const c2 = document.createElement("canvas");
    c2.width = W; c2.height = H;
    const cx = c2.getContext("2d", { willReadFrequently: true })!;
    cx.drawImage(img, 0, 0);
    const px = cx.getImageData(0, 0, W, H).data;
    // Senza indici a 32 bit (raro) si dimezza la griglia.
    const s = uint ? 1 : 2;
    const gw = Math.floor((W - 1) / s) + 1, gh = Math.floor((H - 1) / s) + 1;
    const pos = new Float32Array(gw * gh * 3), uv = new Float32Array(gw * gh * 2);
    let lo = 1e9;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const k = (j * s * W + i * s) * 4;
      const q = px[k] * 256 + px[k + 1];
      lo = Math.min(lo, q);
      const v = j * gw + i;
      pos[v * 3] = (i * s - W / 2) * M_PER_PX;
      pos[v * 3 + 1] = q;
      pos[v * 3 + 2] = (j * s - H / 2) * M_PER_PX;
      uv[v * 2] = i / (gw - 1);
      uv[v * 2 + 1] = j / (gh - 1);
    }
    const idx = uint ? new Uint32Array((gw - 1) * (gh - 1) * 6) : new Uint16Array((gw - 1) * (gh - 1) * 6);
    let n = 0;
    for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
      const a = j * gw + i, b = a + 1, c = a + gw, d = c + 1;
      idx[n++] = a; idx[n++] = c; idx[n++] = b; idx[n++] = b; idx[n++] = c; idx[n++] = d;
    }
    const buf = (data: BufferSource, attr: string, size: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const l = gl.getAttribLocation(prog, attr);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
    };
    buf(pos, "aPos", 3);
    buf(uv, "aUv", 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST);

    const bg = css("--color-bg");
    gl.uniform3fv(U("uBg"), bg);
    gl.uniform3fv(U("uLine"), css("--color-accent"));
    gl.uniform3fv(U("uMajor"), css("--color-navy"));
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.uniform2f(U("uCenter"), MASSIF.x / W, MASSIF.y / H);
    gl.uniform2f(U("uSize"), W * M_PER_PX, H * M_PER_PX);
    gl.uniform2f(U("uRad"), 3600, 5600);
    gl.uniform2f(U("uHaze"), 1000, 1500);

    // Monte Pez nello spazio della scena (per l'etichetta che lo segue).
    const pez = [(PEZ.x - W / 2) * M_PER_PX, PEZ.q * EXAG, (PEZ.y - H / 2) * M_PER_PX];

    let cw = 0, ch = 0;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cw = canvas.clientWidth; ch = canvas.clientHeight;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    size();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    const top = lo, peak = 2720;
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const k = reduce ? 1 : Math.min(1, t / 2.8);
      const ease = 1 - Math.pow(1 - k, 3);
      // La camera: da nord-nord-est, come dall'Alpe di Siusi, alta quanto
      // basta per leggere il pianoro; gira di ±7° in 24 s.
      const yaw = (25 + (reduce ? 0 : Math.sin(t * 0.26) * 7) + (1 - ease) * -10) * Math.PI / 180;
      const dist = 15500, alt = 10500 + (1 - ease) * 1400;
      const tgt = [(MASSIF.x - W / 2) * M_PER_PX, 2700, (MASSIF.y - H / 2) * M_PER_PX];
      const eye = [tgt[0] + Math.sin(yaw) * dist, alt, tgt[2] - Math.cos(yaw) * dist];
      const mvp = mul(persp(22 * Math.PI / 180, cw / ch, 1000, 40000), lookAt(eye, tgt));
      gl.uniformMatrix4fv(uMvp, false, mvp);
      gl.uniform1f(uReveal, top + (peak + 60 - top) * ease);
      gl.uniform2f(uFog, dist * 0.9, dist * 1.45);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, idx.length, uint ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
      if (pin) {
        const x = mvp[0] * pez[0] + mvp[4] * pez[1] + mvp[8] * pez[2] + mvp[12];
        const y = mvp[1] * pez[0] + mvp[5] * pez[1] + mvp[9] * pez[2] + mvp[13];
        const w = mvp[3] * pez[0] + mvp[7] * pez[1] + mvp[11] * pez[2] + mvp[15];
        pin.style.transform = `translate(${((x / w + 1) / 2 * cw).toFixed(1)}px, ${((1 - y / w) / 2 * ch).toFixed(1)}px)`;
        pin.style.opacity = String(Math.max(0, (k - 0.75) * 4).toFixed(2));
      }
    };

    let raf = 0, visible = true;
    const loop = (now: number) => { raf = 0; draw(now); run(); };
    const run = () => { if (!reduce && !raf && visible && !document.hidden) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? run() : stop(); }).observe(canvas);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
    new ResizeObserver(() => { size(); draw(performance.now()); }).observe(canvas);
    draw(performance.now());
    root.classList.add("is-live");
    run();
  };
}
