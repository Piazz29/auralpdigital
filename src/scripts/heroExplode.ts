// LA VISTA ESPLOSA della hero (HomeHero.astro). Un sito d'esempio sta su un
// piano in assonometria, fatto di cinque strati sovrapposti (dal basso:
// codice, struttura, design, contenuti, interazione). Entra montato, come un
// sito qualunque; un taglio lo attraversa e gli strati si staccano a molla,
// dall'alto in basso. Poi si accendono a turno, dal codice in su: lo strato
// acceso apre il "cassetto" (quelli sopra salgono un po') e la sua etichetta
// si accende. Al passaggio del mouse (sullo strato o sull'etichetta) comanda
// il mouse: quelli sopra si alzano di più, per scoprire bene lo strato sotto
// il cursore (che resta fermo). Scorrendo, il sito si richiude.
//
// Le etichette e le linee (richiami e linee di montaggio sugli spigoli)
// stanno in piano, davanti alla scena 3D: a ogni frame si misura dove sono
// finiti gli spigoli degli strati (quattro punti invisibili per strato) e
// le si disegna lì. Solo transform sugli strati; niente layout.
// Con reduced motion: già aperto e fermo.

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.querySelector<HTMLElement>("[data-hx]");

const HOLD = 150; // il sito montato, nitido, prima del taglio
const CUT = 700; // il taglio che lo attraversa
const OPEN = 1400; // apertura di uno strato
const STAGGER = 120; // tra uno strato e l'altro (dall'alto)
const TOUR = 2600; // ogni strato acceso a turno
const IDLE = 3000; // dopo il mouse, il giro riparte
const SVGNS = "http://www.w3.org/2000/svg";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
// Molla smorzata: arriva a 1 con un piccolo rimbalzo.
const spring = (t: number) => (t >= 1 ? 1 : 1 - Math.exp(-6 * t) * Math.cos(7 * t));

function setup(root: HTMLElement) {
  const iso = root.querySelector<HTMLElement>("[data-hx-iso]")!;
  const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-hx-ly]"));
  const labs = Array.from(root.querySelectorAll<HTMLElement>("[data-hx-lab]"));
  const svg = root.querySelector<SVGSVGElement>("[data-hx-leads]")!;
  const scan = root.querySelector<HTMLElement>("[data-hx-scan]");
  const N = layers.length;

  // Quattro punti per strato sugli spigoli: 0 dietro-sinistra, 1 dietro-
  // destra, 2 avanti-destra, 3 avanti-sinistra (nel piano del sito).
  const pts = layers.map((ly) =>
    [0, 1, 2, 3].map((c) => {
      const s = document.createElement("span");
      s.className = "hx-pt";
      s.dataset.c = String(c);
      ly.append(s);
      return s;
    }),
  );

  // Linee: montaggio (spigoli sinistro, davanti e destro, da strato a
  // strato), richiami (dallo spigolo destro all'etichetta) e i loro punti.
  const el = <K extends keyof SVGElementTagNameMap>(tag: K, cls: string) => {
    const n = document.createElementNS(SVGNS, tag);
    n.setAttribute("class", cls);
    svg.append(n);
    return n;
  };
  const rails = [0, 3, 2].map(() => el("polyline", "hx-rail"));
  const leads = layers.map(() => el("polyline", "hx-lead"));
  const dots = layers.map(() => el("circle", "hx-dot"));
  dots.forEach((d) => d.setAttribute("r", "2.6"));

  const open = new Array(N).fill(reduce ? 1 : 0); // apertura di ogni strato
  const lift = new Array(N).fill(0); // cassetto: spinta in più (px)
  const liftTo = new Array(N).fill(0);
  let collapse = 1; // 1 aperto, 0 richiuso dallo scroll
  let active = -1;
  let hovering = false;
  let idleAt = 0;
  let toured = false;

  let visible = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) kick();
  }).observe(root);
  const awake = () => visible && !document.hidden;

  // `open`: col mouse il cassetto si apre di più che nel giro.
  const setActive = (k: number, wide = false) => {
    active = k;
    layers.forEach((ly, i) => ly.classList.toggle("is-on", i === k));
    labs.forEach((l, i) => l.classList.toggle("is-on", i === k));
    leads.forEach((l, i) => l.classList.toggle("is-on", i === k));
    dots.forEach((d, i) => d.classList.toggle("is-on", i === k));
    for (let i = 0; i < N; i++) liftTo[i] = k < 0 ? 0 : i > k ? (wide ? 1.1 : 0.36) : i === k ? (wide ? 0 : 0.12) : 0;
  };

  // ---- Frame: posa gli strati, poi misura e disegna linee ed etichette.
  let raf = 0;
  const frame = (now: number) => {
    raf = 0;
    const w = iso.offsetWidth;
    const gap = w * 0.15;
    const thick = w * 0.011;

    if (!reduce) {
      const target = 1 - clamp(window.scrollY / (window.innerHeight * 0.7)) * 0.9;
      collapse += (target - collapse) * 0.14;
    }
    for (let k = 0; k < N; k++) {
      lift[k] += (liftTo[k] - lift[k]) * 0.1;
      const float = reduce ? 0 : Math.sin(now / 1500 + k * 0.9) * gap * 0.035 * open[k];
      const z = k * thick + (k * open[k] * gap + lift[k] * gap + float) * collapse;
      layers[k].style.transform = `translateZ(${z.toFixed(2)}px)`;
    }
    const e = (open.reduce((a, b) => a + b, 0) / N) * collapse;
    root.style.setProperty("--e", e.toFixed(3));

    // Misure (in coordinate della scena: la scena può essere scalata).
    const rr = root.getBoundingClientRect();
    const sx = root.offsetWidth / rr.width || 1;
    const P = pts.map((row) =>
      row.map((p) => {
        const r = p.getBoundingClientRect();
        return [(r.left - rr.left) * sx, (r.top - rr.top) * sx] as const;
      }),
    );
    rails.forEach((pl, i) => {
      const c = [0, 3, 2][i];
      pl.setAttribute("points", P.map((row) => row[c].map((v) => v.toFixed(1)).join(",")).join(" "));
    });

    // Etichette: in colonna a destra dello spigolo più a destra, alla quota
    // del loro strato, mai una sopra l'altra.
    const colX = Math.min(Math.max(...P.map((row) => row[2][0])) + 32, root.offsetWidth - 188);
    let prevY = -Infinity;
    for (let k = N - 1; k >= 0; k--) {
      const [ax, ay] = P[k][2];
      const y = Math.max(ay, prevY + 40);
      prevY = y;
      labs[k].style.transform = `translate3d(${colX.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      leads[k].setAttribute("points", `${ax.toFixed(1)},${ay.toFixed(1)} ${(colX - 18).toFixed(1)},${y.toFixed(1)} ${(colX - 8).toFixed(1)},${y.toFixed(1)}`);
      dots[k].setAttribute("cx", ax.toFixed(1));
      dots[k].setAttribute("cy", ay.toFixed(1));
      const shown = open[k] * collapse > 0.55;
      labs[k].classList.toggle("is-in", shown);
      leads[k].classList.toggle("is-in", shown);
      dots[k].classList.toggle("is-in", shown);
    }
    svg.classList.toggle("is-open", e > 0.35);

    if (!reduce && awake()) kick();
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  // ---- Mouse: lo strato (o la sua etichetta) sotto il puntatore comanda.
  function leave() {
    if (!hovering) return;
    hovering = false;
    idleAt = performance.now();
    setActive(active);
  }
  // Lo strato sotto il cursore è quello che si vede: gli strati pieni
  // rispondono su tutta la superficie, quelli di vetro solo dove hanno
  // qualcosa (CSS). Lo strato puntato sta fermo e si alzano quelli sopra,
  // così resta sotto il cursore. Un attimo di attesa evita gli sfarfallii
  // passando da uno strato all'altro.
  let want = -1;
  let wait = 0;
  const point = (k: number) => {
    // Già fatto? (Se la scena si stava ancora aprendo, si riprova.)
    if (k === want && (k < 0 || (hovering && active === k))) return;
    want = k;
    window.clearTimeout(wait);
    wait = window.setTimeout(() => {
      if (want < 0) leave();
      else if (open[want] >= 0.9) {
        hovering = true;
        setActive(want, true);
      }
    }, k < 0 ? 220 : 90);
  };
  root.addEventListener("pointerover", (ev) => {
    const t = ev.target as Element;
    const lab = t.closest<HTMLElement>("[data-hx-lab]");
    const ly = t.closest<HTMLElement>("[data-hx-ly]");
    point(lab ? Number(lab.dataset.hxLab) : ly ? Number(ly.dataset.hxLy) : -1);
  });
  root.addEventListener("pointerleave", () => point(-1));

  if (reduce) {
    const draw = () => requestAnimationFrame(frame);
    window.addEventListener("resize", draw);
    window.addEventListener("scroll", draw, { passive: true });
    draw();
    return;
  }

  // ---- Giro: uno strato alla volta, dal codice in su.
  const tour = () => {
    if (toured) return;
    toured = true;
    setActive(0);
    window.setInterval(() => {
      if (!awake() || hovering || performance.now() - idleAt < IDLE) return;
      setActive((active + 1) % N);
    }, TOUR);
  };

  // ---- Entrata: montato, taglio, apertura a molla dall'alto.
  const explode = () => {
    const t0 = performance.now();
    const step = (now: number) => {
      let done = true;
      for (let k = 0; k < N; k++) {
        const t = (now - t0 - (N - 1 - k) * STAGGER) / OPEN;
        open[k] = t <= 0 ? 0 : spring(t);
        if (t < 1) done = false;
      }
      kick();
      if (done) window.setTimeout(tour, 700);
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const start = async () => {
    kick();
    await new Promise((r) => setTimeout(r, HOLD));
    if (scan) {
      const w = iso.offsetWidth;
      scan.style.transform = `translateZ(${((N - 1) * w * 0.011 + 2).toFixed(1)}px)`;
      scan.classList.add("is-cut");
      await new Promise((r) => setTimeout(r, CUT * 0.6));
    }
    explode();
  };

  // Via appena la hero si è posata (la scena è già entrata, nitida); al
  // massimo dopo 6 s, se l'handoff non arriva.
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    start();
  };
  const html = document.documentElement;
  if (html.classList.contains("handoff-settled")) go();
  else {
    const mo = new MutationObserver(() => {
      if (html.classList.contains("handoff-settled")) {
        mo.disconnect();
        go();
      }
    });
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });
    window.setTimeout(go, 6000);
  }
  kick();
}

if (root) setup(root);
