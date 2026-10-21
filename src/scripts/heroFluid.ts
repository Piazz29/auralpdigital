// LUCE LIQUIDA della hero — uno shader WebGL a tutto schermo: su bianco carta
// grandi macchie di luce blu (Shadow / periwinkle) e arancio (Ember / ambra)
// girano lente su orbite diverse, in uno spazio che ondeggia come un fluido.
// Il centro resta chiaro (lì c'è il titolo) e in basso tutto si scioglie nel
// bianco. Il mouse tira appena verso di sé un alone blu.
//
// Costo: disegnato a mezza risoluzione (la scena è morbida, nessuno se ne
// accorge) e SOLO quando la hero è in vista e la scheda è attiva. Con reduced
// motion: un fotogramma fermo. Senza WebGL: resta il fondo CSS (.hero-light).

const canvas = document.querySelector<HTMLCanvasElement>("[data-hero-fluid]");

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;   // 0-1, origine in basso a sinistra
uniform float uPull;   // 0-1: quanto pesa il mouse (sale quando si muove)

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 1.9 + 11.7; a *= 0.42; }
  return v;
}

// Una macchia di luce morbida (gaussiana) attorno a c, raggio r.
float blob(vec2 w, vec2 c, float r) { vec2 d = w - c; return exp(-dot(d, d) / (r * r)); }

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  float t = uTime * 0.16;

  // "Liquido": lo spazio ondeggia (rumore lento), le macchie si deformano.
  vec2 warp = vec2(fbm(p * 0.9 + vec2(0.0, t * 0.4)), fbm(p * 0.9 + vec2(4.1, -t * 0.4))) - 0.45;
  vec2 w = p + warp * 0.55;

  // Macchie: blu che dominano in alto e sui lati, arancio più piccole in
  // basso a destra. I centri girano lenti su orbite diverse.
  float b1 = blob(w, vec2(asp * (0.12 + 0.06 * sin(t * 0.9)), 0.86 + 0.06 * cos(t * 0.7)), 0.5);
  float b2 = blob(w, vec2(asp * (0.92 + 0.05 * cos(t * 0.8)), 0.88 + 0.05 * sin(t * 1.1)), 0.42);
  float b3 = blob(w, vec2(asp * (0.06 + 0.05 * cos(t * 0.6)), 0.3 + 0.08 * sin(t * 0.8)), 0.36);
  float b4 = blob(w, vec2(asp * (0.5 + 0.12 * sin(t * 0.5)), 1.08), 0.34);
  float o1 = blob(w, vec2(asp * (0.86 + 0.05 * sin(t * 0.7)), 0.34 + 0.07 * cos(t * 0.9)), 0.34);
  float o2 = blob(w, vec2(asp * (0.74 + 0.06 * cos(t * 1.2)), 0.16), 0.2);

  // Mouse: un alone periwinkle che segue il cursore.
  float glow = blob(vec2(uv.x * asp, uv.y), vec2(uMouse.x * asp, uMouse.y), 0.3) * uPull;

  // Dietro il titolo il colore si apre (resta leggibile).
  vec2 c = vec2((uv.x - 0.5) * asp, (uv.y - 0.55) * 1.3);
  float field = 1.0 - 0.62 * exp(-dot(c, c) * 2.6);

  float blue = clamp(b1 * 0.95 + b2 * 0.8 + b4 * 0.55, 0.0, 1.0) * field;
  float peri = clamp(b3 * 0.85 + b4 * 0.35 + glow * 0.45, 0.0, 1.0) * field;
  float amb = clamp(o1 * 0.8, 0.0, 1.0) * field;
  float emb = clamp(o2 * 0.7, 0.0, 1.0) * field;

  vec3 col = vec3(1.0);
  col = mix(col, vec3(0.518, 0.635, 0.961), max(peri, blue) * 0.85);
  col = mix(col, vec3(0.239, 0.396, 0.761), pow(blue, 1.6) * 0.7);
  col = mix(col, vec3(0.949, 0.569, 0.247), amb * 0.62);
  col = mix(col, vec3(0.847, 0.251, 0.008), pow(emb, 1.4) * 0.35);

  // In basso tutto si scioglie nel bianco (sotto c'è Il punto).
  col = mix(vec3(1.0), col, smoothstep(0.0, 0.3, uv.y));

  // Dither: niente scalini nelle sfumature.
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

function start(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) return;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (import.meta.env.DEV) console.warn("[heroFluid]", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "uRes");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uMouse = gl.getUniformLocation(prog, "uMouse");
  const uPull = gl.getUniformLocation(prog, "uPull");

  // Mezza risoluzione: la scena è tutta sfumature.
  const SCALE = 0.5;
  const resize = () => {
    const w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
    const h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
  };
  resize();

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Mouse: posizione inseguita con un ritardo morbido; l'alone si accende
  // quando il cursore si muove e si spegne piano quando sta fermo.
  const mouse = { x: 0.5, y: 0.55, tx: 0.5, ty: 0.55, pull: 0, tpull: 0 };
  let lastMove = 0;
  if (!reduce && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
      mouse.tpull = 1;
      lastMove = performance.now();
    });
  }

  const T0 = performance.now() - 40000 * Math.random(); // ogni visita una forma diversa
  let raf = 0;
  let visible = true;
  const draw = (now: number) => {
    if (now - lastMove > 1400) mouse.tpull = 0;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    mouse.pull += (mouse.tpull - mouse.pull) * 0.03;
    gl.uniform1f(uTime, (now - T0) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uPull, mouse.pull);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = (now: number) => {
    draw(now);
    raf = requestAnimationFrame(loop);
  };
  const run = () => {
    if (reduce || raf || !visible || document.hidden) return;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  draw(performance.now());
  canvas.classList.add("is-ready"); // il canvas copre il fondo CSS solo quando disegna

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) run();
    else stop();
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
  window.addEventListener("resize", () => {
    resize();
    if (!raf) draw(performance.now());
  });
  run();
}

if (canvas) start(canvas);
