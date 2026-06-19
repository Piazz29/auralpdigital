import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, Draggable, SplitText);

// Su mobile la barra URL che appare/scompare cambia l'altezza del viewport e
// scatena un refresh di ScrollTrigger (ricalcolo di tutti i pin) in pieno
// scroll → scatto. Ignorando quel resize lo scroll resta fluido.
ScrollTrigger.config({ ignoreMobileResize: true });

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// ---------- Lenis smooth scroll ----------
const lenis = new Lenis({
  // Durata più lunga + easing expo con coda lunga: quando si smette di
  // scrollare la pagina DECELERA dolcemente fino a fermarsi, invece di
  // bloccarsi di colpo. Vale anche dentro le sezioni pinnate, dove lo scroll
  // continua ad avanzare la timeline mentre rallenta → la scena "si posa"
  // invece di scattare allo stop.
  duration: 1.5,
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ---------- Anchor links → scroll fluido via Lenis ----------
// Senza intercettazione i link #ancora saltano di colpo; qui usano la stessa
// easing dello smooth scroll, così la navigazione sembra un'unica gestualità.
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (!href || href === "#") return;
    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;
    e.preventDefault();
    // Salto dalla hero verso i progetti: deve essere diretto, non un lento
    // crawl che attraversa (e "accende" in modo brutto) la sezione servizi
    // pinnata. Scroll breve e bloccato → arriva netto all'inizio dei progetti,
    // l'offset resta corretto perché il pin-spacer è già nel DOM.
    const isHeroToProjects = href === "#projects" && !!a.closest(".hero-section");
    if (isHeroToProjects) {
      lenis.scrollTo(target, { duration: 0.7, lock: true });
    } else {
      lenis.scrollTo(target, { duration: 1.5 });
    }
  });
});

// ---------- Scroll progress bar ----------
const scrollFill = document.getElementById("scroll-fill");
if (scrollFill) {
  // Aggiorna via transform (solo compositing) invece di `height` (layout +
  // paint a ogni frame): la barra resta fluida anche durante scroll rapidi.
  lenis.on("scroll", ({ scroll, limit }: { scroll: number; limit: number }) => {
    const pct = limit > 0 ? scroll / limit : 0;
    scrollFill.style.transform = `scaleY(${pct})`;
  });
}

// ---------- Navbar blur fade-in on scroll ----------
// blur e opacity crescono insieme sui primi 150px di scroll:
// zero blur → blur(20px), opacity 0 → 1. Nessuno stacco.
const navBluBg = document.querySelector<HTMLElement>(".nav-blur-bg");
if (navBluBg) {
  const s = navBluBg.style as CSSStyleDeclaration & { webkitBackdropFilter: string };
  // Riscrivere il backdrop-filter a OGNI frame di scroll è costosissimo (il
  // blur viene ri-rasterizzato). Il valore però cambia solo nei primi 150px:
  // quantizziamo `t` e aggiorniamo lo stile solo quando cambia davvero, così
  // oltre i 150px (cioè per quasi tutta la pagina) non tocchiamo più lo stile.
  let lastNavT = -1;
  lenis.on("scroll", ({ scroll }: { scroll: number }) => {
    const t = Math.min(1, scroll / 150);
    const q = Math.round(t * 40) / 40; // 40 step impercettibili su 150px
    if (q === lastNavT) return;
    lastNavT = q;
    const blurVal = `blur(${(q * 20).toFixed(2)}px) saturate(160%)`;
    s.backdropFilter = blurVal;
    s.webkitBackdropFilter = blurVal;
    s.opacity = String(q);
  });
}

// ---------- Custom cursor ----------
const dot = document.getElementById("cursor-dot");
const ring = document.getElementById("cursor-ring");

if (dot && ring && window.matchMedia("(min-width: 769px)").matches) {
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  // Higher = the ring catches up to the cursor faster (less lag).
  const RING_EASE = 0.35;

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
  });

  const animateRing = () => {
    ringX += (mouseX - ringX) * RING_EASE;
    ringY += (mouseY - ringY) * RING_EASE;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    requestAnimationFrame(animateRing);
  };
  animateRing();

  document.querySelectorAll("a, button, .menu-link").forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("is-hover"));
    el.addEventListener("mouseleave", () => ring.classList.remove("is-hover"));
  });
}

// ---------- Mobile menu ----------
// Apertura: il pannello si rivela con il mask radiale dal punto del burger,
// poi le voci si "disegnano" una a una con un wipe orizzontale (clip-path) —
// stesso linguaggio del color-wipe sull'hover — gli indici sfumano in sequenza
// e la colonna contatti entra da destra. In chiusura tutto si ritira a ritroso.
const burgerButton = document.getElementById("burger-menu");
const mobileMenu = document.getElementById("mobile-menu");

if (burgerButton && mobileMenu) {
  const menuWords = mobileMenu.querySelectorAll<HTMLElement>(".menu-word");
  const menuLabel = mobileMenu.querySelector<HTMLElement>(".menu-vertical-label");
  const menuContact = mobileMenu.querySelector<HTMLElement>('[data-menu="contact"]');

  let menuOpen = false;
  let menuAnimating = false;

  // Stato chiuso: pannello collassato, parole "non disegnate" (clippate a
  // sinistra), indici e colonna contatti nascosti.
  const setClosedState = () => {
    gsap.set(mobileMenu, { "--menu-r": "0%" });
    gsap.set(menuWords, { clipPath: "inset(0% 100% 0% 0%)" });
    gsap.set([menuLabel, menuContact], { autoAlpha: 0, y: 16 });
  };
  setClosedState();

  const openMenu = () => {
    if (menuAnimating) return;
    menuAnimating = true;
    menuOpen = true;
    burgerButton.classList.add("is-open");
    mobileMenu.style.pointerEvents = "auto";

    const tl = gsap.timeline({
      onComplete: () => {
        menuAnimating = false;
        // Libera le parole dal clip: così il nudge translateX dell'hover non
        // viene tagliato dopo l'apertura.
        gsap.set(menuWords, { clipPath: "none" });
      },
    });

    tl.to(mobileMenu, { "--menu-r": "150%", duration: 0.9, ease: "power3.inOut" }, 0)
      .to(menuLabel, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.15)
      .to(
        menuWords,
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
        },
        0.25
      )
      .to(
        menuContact,
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" },
        0.45
      );
  };

  const closeMenu = () => {
    if (menuAnimating) return;
    menuAnimating = true;
    menuOpen = false;
    burgerButton.classList.remove("is-open");

    // Riapplica il clip (le parole erano "libere") per poterle far uscire.
    gsap.set(menuWords, { clipPath: "inset(0% 0% 0% 0%)" });

    const tl = gsap.timeline({
      onComplete: () => {
        menuAnimating = false;
        mobileMenu.style.pointerEvents = "none";
        setClosedState();
      },
    });

    tl.to(menuContact, { autoAlpha: 0, duration: 0.25, ease: "power2.in" }, 0)
      .to(
        menuWords,
        {
          clipPath: "inset(0% 0% 0% 100%)",
          duration: 0.4,
          ease: "power3.in",
          stagger: { each: 0.05, from: "end" },
        },
        0.05
      )
      .to(mobileMenu, { "--menu-r": "0%", duration: 0.7, ease: "power3.inOut" }, 0.2);
  };

  burgerButton.addEventListener("click", () => {
    if (menuAnimating) return;
    menuOpen ? closeMenu() : openMenu();
  });

  // Chiudi il menu quando si clicca su un link
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

// ---------- Navbar entrance ----------
gsap.fromTo(
  "[data-anim='nav']",
  { opacity: 0, y: -10 },
  { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.4 }
);

// ---------- Navbar — inversione sulle superfici scure ----------
// Mentre la nav fissa attraversa la banda navy di Cosa Facciamo o il
// pannello CTA scuro, un toggle aggiunge .nav-on-dark: logo bianco, burger
// e pill invertiti. È contrasto funzionale, quindi attivo anche con
// reduced motion.
const navEl = document.querySelector<HTMLElement>(".staggered-menu-wrapper");
if (navEl) {
  // La banda navy di Cosa Facciamo è gestita a parte (vedi sotto), perché il
  // suo pin sposta tutto ciò che segue e l'inversione va ancorata a chi-siamo.
  // In homepage la sezione contatti è chiara con una CARD scura al centro
  // (ContainerScroll): l'inversione va ancorata alla card. In /chi-siamo la
  // CTA finale è ora chiara (niente card), quindi NESSUNA zona scura: il logo
  // bianco su fondo chiaro sparirebbe.
  // La card dev'essere DAVVERO dietro la navbar (in cima al viewport) perché il
  // logo bianco abbia senso: con "top 70" si accendeva quando la card era ancora
  // in basso e l'area sotto la navbar era chiara → logo bianco su chiaro,
  // invisibile. Ora si accende solo quando il bordo SUPERIORE della card tocca il
  // top del viewport e si spegne quando il suo bordo INFERIORE lo supera: nella
  // sezione form la navbar resta scura/leggibile finché lo sfondo lì è chiaro.
  const darkZones: { sel: string; start: string; end: string }[] =
    document.querySelector(".cscroll-card")
      ? [{ sel: ".cscroll-card", start: "top top", end: "bottom top" }]
      : [];
  darkZones.forEach(({ sel, start, end }) => {
    if (!document.querySelector(sel)) return;
    ScrollTrigger.create({
      trigger: sel,
      start,
      end,
      toggleClass: { targets: navEl, className: "is-on-dark" },
    });
  });
}

// ---------- Hero video ----------
const heroVideo = document.querySelector<HTMLVideoElement>(
  "[data-anim='hero-video']"
);
if (heroVideo) {
  const BASE_RATE = 1;
  const MIN_RATE = 0.08;
  // Slow-down zone: last 2.5s of video time. As currentTime enters this window,
  // ease playbackRate from BASE_RATE down to MIN_RATE.
  const SLOWDOWN_WINDOW = 2.5;

  heroVideo.playbackRate = BASE_RATE;

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 2.2);

  const tickPlaybackRate = () => {
    if (heroVideo.paused || heroVideo.ended) return;
    const d = heroVideo.duration;
    if (Number.isFinite(d) && d > 0) {
      const remaining = d - heroVideo.currentTime;
      if (remaining <= SLOWDOWN_WINDOW) {
        const t = 1 - remaining / SLOWDOWN_WINDOW; // 0 → 1 across the window
        const eased = easeOut(Math.min(1, Math.max(0, t)));
        heroVideo.playbackRate = BASE_RATE - (BASE_RATE - MIN_RATE) * eased;
      } else {
        heroVideo.playbackRate = BASE_RATE;
      }
    }
    requestAnimationFrame(tickPlaybackRate);
  };
  requestAnimationFrame(tickPlaybackRate);

  // Freeze on last frame
  heroVideo.addEventListener("ended", () => {
    heroVideo.pause();
    if (Number.isFinite(heroVideo.duration)) {
      heroVideo.currentTime = heroVideo.duration;
    }
  });

  // Fade-in only — no scroll-driven fade-out, so the frozen last frame stays
  // fully visible as the user scrolls past the hero
  gsap.fromTo(
    heroVideo,
    { opacity: 0 },
    { opacity: 1, duration: 1.2, ease: "power2.out", delay: 0.2 }
  );

  // ---------- Hero zoom on scroll ----------
  // Leggero zoom-in del video mentre si scrolla via dalla hero. È puramente
  // visivo (transform: scale) e NON tocca la riproduzione: il video prosegue
  // fino all'ultimo frame.
  if (!reduceMotion) {
    gsap.fromTo(
      heroVideo,
      { scale: 1 },
      {
        scale: 1.12,
        ease: "none",
        transformOrigin: "center center",
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "bottom top",
          scrub: 0.8, // lag morbido, in coppia con Lenis
        },
      }
    );
  }
}

// ---------- Hero text entrance ----------
// Solo sulla homepage: la pagina /chi-siamo ha la propria hero (vedi sotto).
if (document.querySelector(".hero-section")) {
  const heroEls: { sel: string; delay: number; y?: number }[] = [
    { sel: "[data-anim='hero-label']", delay: 0.5, y: 16 },
    { sel: "[data-anim='hero-line-1']", delay: 0.65, y: 30 },
    { sel: "[data-anim='hero-line-2']", delay: 0.78, y: 30 },
    { sel: "[data-anim='hero-line-3']", delay: 0.91, y: 30 },
    { sel: "[data-anim='hero-subline']", delay: 1.05, y: 16 },
    { sel: "[data-anim='hero-cta']", delay: 1.18, y: 16 },
  ];

  heroEls.forEach(({ sel, delay, y = 16 }) => {
    gsap.fromTo(
      sel,
      { opacity: 0, y },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay }
    );
  });

  // Hint di scroll — solo opacity: il centraggio è un translateX CSS che non
  // va toccato dal transform di GSAP.
  gsap.fromTo(
    "[data-anim='hero-hint']",
    { opacity: 0 },
    { opacity: 1, duration: 0.9, ease: "power2.out", delay: 1.35 }
  );

  // ---------- Hero — uscita in parallasse ----------
  // Scrollando via dalla hero il blocco testo sale più veloce del video e
  // sfuma: la pagina "consegna" la scena alla sezione successiva. L'hint sta
  // dentro al blocco, quindi sparisce gratis.
  if (!reduceMotion) {
    gsap.to("[data-anim='hero-content']", {
      yPercent: -28,
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "70% top",
        scrub: 0.6,
      },
    });
  }
}

// ---------- Titoli di sezione — reveal parola per parola ----------
// Ogni titolo viene diviso in parole; ognuna sale dentro una maschera
// (overflow hidden) con una rotazione minima che si raddrizza: il classico
// "line reveal" editoriale, qui a grana di parola. Gli <em> restano <em>
// dentro lo span, così corsivo e colore accent si conservano.
const splitTitleWords = (title: HTMLElement): HTMLElement[] => {
  const words: HTMLElement[] = [];
  const frag = document.createDocumentFragment();

  const pushWord = (text: string, em: boolean) => {
    const mask = document.createElement("span");
    mask.className = "tw-mask";
    const inner = document.createElement("span");
    inner.className = "tw";
    if (em) {
      const e = document.createElement("em");
      e.textContent = text;
      inner.appendChild(e);
    } else {
      inner.textContent = text;
    }
    mask.appendChild(inner);
    frag.appendChild(mask);
    frag.appendChild(document.createTextNode(" "));
    words.push(inner);
  };

  title.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      (node.textContent ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((w) => pushWord(w, false));
    } else if (node instanceof HTMLElement) {
      if (node.tagName === "BR") {
        frag.appendChild(document.createElement("br"));
        return;
      }
      (node.textContent ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .forEach((w) => pushWord(w, node.tagName === "EM"));
    }
  });

  title.textContent = "";
  title.appendChild(frag);
  return words;
};

if (!reduceMotion) {
  document
    .querySelectorAll<HTMLElement>(
      ".works-title:not(.split-parent), .cta-title:not(.split-parent)"
    )
    .forEach((title) => {
      const words = splitTitleWords(title);
      const isCta = title.classList.contains("cta-title");
      gsap.fromTo(
        words,
        { yPercent: 115, rotate: 5 },
        {
          yPercent: 0,
          rotate: 0,
          duration: 1.05,
          ease: "power4.out",
          stagger: 0.07,
          // La CTA aspetta che il pannello scuro sia salito (vedi reveal sotto).
          delay: isCta ? 0.35 : 0,
          scrollTrigger: {
            trigger: isCta ? "[data-anim='contact']" : title,
            start: isCta ? "top 78%" : "top 88%",
            once: true,
          },
        }
      );
    });
}

// ---------- Reveal "rise" riusabile ----------
// Salita morbida translate-only + fade, con stagger. NIENTE scale: lo scale
// su pannelli con grana in mix-blend-mode spezza il compositing GPU e fa
// laggare l'entrata. will-change viene acceso quando l'elemento entra in
// vista e spento a fine corsa, così non restano layer pesanti appesi.
type RiseOpts = {
  trigger?: gsap.DOMTarget;
  start?: string;
  stagger?: number;
  y?: number;
  duration?: number;
  onStart?: () => void;
  onComplete?: () => void;
};
const revealRise = (targets: gsap.DOMTarget, opts: RiseOpts = {}) => {
  const els = gsap.utils.toArray<HTMLElement>(targets);
  if (!els.length) return;
  const {
    trigger,
    start = "top 82%",
    stagger = 0.1,
    y = 48,
    duration = 1,
    onStart,
    onComplete,
  } = opts;
  gsap.fromTo(
    els,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration,
      ease: "power3.out",
      stagger,
      force3D: true,
      scrollTrigger: {
        trigger: trigger ?? els[0],
        start,
        // once: il reveal è uno-shot. Senza questo, un ScrollTrigger.refresh()
        // (idratazione tardiva delle isole client:visible, fonts, ricalcolo
        // dei pin a monte) ri-renderizza la fromTo riportando gli elementi
        // allo stato "from" → la sezione "rientra"/scatta una seconda volta.
        once: true,
        onEnter: () => gsap.set(els, { willChange: "transform, opacity" }),
      },
      onStart,
      onComplete: () => {
        gsap.set(els, { willChange: "auto" });
        onComplete?.();
      },
    }
  );
};

// ---------- Lavori selezionati — entrata header + pannelli ----------
// I pannelli salgono in cascata; durante la salita la rail porta .is-revealing
// che sospende la grana (mix-blend) così l'animazione resta sul layer GPU.
const worksRail = document.querySelector<HTMLElement>(".works-rail");
revealRise("[data-anim='works-head']", {
  trigger: ".works-rail",
  start: "top 85%",
  stagger: 0.12,
  y: 26,
  duration: 0.9,
});
revealRise("[data-anim='work-panel']", {
  trigger: ".works-rail",
  start: "top 80%",
  stagger: 0.1,
  y: 56,
  duration: 1,
  onStart: () => worksRail?.classList.add("is-revealing"),
  onComplete: () => worksRail?.classList.remove("is-revealing"),
});

// ---------- Header di sezione — stesso reveal per Servizi e Chi Siamo ----------
// Riusa il linguaggio dell'header "Lavori selezionati": fade + rise con
// stagger tra titolo e meta-strip, agganciato alla sezione che li contiene.
const revealHead = (selector: string, trigger: string) => {
  if (!document.querySelector(selector)) return;
  gsap.fromTo(
    selector,
    { opacity: 0, y: 24 },
    {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power2.out",
      stagger: 0.12,
      scrollTrigger: { trigger, start: "top 80%", once: true },
    }
  );
};
revealHead("[data-anim='services-head']", "#cosa-facciamo");

// ---------- "Il punto" — sequenza scroll-driven (logo zoom + reveal testo) ---
// La sezione si BLOCCA (pin) e lo scroll guida una timeline:
//  1) hold      (0 → p1): il logo è subito NITIDO e GRANDE, a fuoco pieno;
//     resta così (zoom appena accennato) → è la prima cosa che leggi;
//  2) zoom+blur (p1 → p3): continuando a scrollare il logo ZOOMA e si SFOCA
//     progressivamente, arretrando come alone dietro al testo; nel mentre il
//     testo si rivela LETTERA PER LETTERA (fade-in + translateY, stagger);
//  3) climax    (p3 → 1): zoom e blur al massimo (grande bagliore diffuso); il
//     testo resta fermo e leggibile in primo piano; poi il pin si rilascia.
// Tutto è agganciato allo scroll (scrub): scrollando indietro la sequenza si
// riavvolge e le lettere si "ritirano". Senza motion / no-JS: blocco statico
// leggibile (logo a fuoco + testo intero), nessun pin. Anima solo transform /
// opacity / filter (con will-change) → niente reflow.
const pointSection = document.querySelector<HTMLElement>("[data-point]");
const pointLogo = pointSection?.querySelector<HTMLElement>("[data-point-logo]");
const pointInk = pointSection?.querySelector<HTMLElement>("[data-point-ink]");
const pointAccent =
  pointSection?.querySelector<HTMLElement>("[data-point-accent]");

if (pointSection && pointLogo && pointInk && pointAccent && !reduceMotion) {
  // ----- PARAMETRI CALIBRABILI (range blur/scale per fase) ----------------
  // Tutti qui in cima: questa sequenza richiede calibrazione fine, ritocca qui.
  const PT = {
    pinVh: 2.6, // lunghezza del pin in viewport (più alto = sequenza più lenta/deliberata).
    // Confini di fase del LOGO sulla progress (0→1) dello ScrollTrigger.
    p1: 0.18, // fine "hold": fin qui il logo resta nitido e grande
    p3: 0.75, // inizio climax: da qui zoom + blur al massimo
    // Logo — scala: parte GRANDE e nitido, poi zooma crescendo.
    scaleStart: 1.0, // inizio: dimensione piena, nitida
    scaleHold: 1.12, // fine hold: zoom appena accennato, ancora nitido
    scaleReveal: 2.0, // mentre il testo si rivela: zoom marcato
    scaleClimax: 3.0, // climax: zoom massimo, grande bagliore
    // Logo — blur (px): NITIDO all'inizio, poi si sfoca crescendo.
    blurStart: 0, // inizio: a fuoco pieno
    blurReveal: 22, // a testo rivelato: alone sfocato dietro
    blurClimax: 42, // climax: bagliore diffuso
    // Logo — opacità: piena dall'inizio; resta visibile come alone al climax.
    opacityClimax: 0.85,
    // Testo — reveal lettera-per-lettera ORIZZONTALE e morbido: ogni lettera
    // entra scorrendo in orizzontale (translateX) + fade. Animazione A TEMPO
    // (smooth), NON scrubbata: cascata sempre fluida, indipendente dagli scatti
    // dello scroll. Soglie ASIMMETRICHE (isteresi): scendendo il testo compare a
    // `textRevealAt`; risalendo si ritira solo a `textHideAt`, cioè quando il
    // logo TORNA NITIDO (≈ p1, dove il blur torna a 0).
    textRevealAt: 0.42, // progress (0→1): scendendo, soglia di APPARIZIONE del testo
    textHideAt: 0.32, // progress (0→1): risalendo, soglia di RITIRO — più alto = il testo sparisce PRIMA tornando su (resta < textRevealAt)
    charDur: 0.5, // durata (s) dell'ingresso di ogni lettera
    charStaggerAmount: 0.9, // secondi su cui è distribuito lo stagger di TUTTE le lettere (più alto = cascata più lenta)
    charFromX: -22, // px — scostamento orizzontale iniziale di ogni lettera (negativo = entra da sinistra)
    charEase: "power3.out", // ease morbida del movimento di ogni lettera
  };
  // -----------------------------------------------------------------------

  // Attiva il layout pinnato (100vh, logo+testo centrati e sovrapposti): vedi
  // .is-point-active in global.css. Solo da JS, così il fallback resta leggibile.
  pointSection.classList.add("is-point-active");

  // Split del testo in lettere. Le due parti restano nei rispettivi span colorati
  // (ink scuro / accent blu+italic), così ogni lettera eredita il colore giusto.
  // type "words,chars": i wrapper-parola tengono il wrapping ai confini di parola.
  const splitInk = new SplitText(pointInk, {
    type: "words,chars",
    charsClass: "point-char",
    wordsClass: "point-word",
  });
  const splitAccent = new SplitText(pointAccent, {
    type: "words,chars",
    charsClass: "point-char",
    wordsClass: "point-word",
  });
  // Lettere in ordine di lettura: prima la parte ink, poi la parte accent.
  const chars = [...splitInk.chars, ...splitAccent.chars];

  // Stato iniziale: logo GRANDE e NITIDO (a fuoco, opacità piena); lettere
  // nascoste poco sotto. Centratura del logo via left/top 50% (CSS) +
  // xPercent/yPercent gestiti da GSAP, così lo scale si compone col translate.
  gsap.set(pointLogo, {
    xPercent: -50,
    yPercent: -50,
    scale: PT.scaleStart,
    autoAlpha: 1,
    filter: `blur(${PT.blurStart}px)`,
    transformOrigin: "50% 50%",
    force3D: true,
  });
  // Lettere nascoste: scostate in orizzontale + trasparenti.
  gsap.set(chars, { autoAlpha: 0, x: PT.charFromX });

  // Reveal del testo come timeline A TEMPO, in pausa finché lo scroll non
  // supera la soglia: play() in avanti, reverse() tornando indietro → cascata
  // orizzontale lettera-per-lettera sempre fluida (vedi onUpdate sotto).
  const lettersTl = gsap.timeline({ paused: true });
  lettersTl.to(chars, {
    autoAlpha: 1,
    x: 0,
    duration: PT.charDur,
    ease: PT.charEase,
    stagger: { amount: PT.charStaggerAmount },
  });
  let textRevealed = false;

  const pinDistance = () => Math.round(window.innerHeight * PT.pinVh);

  // Timeline normalizzata (durata totale = 1) mappata 1:1 sulla progress dello
  // scroll: una posizione p nella timeline corrisponde alla progress p del pin.
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: pointSection,
      start: "top top",
      end: () => "+=" + pinDistance(),
      pin: true,
      scrub: 1, // scroll-driven con un filo d'inerzia (resta burroso con Lenis)
      anticipatePin: 1,
      invalidateOnRefresh: true,
      // Più alto del pin dei Servizi (1): essendo PRIMA nella pagina dev'essere
      // ricalcolato per primo, così il suo spacer è in posizione quando i
      // trigger a valle (morph colore canvas, pin Servizi) leggono le coordinate.
      refreshPriority: 2,
      onUpdate: (self) => {
        // Reveal a tempo (sempre fluido), lo scroll fa solo da grilletto. Soglie
        // ASIMMETRICHE: scendendo il testo compare a `textRevealAt` (logo che si
        // sfoca); risalendo si ritira solo a `textHideAt`, cioè quando il logo
        // torna nitido. Tra le due soglie lo stato resta com'è (isteresi).
        const p = self.progress;
        if (!textRevealed && p >= PT.textRevealAt) {
          textRevealed = true;
          lettersTl.play();
        } else if (textRevealed && p <= PT.textHideAt) {
          textRevealed = false;
          lettersTl.reverse();
        }
      },
    },
  });

  // --- LOGO: nitido e grande all'inizio, poi zoom + blur crescenti ----------
  // Fase 1 (0 → p1): hold — resta NITIDO (blur 0) e grande, zoom appena accennato.
  tl.to(pointLogo, { scale: PT.scaleHold, duration: PT.p1 }, 0);
  // Fase 2 (p1 → p3): ZOOMA e si SFOCA progressivamente, mentre il testo appare.
  tl.to(
    pointLogo,
    {
      scale: PT.scaleReveal,
      filter: `blur(${PT.blurReveal}px)`,
      duration: PT.p3 - PT.p1,
      ease: "power1.in",
    },
    PT.p1
  );
  // Fase 3 (p3 → 1): climax — zoom e blur al massimo, grande bagliore diffuso.
  tl.to(
    pointLogo,
    {
      scale: PT.scaleClimax,
      autoAlpha: PT.opacityClimax,
      filter: `blur(${PT.blurClimax}px)`,
      duration: 1 - PT.p3,
      ease: "power1.in",
    },
    PT.p3
  );

  // (Il reveal del testo è la timeline a tempo `lettersTl` qui sopra, avviata
  // dall'onUpdate dello ScrollTrigger — non è scrubbato, così resta fluido.)

  // Pulizia listener/timeline al cambio pagina (utile anche in futuro con view
  // transitions): killa lo ScrollTrigger, le timeline e ripristina il testo.
  window.addEventListener("astro:before-swap", () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    lettersTl.kill();
    splitInk.revert();
    splitAccent.revert();
  });
}

// ---------- Canvas — lo schermo cambia colore tra le sezioni ----------
// I colori di sezione non stanno sulle sezioni ma sul canvas .post-reveal:
// quattro scrub lo tingono in sequenza — warm white → navy (entrando in Cosa
// Facciamo), navy → warm white (entrando nei Lavori), warm → grigio bordo
// (entrando in Chi Siamo), poi di nuovo warm white (verso il separatore e la
// CTA). Tutti valori della palette. I background statici delle sezioni vengono
// resi trasparenti: restano solo come fallback per reduced-motion / no-JS.
if (!reduceMotion) {
  const canvas = document.querySelector<HTMLElement>(".post-reveal");
  if (canvas) {
    gsap.set(["#cosa-facciamo", "#projects", "#chi-siamo"], { backgroundColor: "transparent" });

    const morph = (
      trigger: string,
      start: string,
      end: string,
      from: string,
      to: string
    ) => {
      gsap.fromTo(
        canvas,
        { backgroundColor: from },
        {
          backgroundColor: to,
          ease: "none",
          immediateRender: false,
          // Scrub un filo più morbido: la virata di colore insegue lo scroll
          // con leggera inerzia invece di "scattare" al fermarsi della rotella.
          scrollTrigger: { trigger, start, end, scrub: 0.6 },
        }
      );
    };

    // Nuovo ordine sezioni: Problema(warm) → Servizi(navy) → Lavori(warm) →
    // Chi Siamo(grigio) → CTA(warm). Il canvas vira di conseguenza.
    // Start ritardato (top 50%): mentre "Il punto" è centrato lo sfondo resta
    // warm white; il blu inizia solo quando Servizi è già ben dentro lo
    // schermo (e "Il punto" è scrollato via), completando prima del pin.
    morph("#cosa-facciamo", "top 50%", "top 12%", "#FAFAF8", "#1A2340");
    morph("#projects", "top 80%", "top 30%", "#1A2340", "#FAFAF8");
    morph("#chi-siamo", "top 70%", "top 20%", "#FAFAF8", "#E8E8E5");
    morph(".section-rule", "top 95%", "top 50%", "#E8E8E5", "#FAFAF8");
  }
}

// ---------- Cosa Facciamo — scene a tutta schermata, una per servizio ----------
// Su desktop la sezione si "blocca" (pin) e i servizi si avvicendano come
// scene piene: l'indice sale, il titolo emerge dalla maschera, descrizione
// e chip seguono, il placeholder immagine si solleva; la scena uscente
// sfuma verso l'alto mentre entra la successiva. Su mobile (niente pin)
// le scene scorrono in colonna e si rivelano entrando in viewport.
const servicesStage = document.querySelector<HTMLElement>(".services-stage");
const serviceSlides = gsap.utils.toArray<HTMLElement>(".service-slide");
const servicesScrollHint = document.querySelector<HTMLElement>(".services-scroll-hint");

// Pin attivo solo su desktop con motion abilitato.
const servicesPinned =
  !reduceMotion && window.matchMedia("(min-width: 1024px)").matches;

// Distanza di scroll della sezione pinnata: ~140vh per scena + coda finale.
// Più lunga della distanza "naturale" → lo scroll è meno sensibile, ogni
// servizio ha il tempo di essere percepito e uno scroll veloce non salta più
// scene insieme (in coppia con lo scrub morbido qui sotto).
const servicesPinDistance = () =>
  Math.round(window.innerHeight * (serviceSlides.length * 1.4 + 0.6));

// ---------- Navbar — zona scura della banda navy ----------
// Un solo trigger che attraversa la sezione pinnata si "accorcia" (lo span
// non compensa il pin): l'inversione si chiuderebbe subito. Quindi due
// trigger a elemento singolo con callback —
//   • accendi quando il navy si forma (cosa-facciamo, PRIMA del pin);
//   • spegni quando i Lavori riportano il chiaro: il navy è scuro SOLO nella
//     banda di Servizi e nell'inizio dei Lavori (il morph #projects vira
//     navy→bianco tra top 80% e top 30%). Ancorare lo spegnimento a #projects
//     (stesso elemento-trigger del morph colore) fa tornare la navbar normale
//     appena lo sfondo ridiventa bianco, invece di restare invertita per tutta
//     la sezione chiara fino a Chi Siamo.
// onLeaveBack ripristina lo stato anche scrollando all'indietro.
const servicesSection = document.querySelector<HTMLElement>("#cosa-facciamo");
const projectsSection = document.querySelector<HTMLElement>("#projects");
if (navEl && servicesSection && projectsSection && serviceSlides.length) {
  const addDark = () => navEl.classList.add("is-on-dark");
  const removeDark = () => navEl.classList.remove("is-on-dark");

  ScrollTrigger.create({
    trigger: servicesSection,
    start: "top 40%",
    onEnter: addDark,
    onLeaveBack: removeDark,
  });
  ScrollTrigger.create({
    trigger: projectsSection,
    start: "top 50%",
    onEnter: removeDark,
    onLeaveBack: addDark,
  });
}

// Coreografia d'ingresso di una scena, agganciata alla timeline `tl` a
// partire da `at` (unità di timeline: con lo scrub diventano scroll).
const slideReveal = (
  tl: gsap.core.Timeline,
  slide: HTMLElement,
  at: number
) => {
  const index = slide.querySelector(".slide-index");
  const name = slide.querySelector(".sn");
  // .slide-desc / .slide-ledger NON sono più animati qui: il loro testo usa il
  // reveal a righe via CSS (.title-line / .is-active), per evitare doppia
  // animazione. Restano i contenitori (visibili con la slide).
  const media = slide.querySelector(".slide-media");

  tl.fromTo(
    slide,
    { autoAlpha: 0, y: 28 },
    { autoAlpha: 1, y: 0, duration: 0.3 },
    at
  );
  if (index) {
    tl.fromTo(
      index,
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.4 },
      at + 0.06
    );
  }
  if (name) {
    tl.fromTo(
      name,
      { yPercent: 115 },
      { yPercent: 0, duration: 0.6, ease: "power4.out" },
      at + 0.08
    );
  }
  if (media) {
    tl.fromTo(
      media,
      { autoAlpha: 0, y: 48, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.65 },
      at + 0.1
    );
  }
};

if (servicesStage && serviceSlides.length && !reduceMotion) {
  if (servicesPinned) {
    // Le scene si impilano nello stesso spazio (vedi CSS .is-pinned).
    servicesStage.classList.add("is-pinned");
    // Abilita il reveal a righe del testo card (stato nascosto iniziale gated da
    // .has-reveal: senza JS / reduced-motion il testo resta visibile).
    servicesStage.classList.add("has-reveal");

    // STEP = durata di una scena in unità di timeline (ingresso + sosta);
    // l'end mappa il tutto sulla distanza calcolata sopra.
    const STEP = 1.5;
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      scrollTrigger: {
        trigger: "#cosa-facciamo",
        start: "top top",
        end: () => "+=" + servicesPinDistance(),
        pin: true,
        // Sincronizza .is-active (reveal testo) con lo step a fuoco. Calcolo
        // idempotente dal progress → corretto anche scrollando all'indietro.
        onUpdate: (self) => {
          const time = self.progress * tl.duration();
          const idx = Math.max(
            0,
            Math.min(serviceSlides.length - 1, Math.floor(time / STEP))
          );
          serviceSlides.forEach((s, i) =>
            s.classList.toggle("is-active", i === idx)
          );
        },
        // Scrub più morbido = più "resistenza/lag": il movimento delle scene
        // insegue lo scroll con inerzia, così uno scatto veloce non fa avanzare
        // di colpo più servizi.
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // Il pin sposta in basso tutto ciò che lo segue (chi-siamo, marquee,
        // CTA…). I morph del colore e l'inversione nav sono creati PRIMA di
        // questo pin nel codice: con priorità più alta il pin si ricalcola
        // per primo, così quei trigger leggono le posizioni già spostate e
        // il navy resta pieno per tutta la sezione, tornando chiaro solo
        // entrando in chi-siamo.
        refreshPriority: 1,
      },
    });

    serviceSlides.forEach((slide, i) => {
      const at = i * STEP;
      // La scena precedente esce appena prima che entri questa.
      if (i > 0) {
        tl.to(
          serviceSlides[i - 1],
          { autoAlpha: 0, y: -36, duration: 0.32, ease: "power2.in" },
          at - 0.34
        );
      }
      slideReveal(tl, slide, at);
    });
    tl.to({}, { duration: 0.7 }); // respiro finale: l'ultima scena resta ferma

    if (servicesScrollHint) {
      const totalDuration = serviceSlides.length * STEP + 0.7;
      tl.fromTo(
        servicesScrollHint,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" },
        0
      );
      tl.to(
        servicesScrollHint,
        { autoAlpha: 0, y: -24, duration: 0.32, ease: "power2.in" },
        totalDuration - 0.4
      );
    }
  } else {
    // Senza pin le slide entrano indipendenti → reveal testo via
    // IntersectionObserver per-card (le slide impilate del pin scatterebbero
    // invece tutte insieme, per questo qui NON si usa l'onUpdate del timeline).
    servicesStage.classList.add("has-reveal");
    serviceSlides.forEach((slide) => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: slide, start: "top 80%", once: true },
      });
      slideReveal(tl, slide, 0);
    });

    if ("IntersectionObserver" in window) {
      const slideObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.classList.toggle("is-active", entry.isIntersecting);
          });
        },
        { threshold: 0.35 }
      );
      serviceSlides.forEach((slide) => slideObserver.observe(slide));
    }

    if (servicesScrollHint) {
      gsap.fromTo(
        servicesScrollHint,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#cosa-facciamo",
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play reverse play reverse",
          },
        }
      );
    }
  }
}

// ---------- Glow text — illuminazione lettera per lettera in scrub ----------
// Ogni elemento [data-glow] viene spezzato in lettere: le parole diventano
// span inline-block (così non si spezzano a metà riga), ogni carattere uno
// span che passa da quasi spento a pieno mentre l'elemento attraversa il
// viewport. Gli <em> conservano corsivo + colore accent via .gw-em.
// Con reduced motion il testo resta pieno (niente split, niente tween).
const splitGlowChars = (el: HTMLElement): HTMLElement[] => {
  const chars: HTMLElement[] = [];
  const frag = document.createDocumentFragment();

  const pushText = (text: string, em: boolean) => {
    text.split(/(\s+)/).forEach((tok) => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) {
        frag.appendChild(document.createTextNode(" "));
        return;
      }
      const word = document.createElement("span");
      word.className = em ? "gw gw-em" : "gw";
      for (const ch of tok) {
        const c = document.createElement("span");
        c.className = "gc";
        c.textContent = ch;
        word.appendChild(c);
        chars.push(c);
      }
      frag.appendChild(word);
    });
  };

  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent ?? "", false);
    } else if (node instanceof HTMLElement) {
      if (node.tagName === "BR") {
        frag.appendChild(document.createElement("br"));
        return;
      }
      pushText(node.textContent ?? "", node.tagName === "EM");
    }
  });

  el.textContent = "";
  el.appendChild(frag);
  return chars;
};

if (!reduceMotion) {
  document.querySelectorAll<HTMLElement>("[data-glow]").forEach((el) => {
    const chars = splitGlowChars(el);
    if (!chars.length) return;
    gsap.fromTo(
      chars,
      { opacity: 0.12 },
      {
        opacity: 1,
        duration: 1,
        ease: "none",
        stagger: 0.05,
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          end: "bottom 45%",
          scrub: 0.6,
        },
      }
    );
  });
}

// ---------- Chi Siamo — intro pinnata con riempimento per lettera ----------
// Quando l'intro (titolo + statement) raggiunge il viewport la sezione si
// blocca (pin): lo scroll non muove più la pagina ma riempie le lettere
// dello statement, da grigio "vuoto" a colorato (ink, accent per i corsivi),
// una a una in ordine di lettura. Colorata l'ultima lettera, una breve coda
// lascia leggere la frase piena e poi lo scroll riprende normale.
// Con reduced motion niente pin: il testo resta pieno e statico.
const pinStatement = document.querySelector<HTMLElement>("[data-glow-pin]");
if (pinStatement && !reduceMotion) {
  const chars = splitGlowChars(pinStatement);
  if (chars.length) {
    const GRAY = "rgba(13, 13, 13, 0.16)";
    const INK = "#0D0D0D";
    const ACCENT = "#3B5BDB";
    gsap.set(chars, { color: GRAY });

    // Corsa proporzionale al numero di lettere: più corta (≈7px di scroll a
    // lettera) per un passaggio tra le sezioni più immediato. Condivisa tra il
    // pin dello statement e quello del fondale video, così restano sincronizzati.
    const pinEnd = () => "+=" + Math.max(560, Math.round(chars.length * 7));

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".about-intro",
        start: "top top",
        end: pinEnd,
        pin: true,
        // Scrub più morbido: il riempimento delle lettere "decelera" invece di
        // bloccarsi netto quando si smette di scrollare.
        scrub: 0.55,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // Come il pin dei servizi: ricalcolato prima dei trigger a valle,
        // così morph colore e marquee leggono le posizioni già spostate.
        refreshPriority: 1,
      },
    });

    // Fondale video — bloccato ESATTAMENTE come lo statement (stesso
    // trigger/start/end), pinnato via GSAP. Non si usa più position:sticky:
    // è neutralizzato dall'overflow-x sugli antenati (body/html), quindi il
    // video scrollava via mentre il testo restava fermo. pinSpacing:false →
    // non aggiunge spazio (lo spazio lo riserva già il pin dello statement).
    const aboutVideoFrame =
      document.querySelector<HTMLElement>(".about-video-frame");
    if (aboutVideoFrame) {
      ScrollTrigger.create({
        trigger: ".about-intro",
        start: "top top",
        end: pinEnd,
        pin: aboutVideoFrame,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 1,
      });
    }

    // Un tween per lettera, in sequenza: 1 unità di timeline = 1 lettera.
    // duration < 1 → ogni lettera "scatta" piena prima che parta la
    // successiva, niente dissolvenze sovrapposte.
    chars.forEach((c, i) => {
      const isEm = c.parentElement?.classList.contains("gw-em");
      tl.to(c, { color: isEm ? ACCENT : INK, duration: 0.6 }, i);
    });
    // La montagna emerge: mentre le lettere si riempiono, il velo radiale
    // sul video si dirada — testo e fondale si "sviluppano" insieme.
    const aboutVeil = document.querySelector<HTMLElement>("[data-about-veil]");
    if (aboutVeil) {
      tl.fromTo(
        aboutVeil,
        { opacity: 1 },
        { opacity: 0.55, duration: chars.length },
        0
      );
    }
    // Coda: la frase resta piena e ferma prima dello sblocco (breve, così lo
    // sblocco verso la sezione successiva arriva subito).
    tl.to({}, { duration: chars.length * 0.06 });
  }
}

// ---------- Chi Siamo — kicker dell'intro ----------
if (document.querySelector("[data-anim='about-kicker']")) {
  gsap.fromTo(
    "[data-anim='about-kicker']",
    { opacity: 0, y: 14 },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out",
      scrollTrigger: { trigger: ".about-intro", start: "top 70%", once: true },
    }
  );
}

// ---------- Chi Siamo — fondale video Sciliar ----------
// Il bianco e nero e la fusione col canvas sono CSS (filter + mask + velo);
// qui solo la regia:
//   • play/pause legati alla visibilità della sezione (batteria, decode);
//   • lenta zoomata-out in scrub: la montagna parte più "vicina" e si
//     assesta mentre la sezione attraversa il viewport.
// Con reduced motion il video resta fermo sul primo frame: un fondale
// fotografico statico.
const aboutVideo = document.querySelector<HTMLVideoElement>(
  "[data-about-video]"
);
if (aboutVideo) {
  if (reduceMotion) {
    aboutVideo.removeAttribute("autoplay");
    aboutVideo.pause();
  } else {
    // Ping-pong fluido: il file -boomerang contiene già andata + ritorno
    // concatenati, quindi basta il loop nativo (riproduzione liscia in
    // entrambi i versi). Play/pause solo quando la sezione è a schermo.
    ScrollTrigger.create({
      trigger: "#chi-siamo",
      start: "top bottom",
      end: "bottom top",
      onEnter: () => void aboutVideo.play(),
      onEnterBack: () => void aboutVideo.play(),
      onLeave: () => aboutVideo.pause(),
      onLeaveBack: () => aboutVideo.pause(),
    });

    gsap.fromTo(
      aboutVideo,
      { scale: 1.16 },
      {
        scale: 1,
        ease: "none",
        transformOrigin: "center center",
        scrollTrigger: {
          trigger: "#chi-siamo",
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      }
    );
  }
}

// ---------- Chi Siamo — capitoli del metodo ----------
// Ogni capitolo entra come scena propria (numero+titolo, poi il corpo);
// i chip degli strumenti seguono in cascata fine.
document.querySelectorAll<HTMLElement>(".about-chapter").forEach((ch) => {
  revealRise(ch.querySelectorAll(":scope > *"), {
    trigger: ch,
    start: "top 82%",
    stagger: 0.12,
    y: 36,
    duration: 0.9,
  });
  const chips = ch.querySelectorAll(".chapter-tool");
  if (chips.length && !reduceMotion) {
    gsap.fromTo(
      chips,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.05,
        delay: 0.25,
        scrollTrigger: { trigger: ch, start: "top 82%", once: true },
      }
    );
  }
});

// ---------- Chi Siamo — i nomi del duo ----------
// I nomi entrano dalla maschera parola per parola — stesso linguaggio dei
// titoli di sezione, ma in scala monumentale — poi la riga CTA segue.
const duo = document.querySelector<HTMLElement>("[data-anim='duo']");
if (duo) {
  const duoNames = duo.querySelector<HTMLElement>(".duo-names");
  const duoCta = duo.querySelector<HTMLElement>(".duo-cta");
  if (duoNames && !reduceMotion) {
    const words = splitTitleWords(duoNames);
    gsap.fromTo(
      words,
      { yPercent: 115, rotate: 5 },
      {
        yPercent: 0,
        rotate: 0,
        duration: 1.15,
        ease: "power4.out",
        stagger: 0.09,
        scrollTrigger: { trigger: duo, start: "top 80%", once: true },
      }
    );
  }
  if (duoCta) {
    gsap.fromTo(
      duoCta,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        delay: reduceMotion ? 0 : 0.45,
        scrollTrigger: { trigger: duo, start: "top 80%", once: true },
      }
    );
  }
}

// ---------- Chi Siamo — tilt 3D delle founder card ----------
// La media segue il cursore con una rotazione leggera (prospettiva sul
// genitore, via CSS); quickTo lerpa il rientro senza scatti.
if (!reduceMotion && window.matchMedia("(min-width: 1024px)").matches) {
  document.querySelectorAll<HTMLElement>(".founder-card").forEach((card) => {
    const media = card.querySelector<HTMLElement>(".founder-media");
    if (!media) return;
    const rx = gsap.quickTo(media, "rotationX", {
      duration: 0.5,
      ease: "power2.out",
    });
    const ry = gsap.quickTo(media, "rotationY", {
      duration: 0.5,
      ease: "power2.out",
    });
    card.addEventListener("mousemove", (e) => {
      const r = media.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry(px * 10);
      rx(py * -10);
    });
    card.addEventListener("mouseleave", () => {
      rx(0);
      ry(0);
    });
  });
}

// ---------- CTA finale — reveal del pannello + contenuti in cascata ----------
// Salita translate-only (niente scale: il pannello scuro ha grana/spotlight,
// lo scale lo farebbe ridipingere per frame).
revealRise(".cta-panel", {
  trigger: "[data-anim='contact']",
  start: "top 78%",
  stagger: 0,
  y: 80,
  duration: 1.1,
});

// Il titolo (contact-headline) non è più in questa lista: lo rivela il
// reveal parola-per-parola qui sopra, che ha già trigger e delay propri.
const ctaInner: { sel: string; delay: number; y?: number }[] = [
  { sel: "[data-anim='contact-kicker']", delay: 0.2, y: 16 },
  { sel: "[data-anim='contact-sub']", delay: 0.46, y: 20 },
  { sel: "[data-anim='contact-cta']", delay: 0.58, y: 18 },
];
ctaInner.forEach(({ sel, delay, y = 16 }) => {
  if (!document.querySelector(sel)) return;
  gsap.fromTo(
    sel,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power2.out",
      delay,
      scrollTrigger: {
        trigger: "[data-anim='contact']",
        start: "top 78%",
        once: true,
      },
    }
  );
});

// ---------- CTA /chi-siamo — reveal dell'invito (non più card) ----------
{
  const aboutCta = document.querySelector<HTMLElement>(".about-cta");
  if (aboutCta) {
    revealRise(aboutCta.querySelectorAll(":scope > .works-kicker, :scope > .about-cta-title, :scope > .about-cta-sub, :scope > .about-cta-actions, :scope > .about-cta-foot"), {
      trigger: ".about-cta",
      start: "top 80%",
      stagger: 0.09,
      y: 24,
    });
  }
}

// ---------- Bottone magnetico ----------
// Il bottone si lascia "attirare" dal cursore dentro la propria area e torna
// al centro con una molla elastica all'uscita. Stesso linguaggio del cursor
// ring che insegue il puntatore.
if (!reduceMotion && window.matchMedia("(min-width: 769px)").matches) {
  document.querySelectorAll<HTMLElement>(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - r.left - r.width / 2;
      const dy = e.clientY - r.top - r.height / 2;
      gsap.to(el, {
        x: dx * 0.28,
        y: dy * 0.28,
        duration: 0.4,
        ease: "power2.out",
      });
    });
    el.addEventListener("mouseleave", () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
    });
  });
}

// ---------- CTA — spotlight che segue il cursore ----------
// Il pannello scuro si "illumina" attorno al puntatore: solo due CSS custom
// property aggiornate al mousemove, il gradient lo disegna la GPU.
const ctaPanel = document.querySelector<HTMLElement>(".cta-panel");
const ctaSpot = document.querySelector<HTMLElement>(".cta-spotlight");
if (
  ctaPanel &&
  ctaSpot &&
  !reduceMotion &&
  window.matchMedia("(min-width: 769px)").matches
) {
  ctaPanel.addEventListener("mousemove", (e) => {
    const r = ctaPanel.getBoundingClientRect();
    ctaSpot.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ctaSpot.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
}

// ---------- Container Scroll — la card del form si "alza in piedi" ----------
// Reimplementazione GSAP del componente Aceternity/21st: scrollando attraverso
// il contenitore la card passa da inclinata (rotateX 20°) e scalata a dritta
// (rotateX 0°, scale finale), mentre l'header si solleva. Su mobile scala
// 0.7→0.9, su desktop 1.05→1, come nell'originale. Stato CSS di default =
// piatto/leggibile; lo stato iniziale inclinato lo impone GSAP solo quando può
// animare, così no-JS e reduced-motion mostrano il form dritto e usabile.
{
  const cscroll = document.querySelector<HTMLElement>("[data-cscroll]");
  const card = cscroll?.querySelector<HTMLElement>("[data-cscroll-card]");
  const header = cscroll?.querySelector<HTMLElement>("[data-cscroll-header]");
  if (cscroll && card && !reduceMotion) {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const startScale = isMobile ? 0.72 : 1.1;
    const endScale = isMobile ? 0.94 : 1;
    // Tilt più marcato e corsa di scroll più lunga → l'effetto "schermo che
    // si alza in piedi" è molto più evidente.
    gsap.set(card, { rotateX: 38, scale: startScale, transformPerspective: 720 });
    gsap.timeline({
      scrollTrigger: {
        // Ancorato alla CARD e concluso sul suo BORDO SUPERIORE: "top 42%"
        // significa che la card è dritta (rotateX 0) quando il suo bordo alto
        // arriva al 42% del viewport — cioè mentre la card è ben incorniciata
        // e visibile, NON dopo averla superata. La card è alta (può eccedere il
        // viewport): legare la fine al centro la raddrizzava troppo tardi,
        // quando il bordo alto era già tagliato fuori in cima.
        trigger: card,
        start: "top 92%",
        end: "top 42%",
        scrub: 0.5,
      },
    })
      .to(card, { rotateX: 0, scale: endScale, ease: "none" }, 0)
      .to(header ?? card, { y: -120, ease: "none" }, 0);
  }
}

// ---------- Form di contatto — submit → mailto precompilato ----------
// Niente backend (sito statico): comporiamo un mailto verso lo studio con i
// campi del form, preservando l'intento "manda sulla mail". Per passare a un
// endpoint reale basterà togliere questo intercept e aggiungere action/method.
{
  const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const fd = new FormData(form);
      const get = (k: string) => (fd.get(k)?.toString() ?? "").trim();
      // Etichette localizzate del mailto, esposte come data-* dal componente
      // (fallback italiano se assenti).
      const L = (k: string, fallback: string) =>
        form.getAttribute(k) || fallback;
      const empty = L("data-mail-empty", "—");
      const nome = get("nome");
      const budget = get("budget");
      const subject = `${L("data-mail-subject", "Nuova richiesta di consulenza")} — ${
        nome || "AuralpDigital"
      }`;
      const body = [
        `${L("data-mail-name", "Nome")}: ${nome}`,
        `${L("data-mail-email", "Email")}: ${get("email")}`,
        `${L("data-mail-business", "Attività")}: ${get("attivita") || empty}`,
        `${L("data-mail-budget", "Budget indicativo")}: ${budget || empty}`,
        "",
        L("data-mail-project", "Progetto:"),
        get("messaggio"),
      ].join("\n");
      window.location.href = `mailto:hello@auralpdigital.com?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      const status = form.querySelector<HTMLElement>("[data-form-status]");
      if (status) {
        status.textContent = L(
          "data-status-opening",
          "Apriamo la tua email… se non parte, scrivici a hello@auralpdigital.com"
        );
      }
    });
  }
}

// ---------- Rail dei lavori — espansione del pannello attivo ----------
// Pilotiamo l'attivo da JS invece che con :hover, perché i 14px di gap fra
// i pannelli sono una "zona morta": attraversandoli col solo CSS, l'aperto
// di default si riapriva/richiudeva un istante (flicker). Con pointerenter
// l'attivo resta l'ULTIMO pannello entrato finché il mouse non lascia la
// rail intera: passare da una finestra all'altra non tocca più le altre.
// Solo su dispositivi con hover reale — il touch usa il layout statico.
if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const railEl = document.querySelector<HTMLElement>(".works-rail");
  if (railEl) {
    const panels = Array.from(
      railEl.querySelectorAll<HTMLElement>(".work-panel")
    );
    panels.forEach((panel) => {
      const vid = panel.querySelector<HTMLVideoElement>("video");
      panel.addEventListener("pointerenter", () => {
        railEl.classList.add("is-engaged");
        panels.forEach((other) => {
          const isTarget = other === panel;
          other.classList.toggle("is-active", isTarget);
          const otherVid = other.querySelector<HTMLVideoElement>("video");
          if (otherVid && !isTarget) {
            otherVid.pause();
            otherVid.currentTime = 0;
          }
        });
        vid?.play();
      });
    });
    railEl.addEventListener("pointerleave", () => {
      railEl.classList.remove("is-engaged");
      panels.forEach((other) => {
        other.classList.remove("is-active");
        const vid = other.querySelector<HTMLVideoElement>("video");
        if (vid) {
          vid.pause();
          vid.currentTime = 0;
        }
      });
    });
  }
} else {
  document.querySelectorAll<HTMLVideoElement>(".work-panel video").forEach((vid) => {
    const obs = new IntersectionObserver(
      ([e]) => { e.isIntersecting ? vid.play() : (vid.pause(), vid.currentTime = 0); },
      { threshold: 0.5 }
    );
    obs.observe(vid);
  });
}

// ---------- Pagina /chi-siamo ----------
// Le coreografie condivise (glow, capitoli, tilt founder, outro, CTA,
// footer) si agganciano da sole alle stesse classi; qui vive solo ciò che
// è esclusivo della pagina: l'entrata della hero, i ritratti del duo e la
// timeline del percorso.
const aboutPage = document.querySelector<HTMLElement>(".aboutpage");
if (aboutPage) {
  // Hero — il titolo ora usa l'isola VariableProximity (React Bits): le lettere
  // reagiscono al cursore variando il peso del font, quindi niente split/mask GSAP
  // qui. Badge, sottotitolo, meta e hint mantengono l'entrata in dissolvenza.
  const apHeroBits: { sel: string; delay: number }[] = [
    { sel: ".ap-hero .hero-badge", delay: 0.45 },
    { sel: ".ap-hero-sub", delay: 1.0 },
    { sel: ".ap-hero-meta", delay: 1.18 },
    { sel: ".ap-hero .hero-scroll-hint", delay: 1.35 },
  ];
  apHeroBits.forEach(({ sel, delay }) => {
    if (!aboutPage.querySelector(sel)) return;
    gsap.fromTo(
      sel,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay }
    );
  });

  // Duo — ogni riga è una scena indipendente: il badge cala dall'alto come da
  // un filo (corda che cresce + badge che scende, assestamento a pendolo),
  // mentre la bio sale a pezzi. L'animazione parte solo quando IL blocco di
  // QUELLA persona entra in viewport (trigger per riga), una volta sola, e il
  // badge resta poi fisso. Solo transform/opacity. Reduced-motion → stato
  // finale immediato (lo stato iniziale nascosto è inline nel componente).
  aboutPage.querySelectorAll<HTMLElement>(".ap-person").forEach((row) => {
    revealRise(row.querySelectorAll(".ap-bio > *"), {
      trigger: row,
      start: "top 78%",
      stagger: 0.1,
      y: 44,
      duration: 0.9,
    });

    const swing = row.querySelector<HTMLElement>("[data-hang-swing]");
    const badge = row.querySelector<HTMLElement>("[data-hang-badge]");
    const cord = row.querySelector<HTMLElement>("[data-hang-cord]");
    if (!swing || !badge || !cord) return;

    if (reduceMotion) {
      gsap.set(cord, { scaleY: 1 });
      gsap.set(badge, { opacity: 1, y: 0 });
      gsap.set(swing, { rotation: 0 });
      return;
    }

    // Distanza di caduta = lunghezza della corda: badge e corda restano
    // agganciati per tutta la discesa (stesso ease, stessa durata). Il pendolo
    // di assestamento ruota il WRAPPER (.hang-swing) attorno all'aggancio in
    // cima, così corda e badge oscillano insieme — pendolo fisicamente corretto.
    const drop = cord.offsetHeight || 180;

    // --- Pendolo interattivo: peso a riposo (sway) + trascinamento ---
    // Creato dopo la caduta. Lo sway dà "vita/peso" senza costare nulla (un
    // solo transform su layer GPU) e va in pausa fuori viewport. Su desktop
    // (pointer fine) il badge si trascina e torna alla verticale con un
    // rimbalzo elastico; su touch resta non-draggable per non rubare lo scroll.
    let idle: gsap.core.Tween | null = null;
    let dragging = false;
    const canDrag = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;

    const makeIdle = () =>
      gsap.fromTo(
        swing,
        { rotation: 0 },
        {
          rotation: 1.6,
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          paused: true,
        }
      );

    const enablePendulum = () => {
      gsap.set([swing, badge], { willChange: "auto" });
      idle = makeIdle();
      idle.play();

      // Pausa lo sway quando il badge esce dallo schermo (niente loop sprecati).
      ScrollTrigger.create({
        trigger: row,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          if (dragging) return;
          self.isActive ? idle?.play() : idle?.pause();
        },
      });

      if (!canDrag) return;
      swing.classList.add("is-draggable");

      Draggable.create(swing, {
        type: "rotation",
        // Limiti: oscilla come un pendolo, non gira a vuoto.
        bounds: { minRotation: -34, maxRotation: 34 },
        dragResistance: 0.32, // "peso": il badge non schizza dietro al cursore
        onPress() {
          dragging = true;
          idle?.pause();
          gsap.killTweensOf(swing); // ferma un eventuale ritorno elastico
          gsap.set(swing, { willChange: "transform" });
        },
        onDragStart() {
          swing.classList.add("is-dragging");
        },
        onRelease() {
          dragging = false;
          swing.classList.remove("is-dragging");
          // Ricade alla verticale e oscilla: molla smorzata (effetto gravità).
          gsap.to(swing, {
            rotation: 0,
            duration: 1.3,
            ease: "elastic.out(1, 0.4)",
            onComplete: () => {
              gsap.set(swing, { willChange: "auto" });
              idle = makeIdle();
              idle.play();
            },
          });
        },
      });
    };

    const tl = gsap.timeline({
      scrollTrigger: { trigger: row, start: "top 68%", once: true },
      defaults: { force3D: true },
      onComplete: enablePendulum,
    });
    tl.set([swing, badge], { willChange: "transform, opacity" })
      .fromTo(
        cord,
        { scaleY: 0 },
        { scaleY: 1, duration: 0.9, ease: "power3.out" },
        0,
      )
      .fromTo(
        badge,
        { opacity: 0, y: -drop },
        { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" },
        0,
      )
      // Pendolo di assestamento attorno all'aggancio (transform-origin: top).
      .fromTo(
        swing,
        { rotation: 0 },
        { rotation: 3, duration: 0.5, ease: "sine.inOut" },
        0.6,
      )
      .to(swing, { rotation: -2, duration: 0.55, ease: "sine.inOut" })
      .to(swing, { rotation: 1, duration: 0.5, ease: "sine.inOut" })
      .to(swing, { rotation: 0, duration: 0.6, ease: "sine.out" });
  });

  // Percorso — la linea si disegna in scrub lungo la timeline, le tappe
  // entrano una a una.
  if (!reduceMotion && aboutPage.querySelector(".ap-line")) {
    gsap.fromTo(
      ".ap-line",
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".ap-timeline",
          start: "top 75%",
          end: "bottom 55%",
          scrub: 0.5,
        },
      }
    );
  }
  aboutPage.querySelectorAll<HTMLElement>(".ap-step").forEach((step) => {
    // Il badge-nodo entra come unità; i pezzi della card salgono in cascata.
    revealRise(
      step.querySelectorAll(":scope > .ap-step-art, :scope > .ap-step-body > *"),
      {
        trigger: step,
        start: "top 84%",
        stagger: 0.08,
        y: 30,
        duration: 0.8,
      }
    );
  });

  // Manifesto — la nota di rinforzo entra riga per riga nello spazio negativo.
  aboutPage.querySelectorAll<HTMLElement>("[data-ap-reveal]").forEach((el) => {
    revealRise(el.querySelectorAll(":scope > *"), {
      trigger: el,
      start: "top 86%",
      stagger: 0.12,
      y: 22,
      duration: 0.9,
    });
  });

  // Come lavoriamo — le card bento salgono in cascata; lo spotlight segue il
  // cursore aggiornando due var CSS (il gradient lo disegna la GPU).
  const flowCards = aboutPage.querySelectorAll<HTMLElement>("[data-flow-card]");
  if (flowCards.length) {
    revealRise(flowCards, {
      trigger: ".ap-flow-grid",
      start: "top 82%",
      stagger: 0.12,
      y: 56,
      duration: 1,
    });

    if (!reduceMotion && window.matchMedia("(min-width: 769px)").matches) {
      flowCards.forEach((card) => {
        const spot = card.querySelector<HTMLElement>(".flow-card-spot");
        if (!spot) return;
        card.addEventListener("mousemove", (e) => {
          const r = card.getBoundingClientRect();
          spot.style.setProperty("--mx", `${e.clientX - r.left}px`);
          spot.style.setProperty("--my", `${e.clientY - r.top}px`);
        });
      });
    }
  }
}

// ---------- Deco — parallasse leggera dei segni decorativi ----------
// Gli elementi [data-parallax] (curve di livello, segni di stampa) scorrono
// a una frazione della velocità di scroll: il fattore è nel data-attribute.
if (!reduceMotion) {
  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const speed = parseFloat(el.dataset.parallax || "0.15");
    gsap.fromTo(
      el,
      { y: speed * 240 },
      {
        y: speed * -240,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      }
    );
  });
}

// ---------- Service art — animazioni SVG gated da IntersectionObserver ----------
// Ogni cover .slide-media parte spenta: le @keyframes degli SVG (browser,
// dashboard, feed) sono dichiarate "paused" nel CSS. Quando il quadrato entra
// in viewport riceve .is-active e le animazioni partono in loop; uscendo si
// rimettono in pausa così non sprecano cicli fuori schermo. Gate reduced-motion
// (sotto reduced-motion il CSS mostra il fotogramma statico, niente loop).
if (!reduceMotion && "IntersectionObserver" in window) {
  const artObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-active", entry.isIntersecting);
      });
    },
    { threshold: 0.35 }
  );
  document
    .querySelectorAll<HTMLElement>(".slide-media")
    .forEach((el) => artObserver.observe(el));
}

// ---------- Footer — il ghost wordmark emerge in parallasse ----------
// Il wordmark gigante parte più in basso e risale a posto mentre il footer
// entra: l'ultima riga della pagina è anche l'ultimo movimento.
if (!reduceMotion) {
  gsap.fromTo(
    ".footer-ghost",
    { yPercent: 36 },
    {
      yPercent: 0,
      ease: "none",
      scrollTrigger: {
        trigger: ".site-footer",
        start: "top 95%",
        end: "bottom bottom",
        scrub: 0.6,
      },
    }
  );
}
