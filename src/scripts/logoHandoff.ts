// LOGO HANDOFF — il logo del preloader e dove va a finire.
//
// Il logo è l'elemento fisso di LogoHandoff.astro (layout), fuori da navbar e
// hero. Stati, tutti MISURATI dal vivo, mai scritti a mano:
//   1. LOADER  — centrato e grande (box CSS di .handoff-logo, --handoff-w);
//   2. HERO    — (se la hero ha un posto [data-logo-slot]) il logo cresce,
//                ci si posa e da lì scorre con la hero;
//   3. NAVBAR  — (altrimenti: pagine interne e, ora, anche la home) il logo
//                della navbar [data-logo-target], tenuto in visibility:hidden
//                come bersaglio: all'arrivo torna visibile e il logo fisso si
//                nasconde.
//
//   A. PRELOAD (solo al primo ingresso della sessione): contorno che si
//      disegna, poi il pieno che sale dal basso. Tetto HANDOFF.preload.cap.
//   B. REVEAL: la hero si apre con un clip-path circle() centrato sul logo,
//      la luce si accende, il titolo sale parola per parola dalle maschere. Il cerchio segue il logo mentre va al
//      suo posto (in hero, se c'è, o nella navbar).
//   C. SCROLL: niente pin, la pagina scorre normale. Parallasse: la luce
//      resta indietro e si allarga, il testo sale più veloce e si ritira
//      nella sfocatura.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Tutti i tempi in millisecondi; le corse in frazioni dell'altezza della hero. */
export const HANDOFF = {
  preload: {
    draw: 760, // contorno: stroke-dashoffset da lunghezza piena a 0
    fillDelay: 620, // il pieno parte mentre il contorno finisce
    fill: 880, // il pieno sale dal fondo alla cima del viewBox
    outlineFade: 240, // il contorno si spegne sotto il pieno, in coda al fill
    cap: 1500, // tetto del preloader, anche se le foto non sono pronte
  },
  reveal: {
    coverFade: 200, // il velo del preloader se ne va
    circle: 560, // clip-path circle: dal raggio del logo a circleTo
    circleTo: 165, // % (come in circle(165% at …))
    logo: 560, // logo dallo stato 1 allo stato 2 (insieme al cerchio)
    navFly: 560, // pagine senza hero: dallo stato 1 dritto alla navbar
    light: 1400, // la luce si accende (da scala 1.08 e trasparente)
    stageDelay: 450, // la composizione a destra arriva mentre sale il titolo
    stage: 1500,
    badgeDelay: 200,
    headlineDelay: 300, // prima parola del titolo
    wordStagger: 70, // tra una parola e la successiva
    word: 900, // durata di ciascuna parola: sale dalla sua maschera
    subDelay: 760, // sottotitolo, CTA e hint chiudono insieme al titolo
    ctaDelay: 860,
    copy: 600, // durata di badge, sottotitolo, CTA, hint
  },
  scroll: {
    // Parallasse: di quanto ogni piano resta indietro (+) o va avanti (−)
    // mentre la hero esce (frazioni della sua altezza).
    light: 0.42, // la luce resta indietro (e si allarga appena)
    lightScale: 1.12,
    copy: -0.18, // il testo sale più veloce della pagina
    copyBlur: 8, // px: si ritira nella sfocatura
    copyOut: [0, 0.5], // il testo sfuma in questo tratto
    stage: -0.12, // la composizione sale un filo più veloce della pagina
    stageTurn: 8, // e si raddrizza di questi gradi mentre esce
    tilt: { x: 7, y: 5 }, // inclinazione massima col mouse (gradi)
    hintOut: [0, 0.12],
  },
  invert: {
    crossfade: 200, // logo e voci della navbar sul colore inverso
  },
  settleBy: 4000, // tutto fermo entro questo tempo dal primo paint (titolo e schede comprese)
} as const;

const s = (v: number) => v / 1000;

const root = document.documentElement;
const logo = document.querySelector<HTMLElement>("[data-handoff-logo]");
const cover = document.querySelector<HTMLElement>("[data-handoff-cover]");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Lo script inline in <head> mette .apd-loading solo al primo ingresso.
const firstVisit = root.classList.contains("apd-loading");

const markSeen = () => {
  try {
    sessionStorage.setItem("apd:loaded", "1");
  } catch {
    /* storage non disponibile: il preloader tornerà — non blocca nulla */
  }
};

if (!logo) {
  // Pagina senza handoff (404): niente preloader.
  root.classList.remove("apd-loading");
  markSeen();
} else {
  initHandoff(logo);
}

function initHandoff(logo: HTMLElement) {
  const START = performance.now();
  const hero = document.querySelector<HTMLElement>("[data-handoff-hero]");
  const slot = hero?.querySelector<HTMLElement>("[data-logo-slot]") ?? null;
  const target = document.querySelector<HTMLElement>("[data-logo-target]");
  // La sezione dopo la hero.
  const next = (hero?.nextElementSibling as HTMLElement | null) ?? null;
  const home = !!(hero && slot);

  const outline = logo.querySelector<SVGGElement>("[data-handoff-outline]");
  const outlinePaths = outline ? Array.from(outline.querySelectorAll("path")) : [];
  const fillRect = logo.querySelector<SVGRectElement>("[data-handoff-fill-rect]");
  const AR = parseFloat(getComputedStyle(logo).getPropertyValue("--handoff-ar")) || 119 / 556;
  logo.style.setProperty("--handoff-fade", `${s(HANDOFF.invert.crossfade)}s`);

  const preload = firstVisit && !reduce;

  // ---- Geometria -----------------------------------------------------------
  // Un "box" è il rettangolo del DISEGNO: centro e larghezza. Un <img> SVG
  // (preserveAspectRatio meet) disegna il logo a min(w, h/AR) centrato.
  type Box = { x: number; y: number; w: number };
  const fromRect = (r: DOMRect): Box => ({
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    w: Math.min(r.width, r.height / AR),
  });
  const mix = (a: Box, b: Box, t: number): Box => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    w: a.w + (b.w - a.w) * t,
  });
  // Stato 1: il box CSS del logo. Scala e traslazione agiscono attorno al
  // centro, quindi il centro a riposo è quello attuale meno la traslazione.
  const baseBox = (): Box => {
    const r = logo.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - (gsap.getProperty(logo, "x") as number),
      y: r.top + r.height / 2 - (gsap.getProperty(logo, "y") as number),
      w: logo.offsetWidth,
    };
  };

  const luminance = (css: string) => {
    const [r, g, b, a = 1] = (css.match(/[\d.]+/g) ?? []).map(Number);
    if (a < 0.5 || r === undefined) return 1;
    const f = (c: number) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  // Inversione solo se il fondo della sezione dopo è scuro: su un fondo chiaro
  // logo e voci restano nei loro colori (invertiti sparirebbero).
  const nextIsDark = !!next && luminance(getComputedStyle(next).backgroundColor) < 0.4;

  // ---- Stato --------------------------------------------------------------
  const intro = { k: preload ? 0 : 1, r: preload ? 0 : 1 }; // k: logo 1→2 (o 1→3), r: cerchio della hero
  let introActive = preload;
  let st: ScrollTrigger | null = null;
  let docked = false;
  let inverted = false;
  let menuUntil = 0;

  function render() {
    // Letture (tutte prima delle scritture).
    const base = baseBox();
    const tRect = target?.getBoundingClientRect();
    const tBox = tRect && tRect.width ? fromRect(tRect) : base;
    // Il posto nella hero scorre con la pagina: il logo lo segue.
    const slotBox = slot ? fromRect(slot.getBoundingClientRect()) : null;
    const heroRect = hero && intro.r < 1 ? hero.getBoundingClientRect() : null;
    const p = st ? st.progress : 0;
    const nextRect = next && !reduce && p < 1 ? next.getBoundingClientRect() : null;

    let box: Box;
    let arrived: boolean;
    if (home && slotBox) {
      // Home: dal preloader al posto nella hero, e lì resta (scorre con la
      // hero). La navbar ha già il suo logo piccolo: niente viaggio.
      box = mix(base, slotBox, intro.k);
      arrived = false;
    } else {
      box = mix(base, tBox, intro.k);
      arrived = intro.k >= 1;
    }

    // Colore inverso quando il fondo della sezione dopo passa sotto la navbar.
    inverted = nextIsDark && !!nextRect && !!tRect && nextRect.top <= tRect.bottom;
    const nowDocked = arrived && !inverted;

    // Scritture.
    gsap.set(logo, { x: box.x - base.x, y: box.y - base.y, scale: box.w / base.w });

    if (hero) {
      if (heroRect) {
        const full = (HANDOFF.reveal.circleTo / 100) * Math.hypot(heroRect.width, heroRect.height) / Math.SQRT2;
        const r = box.w / 2 + (full - box.w / 2) * intro.r;
        hero.style.clipPath = `circle(${r}px at ${box.x - heroRect.left}px ${box.y - heroRect.top}px)`;
      } else if (hero.style.clipPath) hero.style.clipPath = "";
    }

    // Spessore 3D: si accende col reveal.
    const depth = home && !reduce ? intro.k : 0;
    logo.style.setProperty("--logo-depth", depth.toFixed(3));

    logo.classList.toggle("is-inverted", inverted);
    root.classList.toggle("handoff-inverted", inverted);
    if (nowDocked !== docked) {
      docked = nowDocked;
      root.classList.toggle("handoff-docked", docked);
      logo.style.visibility = docked ? "hidden" : "visible";
    }
  }

  // Ogni frame finché qualcosa può muovere i bersagli; da fermi basta onUpdate.
  gsap.ticker.add(() => {
    if (introActive || performance.now() < menuUntil) render();
  });

  // Menu aperto: il logo fisso (se non è già in navbar) non deve stare sopra
  // al pannello. Mentre la pillola si allarga/stringe, il bersaglio si muove.
  window.addEventListener("pillnav:toggle", (e) => {
    const open = (e as CustomEvent<{ open: boolean }>).detail.open;
    menuUntil = performance.now() + 1600;
    gsap.to(logo, { opacity: open ? 0 : 1, duration: 0.2, overwrite: "auto" });
  });
  window.addEventListener("resize", render);
  document.fonts?.ready.then(render).catch(() => undefined);

  // ---- Hero: stato iniziale e coreografie ----------------------------------
  let reveal: gsap.core.Timeline | null = null;
  if (hero) reveal = buildHero(hero);
  // Se il logo va in navbar (pagine interne, o home senza posto in hero) il
  // bersaglio resta nascosto durante il volo.
  if (firstVisit && !home) root.classList.add("handoff-hold");

  // Logo pieno subito se non c'è preloader.
  if (!preload) {
    if (fillRect) fillRect.setAttribute("y", "0");
    if (outline) outline.style.opacity = "0";
  }

  render();
  logo.style.visibility = docked ? "hidden" : "visible";

  if (reduce || !firstVisit) {
    root.classList.remove("apd-loading");
    root.classList.add("handoff-settled");
    markSeen();
    if (!home) {
      // Pagina interna senza preloader: il logo è già quello della navbar.
      root.classList.add("handoff-docked");
      logo.style.visibility = "hidden";
    }
    reveal?.play();
    return;
  }

  // ---- A. Preload ---------------------------------------------------------
  const P = HANDOFF.preload;
  const pre = gsap.timeline();
  pre
    .to(outlinePaths, { strokeDashoffset: 0, duration: s(P.draw), ease: "power1.inOut" }, 0)
    .to(fillRect ?? [], { attr: { y: 0 }, duration: s(P.fill), ease: "power2.inOut" }, s(P.fillDelay))
    .to(outline ?? [], { opacity: 0, duration: s(P.outlineFade), ease: "none" }, s(P.fillDelay + P.fill - P.outlineFade));

  // Le foto della hero (le due persone) devono essere decodificate.
  const photos = hero ? Array.from(hero.querySelectorAll<HTMLImageElement>(".hero-person-img")) : [];
  const photosReady = Promise.all(photos.map((img) => img.decode().catch(() => undefined)));
  const drawn = new Promise<void>((resolve) => pre.eventCallback("onComplete", () => resolve()));
  const capped = new Promise<void>((resolve) =>
    window.setTimeout(resolve, Math.max(0, P.cap - (performance.now() - START))),
  );
  Promise.race([Promise.all([drawn, photosReady]), capped]).then(startReveal);

  // ---- B. Reveal ----------------------------------------------------------
  function startReveal() {
    pre.progress(1);
    root.classList.remove("apd-loading");
    markSeen();
    const R = HANDOFF.reveal;
    const tl = gsap.timeline({
      onComplete: () => {
        introActive = false;
        root.classList.add("handoff-settled");
        render();
      },
    });
    if (cover) tl.to(cover, { autoAlpha: 0, duration: s(R.coverFade), ease: "none" }, 0);
    tl.to(intro, { k: 1, duration: s(home ? R.logo : R.navFly), ease: "power3.inOut" }, 0);
    if (hero) {
      // La hero si apre col cerchio che segue il logo (verso il suo posto in
      // hero o verso la navbar) e partono le entrate.
      tl.to(intro, { r: 1, duration: s(R.circle), ease: "power3.inOut" }, 0);
      if (reveal) tl.add(reveal.paused(false), 0);
    }
    ScrollTrigger.refresh();
    if (import.meta.env.DEV) {
      const total = performance.now() - START + tl.duration() * 1000;
      if (total > HANDOFF.settleBy) console.warn(`[handoff] fermo a ${Math.round(total)}ms > ${HANDOFF.settleBy}ms`);
    }
  }

  // Hero: entrate (timeline in pausa, la fa partire il reveal) e parallasse.
  function buildHero(hero: HTMLElement) {
    const R = HANDOFF.reveal;
    const S = HANDOFF.scroll;
    const q = (sel: string) => hero.querySelector<HTMLElement>(sel);
    const all = (...sels: string[]) => sels.flatMap((sel) => gsap.utils.toArray<HTMLElement>(sel, hero));
    const light = q('[data-layer="light"]');
    const content = q("[data-anim='hero-content']");
    const title = q(".hero-title");
    const lines = gsap.utils.toArray<HTMLElement>("[data-anim^='hero-line-']", hero);
    const badge = all("[data-anim='hero-label']");
    const sub = all("[data-anim='hero-subline']");
    const cta = all("[data-anim='hero-cta']");
    const hint = all("[data-anim='hero-hint']");
    const stage = q("[data-hero-stage]");
    const tiltEl = q("[data-hero-tilt]");

    // Ridisegna il logo fisso finché la hero è in vista (resize, menu).
    st = ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      onUpdate: render,
      onRefresh: render,
    });

    if (reduce) {
      gsap.set([...lines, ...badge, ...sub, ...cta, ...hint], { opacity: 1 });
      return null;
    }
    // Prima del reveal: la composizione è nascosta.
    if (stage) gsap.set(stage, { autoAlpha: 0 });

    // Parole del titolo: ognuna sale dalla sua maschera (una fessura), con un
    // filo di sfocatura che si scioglie. Nascoste prima di accendere le righe.
    const words = title ? SplitText.create(title, { type: "words", mask: "words" }).words : [];
    for (const w of words as HTMLElement[]) {
      w.parentElement?.classList.add("hw-mask");
      if (w.closest("em")) w.classList.add("hw-em"); // sfumatura blu (vedi CSS)
    }
    gsap.set(words, { yPercent: 105, filter: "blur(6px)" });
    gsap.set(lines, { opacity: 1 });

    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    if (light) tl.fromTo(light, { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: s(R.light), ease: "power2.out" }, 0);
    tl.to(badge, { opacity: 1, duration: s(R.copy) }, s(R.badgeDelay))
      .to(words, { yPercent: 0, filter: "blur(0px)", duration: s(R.word), ease: "expo.out", stagger: s(R.wordStagger) }, s(R.headlineDelay))
      .to(sub, { opacity: 1, duration: s(R.copy) }, s(R.subDelay))
      .to([...cta, ...hint], { opacity: 1, duration: s(R.copy) }, s(R.ctaDelay));
    // La composizione arriva da destra e da più lontano, girata di più, e
    // si posa nella sua prospettiva.
    if (stage)
      tl.fromTo(
        stage,
        { autoAlpha: 0, x: 60, rotationY: -14, filter: "blur(12px)" },
        { autoAlpha: 1, x: 0, rotationY: 0, filter: "blur(0px)", duration: s(R.stage), ease: "expo.out" },
        s(R.stageDelay),
      );

    // ---- C. Scroll: parallasse (scrub, niente pin). Solo transform, opacità
    // e una sfocatura breve sul testo mentre esce.
    const out = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true, invalidateOnRefresh: true },
    });
    const drift = (k: number) => () => hero.offsetHeight * k;
    if (light) out.fromTo(light, { y: 0, scale: 1 }, { y: drift(S.light), scale: S.lightScale, duration: 1, immediateRender: false }, 0);
    if (content) {
      out.fromTo(content, { y: 0 }, { y: drift(S.copy), duration: 1 }, 0);
      const [c0, c1] = S.copyOut;
      out.fromTo(
        content,
        { autoAlpha: 1, filter: "blur(0px)" },
        { autoAlpha: 0, filter: `blur(${S.copyBlur}px)`, ease: "power1.in", duration: c1 - c0 },
        c0,
      );
    }
    const [h0, h1] = S.hintOut;
    out.fromTo(hint, { autoAlpha: 1 }, { autoAlpha: 0, immediateRender: false, duration: h1 - h0 }, h0);
    // La composizione sale un filo più veloce e si raddrizza mentre esce.
    if (stage)
      out.fromTo(stage, { y: 0, rotationY: 0 }, { y: drift(S.stage), rotationY: S.stageTurn, duration: 1, immediateRender: false }, 0);

    // Mouse (puntatori fini): la composizione si inclina verso il cursore.
    if (tiltEl && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const o = { duration: 1.2, ease: "power3.out" };
      const rotY = gsap.quickTo(tiltEl, "rotationY", o);
      const rotX = gsap.quickTo(tiltEl, "rotationX", o);
      window.addEventListener("pointermove", (e) => {
        if (st && st.progress >= 1) return;
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        rotY(nx * 2 * S.tilt.x);
        rotX(-ny * 2 * S.tilt.y);
      });
    }
    return tl;
  }
}
