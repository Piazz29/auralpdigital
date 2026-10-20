// LOGO HANDOFF — preloader → hero → navbar con UN SOLO logo.
//
// Il logo è l'elemento fisso di LogoHandoff.astro (layout), fuori da navbar e
// hero. Ha tre stati, tutti MISURATI dal vivo, mai scritti a mano:
//   1. LOADER  — centrato e grande (box CSS di .handoff-logo, --handoff-w);
//   2. HERO    — il posto [data-logo-slot] nella hero (centrato, ~55%, sopra
//                il titolo);
//   3. NAVBAR  — il logo della navbar [data-logo-target], tenuto in
//                visibility:hidden come bersaglio di misura.
// Ogni frame si leggono i rettangoli e si mette il logo fisso nel punto che
// corrisponde a intro (k) e scroll (p): resize, font caricati, menu che si
// allarga e navbar che si ritira sono quindi sempre in pari. Quando il logo è
// arrivato al bersaglio (identico al pixel) il bersaglio torna visibile e il
// logo fisso si nasconde: il menu continua a funzionare come prima.
//
//   A. PRELOAD (solo al primo ingresso della sessione): contorno che si
//      disegna, poi il pieno che sale dal basso. Tetto HANDOFF.preload.cap.
//   B. REVEAL: la hero si apre con un clip-path circle() centrato sul logo,
//      il logo passa da 1 a 2, le figure entrano dai lati, il titolo arriva
//      per ultimo parola per parola.
//   C. SCROLL: hero in pin per una schermata (scrub). Il testo si ritira nella
//      sfocatura, la foto si apre in due ante lungo il suo vuoto centrale
//      (verso l'esterno, a velocità diverse, avvicinandosi un poco) e dietro
//      sale Il punto; il logo va da 2 a 3, le voci della navbar entrano
//      all'arrivo. Tornando su tutto si riavvolge.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Tutti i tempi in millisecondi; le corse in frazioni del pin (0–1). */
export const HANDOFF = {
  preload: {
    draw: 760, // contorno: stroke-dashoffset da lunghezza piena a 0
    fillDelay: 620, // il pieno parte mentre il contorno finisce
    fill: 880, // il pieno sale dal fondo alla cima del viewBox
    outlineFade: 240, // il contorno si spegne sotto il pieno, in coda al fill
    cap: 1500, // tetto del preloader, anche se il fondale non è pronto
  },
  reveal: {
    coverFade: 200, // il velo del preloader se ne va
    circle: 560, // clip-path circle: dal raggio del logo a circleTo
    circleTo: 165, // % (come in circle(165% at …))
    logo: 560, // logo dallo stato 1 allo stato 2 (insieme al cerchio)
    navFly: 560, // pagine senza hero: dallo stato 1 dritto alla navbar
    figuresDelay: 100, // prima figura
    figuresGap: 120, // seconda figura, dopo la prima
    figures: 700, // durata dell'entrata di ciascuna figura
    figuresShift: 8, // % della propria larghezza da cui scivolano dentro
    badgeDelay: 200,
    headlineDelay: 360, // prima parola del titolo
    wordStagger: 80, // tra una parola e la successiva
    word: 500, // durata di ciascuna parola
    wordRise: 14, // px di salita, senza rimbalzo
    subDelay: 520, // sottotitolo, CTA e hint chiudono insieme al titolo
    ctaDelay: 600,
    copy: 500, // durata di badge, sottotitolo, CTA, hint
  },
  scroll: {
    ease: "power1.inOut", // logo lungo il pin
    doors: [0.06, 0.94], // le ante si aprono in questo tratto del pin
    doorsEase: "power2.inOut",
    doorLeft: -62, // xPercent a fine pin: fuori del tutto anche ingrandite
    doorRight: 66, // (la destra corre un po' di più: niente specchio perfetto)
    doorScale: 1.08, // le ante si avvicinano mentre si aprono
    shade: [0.14, 0.34, 0.7, 0.9], // ombra dei bordi interni: si accende, poi si spegne
    figureLeft: -26, // xPercent a fine pin
    figureRight: 34,
    headlineOut: [0, 0.3], // il testo si ritira presto, prima delle ante
    headlineBlur: 10, // px di sfocatura in uscita
    headlineScale: 0.96,
    headlineDrift: -28, // px verso l'alto
    navIn: [0.7, 0.94], // la pillola della navbar: compare mentre il logo le arriva incontro
    navRise: 10, // px da cui scende
    navScale: 0.94, // e si allarga fino alla sua taglia
    linksIn: [0.8, 1], // voci della navbar: entrano quando il logo arriva
    linksRise: 6, // px
  },
  invert: {
    crossfade: 200, // logo e voci della navbar sul colore inverso
  },
  settleBy: 2700, // tutto fermo entro questo tempo dal primo paint
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
  // Burger d'angolo (solo home) e il burger della navbar a cui arriva.
  const burger = document.querySelector<HTMLButtonElement>("[data-handoff-burger]");
  const navBurger = document.querySelector<HTMLButtonElement>(".pnav-burger");
  // La sezione dopo la hero, presa PRIMA del pin (che avvolge la hero).
  const next = (hero?.nextElementSibling as HTMLElement | null) ?? null;
  const home = !!(hero && slot);

  const outline = logo.querySelector<SVGGElement>("[data-handoff-outline]");
  const outlinePaths = outline ? Array.from(outline.querySelectorAll("path")) : [];
  const fillRect = logo.querySelector<SVGRectElement>("[data-handoff-fill-rect]");
  const vbH = fillRect ? Number(fillRect.getAttribute("height")) : 0;
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

  // Posizione di un elemento della navbar a pillola già entrata: dal layout
  // (offset* ignora i transform), così il bersaglio non ondeggia mentre la
  // pillola scende e si allarga. Se la catena non arriva al dock, il rettangolo vero.
  const dock = document.querySelector<HTMLElement>(".pnav-dock");
  const restingRect = (el: HTMLElement) => {
    let x = 0;
    let y = 0;
    let n: HTMLElement | null = el;
    while (n && n !== dock) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
      if (n && n !== dock) {
        x += n.clientLeft; // bordo della pillola
        y += n.clientTop;
      }
    }
    if (!n || !dock) return el.getBoundingClientRect();
    const d = dock.getBoundingClientRect();
    return { left: d.left + x, top: d.top + y };
  };

  // ---- Stato --------------------------------------------------------------
  const intro = { k: preload ? 0 : 1, r: preload ? 0 : 1 }; // k: logo 1→2 (o 1→3), r: cerchio della hero
  let introActive = preload;
  let st: ScrollTrigger | null = null;
  let docked = false;
  let inverted = false;
  let menuUntil = 0;
  const ease = gsap.parseEase(HANDOFF.scroll.ease);

  function render() {
    // Letture (tutte prima delle scritture).
    const base = baseBox();
    const tRect = target?.getBoundingClientRect();
    const tBox = tRect && tRect.width ? fromRect(tRect) : base;
    const slotBox = slot ? fromRect(slot.getBoundingClientRect()) : null;
    const heroRect = hero && intro.r < 1 ? hero.getBoundingClientRect() : null;
    const p = st ? st.progress : 0;
    const nextRect = next && !reduce && p < 1 ? next.getBoundingClientRect() : null;
    const bRect = home && burger && navBurger ? burger.getBoundingClientRect() : null;
    const nbRect = bRect ? restingRect(navBurger!) : null;

    let box: Box;
    let arrived: boolean;
    if (home && slotBox) {
      if (reduce) {
        // Niente pin né viaggio: il logo sta nel suo posto (che scorre con la
        // hero) e passa alla navbar quando il posto ci finisce sotto.
        box = slotBox;
        arrived = !!tRect && slotBox.y - (slotBox.w * AR) / 2 < tRect.bottom;
      } else {
        box = mix(mix(base, slotBox, intro.k), tBox, ease(p));
        arrived = intro.k >= 1 && p >= 1;
      }
    } else {
      box = mix(base, tBox, intro.k);
      arrived = intro.k >= 1;
    }

    // Colore inverso quando il fondo della sezione dopo passa sotto la navbar.
    inverted = nextIsDark && !!nextRect && !!tRect && nextRect.top <= tRect.bottom;
    const nowDocked = arrived && !inverted;

    // Scritture.
    gsap.set(logo, { x: box.x - base.x, y: box.y - base.y, scale: box.w / base.w });
    if (burger && bRect && nbRect) {
      // Dall'angolo al posto del burger della navbar, sulla stessa curva del logo.
      const bx = gsap.getProperty(burger, "x") as number;
      const by = gsap.getProperty(burger, "y") as number;
      const t = reduce ? 0 : ease(p);
      gsap.set(burger, {
        x: (nbRect.left - (bRect.left - bx)) * t,
        y: (nbRect.top - (bRect.top - by)) * t,
      });
    }
    root.classList.toggle("handoff-nav-on", p > HANDOFF.scroll.navIn[0]);
    root.classList.toggle("handoff-links-on", p > HANDOFF.scroll.linksIn[0]);

    if (hero) {
      if (heroRect) {
        const full = (HANDOFF.reveal.circleTo / 100) * Math.hypot(heroRect.width, heroRect.height) / Math.SQRT2;
        const r = box.w / 2 + (full - box.w / 2) * intro.r;
        hero.style.clipPath = `circle(${r}px at ${box.x - heroRect.left}px ${box.y - heroRect.top}px)`;
      } else if (hero.style.clipPath) hero.style.clipPath = "";
    }

    logo.classList.toggle("is-inverted", inverted);
    root.classList.toggle("handoff-inverted", inverted);
    if (nowDocked !== docked) {
      docked = nowDocked;
      root.classList.toggle("handoff-docked", docked);
      logo.style.visibility = docked ? "hidden" : "visible";
      if (burger) burger.style.visibility = docked ? "hidden" : "visible";
    }
  }

  // Ogni frame finché qualcosa può muovere i bersagli; da fermi basta onUpdate.
  gsap.ticker.add(() => {
    if (introActive || performance.now() < menuUntil || (st && !reduce && st.progress < 1)) render();
  });

  // Menu aperto: il logo fisso (se non è già in navbar) non deve stare sopra
  // al pannello. Mentre la pillola si allarga/stringe, il bersaglio si muove.
  window.addEventListener("pillnav:toggle", (e) => {
    const open = (e as CustomEvent<{ open: boolean }>).detail.open;
    menuUntil = performance.now() + 1600;
    gsap.to(logo, { opacity: open ? 0 : 1, duration: 0.2, overwrite: "auto" });
    // A menu aperto vale il burger vero (diventa la X dentro il pannello).
    if (burger) {
      burger.setAttribute("aria-expanded", String(open));
      burger.style.pointerEvents = open ? "none" : "";
      gsap.to(burger, { opacity: open ? 0 : 1, duration: 0.2, overwrite: "auto" });
    }
  });
  burger?.addEventListener("click", () => navBurger?.click());
  if (burger && navBurger) burger.setAttribute("aria-label", navBurger.getAttribute("aria-label") ?? "Menu");
  window.addEventListener("resize", render);
  document.fonts?.ready.then(render).catch(() => undefined);

  // ---- Hero: stato iniziale e coreografie ----------------------------------
  let reveal: gsap.core.Timeline | null = null;
  if (hero) reveal = buildHero(hero);
  else if (firstVisit) root.classList.add("handoff-hold"); // bersaglio nascosto durante il volo

  // Logo pieno subito se non c'è preloader.
  if (!preload) {
    if (fillRect) fillRect.setAttribute("y", "0");
    if (outline) outline.style.opacity = "0";
  }

  render();
  logo.style.visibility = docked ? "hidden" : "visible";

  if (reduce || !firstVisit) {
    root.classList.remove("apd-loading");
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

  // Il fondale della hero (quando sarà una foto) deve essere decodificato.
  const backdropSrc = hero?.querySelector<HTMLElement>('[data-layer="backdrop"]')?.dataset.src;
  const backdropReady = backdropSrc
    ? new Promise<void>((resolve) => {
        const img = new Image();
        img.src = backdropSrc;
        img.decode().then(resolve, resolve);
      })
    : Promise.resolve();
  const drawn = new Promise<void>((resolve) => pre.eventCallback("onComplete", () => resolve()));
  const capped = new Promise<void>((resolve) =>
    window.setTimeout(resolve, Math.max(0, P.cap - (performance.now() - START))),
  );
  Promise.race([Promise.all([drawn, backdropReady]), capped]).then(startReveal);

  // ---- B. Reveal ----------------------------------------------------------
  function startReveal() {
    pre.progress(1);
    root.classList.remove("apd-loading");
    markSeen();
    const R = HANDOFF.reveal;
    const tl = gsap.timeline({ onComplete: () => ((introActive = false), render()) });
    if (cover) tl.to(cover, { autoAlpha: 0, duration: s(R.coverFade), ease: "none" }, 0);
    tl.to(intro, { k: 1, duration: s(home ? R.logo : R.navFly), ease: "power3.inOut" }, 0);
    if (home) {
      tl.to(intro, { r: 1, duration: s(R.circle), ease: "power3.inOut" }, 0);
      if (reveal) tl.add(reveal.paused(false), 0);
    }
    ScrollTrigger.refresh();
    if (import.meta.env.DEV) {
      const total = performance.now() - START + tl.duration() * 1000;
      if (total > HANDOFF.settleBy) console.warn(`[handoff] fermo a ${Math.round(total)}ms > ${HANDOFF.settleBy}ms`);
    }
  }

  // Hero: entrate (timeline in pausa, la fa partire il reveal) e pin di uscita.
  function buildHero(hero: HTMLElement) {
    const R = HANDOFF.reveal;
    const S = HANDOFF.scroll;
    const q = (sel: string) => hero.querySelector<HTMLElement>(sel);
    const all = (...sels: string[]) => sels.flatMap((sel) => gsap.utils.toArray<HTMLElement>(sel, hero));
    const doorL = q('[data-door="left"]');
    const doorR = q('[data-door="right"]');
    const shades = all(".hero-door-shade");
    const figL = q('[data-layer="figure-left"]');
    const content = q("[data-anim='hero-content']");
    const figR = q('[data-layer="figure-right"]');
    const title = q(".hero-title");
    const lines = gsap.utils.toArray<HTMLElement>("[data-anim^='hero-line-']", hero);
    const badge = all("[data-anim='hero-label']");
    const sub = all("[data-anim='hero-subline']");
    const cta = all("[data-anim='hero-cta']", "[data-anim='hero-hint']");

    if (reduce) {
      gsap.set([...lines, ...badge, ...sub, ...cta], { opacity: 1 });
      ScrollTrigger.create({ trigger: hero, start: "top top", end: "bottom top", onUpdate: render, onRefresh: render });
      return null;
    }

    // Parole del titolo: nascoste prima di accendere le righe (niente flash).
    const words = title ? SplitText.create(title, { type: "words" }).words : [];
    gsap.set(words, { autoAlpha: 0, y: R.wordRise });
    gsap.set(lines, { opacity: 1 });

    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    if (figL)
      tl.from(figL, { autoAlpha: 0, x: () => (-R.figuresShift / 100) * figL.offsetWidth, duration: s(R.figures) }, s(R.figuresDelay));
    if (figR)
      tl.from(figR, { autoAlpha: 0, x: () => (R.figuresShift / 100) * figR.offsetWidth, duration: s(R.figures) }, s(R.figuresDelay + R.figuresGap));
    tl.to(badge, { opacity: 1, duration: s(R.copy) }, s(R.badgeDelay))
      .to(words, { autoAlpha: 1, y: 0, duration: s(R.word), stagger: s(R.wordStagger) }, s(R.headlineDelay))
      .to(sub, { opacity: 1, duration: s(R.copy) }, s(R.subDelay))
      .to(cta, { opacity: 1, duration: s(R.copy) }, s(R.ctaDelay));

    // ---- C. Scroll: pin di una schermata, tutto in scrub ----
    const out = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "+=100%",
        pin: true,
        pinSpacing: false, // Il punto sale dietro le ante: la pagina sotto non si allunga
        scrub: true,
        onUpdate: render,
        onRefresh: render,
      },
    });
    st = out.scrollTrigger ?? null;
    if (figL) out.to(figL, { xPercent: S.figureLeft, duration: 1 }, 0);
    if (figR) out.to(figR, { xPercent: S.figureRight, duration: 1 }, 0);
    // Il testo si ritira nella sfocatura (il posto del logo resta fermo: il
    // logo lo misura). Poi le ante si aprono e dietro c'è Il punto.
    const [h0, h1] = S.headlineOut;
    if (content) out.fromTo(content, { autoAlpha: 1 }, { autoAlpha: 0, ease: "power1.in", duration: h1 - h0 }, h0);
    out.fromTo(
      [...badge, ...(title ? [title] : []), ...sub, ...cta],
      { y: 0, scale: 1, filter: "blur(0px)" },
      { y: S.headlineDrift, scale: S.headlineScale, filter: `blur(${S.headlineBlur}px)`, ease: "power1.in", duration: h1 - h0 },
      h0,
    );
    const [d0, d1] = S.doors;
    if (doorL) out.fromTo(doorL, { xPercent: 0, scale: 1 }, { xPercent: S.doorLeft, scale: S.doorScale, ease: S.doorsEase, duration: d1 - d0 }, d0);
    if (doorR) out.fromTo(doorR, { xPercent: 0, scale: 1 }, { xPercent: S.doorRight, scale: S.doorScale, ease: S.doorsEase, duration: d1 - d0 }, d0);
    const [s0, s1, s2, s3] = S.shade;
    out.fromTo(shades, { opacity: 0 }, { opacity: 1, duration: s1 - s0 }, s0).to(shades, { opacity: 0, duration: s3 - s2 }, s2);
    // Voci della navbar: via variabili CSS sulla radice, non sugli elementi
    // dell'isola React (gli stili inline prima dell'idratazione la rompono).
    // Sulla home la navbar non c'è finché il logo non le arriva incontro: la
    // pillola compare a fine corsa e il logo ci si posa dentro.
    root.style.setProperty("--handoff-nav-rise", `${S.navRise}px`);
    root.style.setProperty("--handoff-nav-scale", `${S.navScale}`);
    out.fromTo(
      root,
      { "--handoff-nav": 0 },
      { "--handoff-nav": 1, ease: "power2.out", duration: S.navIn[1] - S.navIn[0] },
      S.navIn[0],
    );
    root.style.setProperty("--handoff-links-rise", `${S.linksRise}px`);
    out.fromTo(
      root,
      { "--handoff-links": 0 },
      { "--handoff-links": 1, ease: "power2.out", duration: S.linksIn[1] - S.linksIn[0] },
      S.linksIn[0],
    );
    // La timeline copre esattamente il pin (0 → 1).
    if (out.duration() < 1) out.to({}, { duration: 1 - out.duration() });
    return tl;
  }
}
