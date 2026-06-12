import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// ---------- Lenis smooth scroll ----------
const lenis = new Lenis({
  duration: 1.2,
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
    lenis.scrollTo(target, { duration: 1.5 });
  });
});

// ---------- Scroll progress bar ----------
const scrollFill = document.getElementById("scroll-fill");
if (scrollFill) {
  lenis.on("scroll", ({ scroll, limit }: { scroll: number; limit: number }) => {
    const pct = limit > 0 ? (scroll / limit) * 100 : 0;
    scrollFill.style.height = `${pct}%`;
  });
}

// ---------- Navbar blur fade-in on scroll ----------
// blur e opacity crescono insieme sui primi 150px di scroll:
// zero blur → blur(20px), opacity 0 → 1. Nessuno stacco.
const navBluBg = document.querySelector<HTMLElement>(".nav-blur-bg");
if (navBluBg) {
  const s = navBluBg.style as CSSStyleDeclaration & { webkitBackdropFilter: string };
  lenis.on("scroll", ({ scroll }: { scroll: number }) => {
    const t = Math.min(1, scroll / 150);
    const blurVal = `blur(${(t * 20).toFixed(2)}px) saturate(160%)`;
    s.backdropFilter = blurVal;
    s.webkitBackdropFilter = blurVal;
    s.opacity = String(t);
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
const navEl = document.querySelector<HTMLElement>("[data-anim='nav']");
if (navEl) {
  // La banda navy di Cosa Facciamo è gestita a parte (vedi sotto), perché il
  // suo pin sposta tutto ciò che segue e l'inversione va ancorata a chi-siamo.
  const darkZones: { sel: string; start: string; end: string }[] = [
    { sel: "[data-anim='contact']", start: "top 70", end: "bottom 130" },
  ];
  darkZones.forEach(({ sel, start, end }) => {
    if (!document.querySelector(sel)) return;
    ScrollTrigger.create({
      trigger: sel,
      start,
      end,
      toggleClass: { targets: navEl, className: "nav-on-dark" },
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
    .querySelectorAll<HTMLElement>(".works-title, .cta-title")
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
      scrollTrigger: { trigger, start: "top 80%" },
    }
  );
};
revealHead("[data-anim='services-head']", "#cosa-facciamo");

// ---------- Canvas — lo schermo cambia colore tra le sezioni ----------
// I colori di sezione non stanno sulle sezioni ma sul canvas .post-reveal:
// tre scrub lo tingono in sequenza — warm white → navy (entrando in Cosa
// Facciamo), navy → grigio bordo (entrando in Chi Siamo), poi di nuovo
// warm white (verso marquee e CTA). Tutti valori della palette.
// I background statici delle sezioni vengono resi trasparenti: restano solo
// come fallback per reduced-motion / no-JS.
if (!reduceMotion) {
  const canvas = document.querySelector<HTMLElement>(".post-reveal");
  if (canvas) {
    gsap.set(["#cosa-facciamo", "#chi-siamo"], { backgroundColor: "transparent" });

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
          scrollTrigger: { trigger, start, end, scrub: 0.4 },
        }
      );
    };

    morph("#cosa-facciamo", "top 85%", "top 15%", "#FAFAF8", "#1A2340");
    morph("#chi-siamo", "top 70%", "top 20%", "#1A2340", "#E8E8E5");
    morph(".marquee-section", "top 95%", "top 50%", "#E8E8E5", "#FAFAF8");
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

// Distanza di scroll della sezione pinnata: ~90vh per scena + coda finale.
const servicesPinDistance = () =>
  Math.round(window.innerHeight * (serviceSlides.length * 0.9 + 0.5));

// ---------- Navbar — zona scura della banda navy ----------
// Un solo trigger che attraversa la sezione pinnata si "accorcia" (lo span
// non compensa il pin): l'inversione si chiuderebbe subito. Quindi due
// trigger a elemento singolo con callback —
//   • accendi quando il navy si forma (cosa-facciamo, PRIMA del pin);
//   • spegni quando chi-siamo riporta il chiaro (stesso elemento-trigger dei
//     morph del colore, quindi posizione corretta col pin).
// onLeaveBack ripristina lo stato anche scrollando all'indietro.
const servicesSection = document.querySelector<HTMLElement>("#cosa-facciamo");
const aboutSection = document.querySelector<HTMLElement>("#chi-siamo");
if (navEl && servicesSection && aboutSection && serviceSlides.length) {
  const addDark = () => navEl.classList.add("nav-on-dark");
  const removeDark = () => navEl.classList.remove("nav-on-dark");

  ScrollTrigger.create({
    trigger: servicesSection,
    start: "top 40%",
    onEnter: addDark,
    onLeaveBack: removeDark,
  });
  ScrollTrigger.create({
    trigger: aboutSection,
    start: "top 40%",
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
  const info = slide.querySelectorAll(".slide-desc, .slide-tags");
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
  if (info.length) {
    tl.fromTo(
      info,
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.1 },
      at + 0.2
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
        scrub: 0.5,
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
    serviceSlides.forEach((slide) => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: slide, start: "top 80%" },
      });
      slideReveal(tl, slide, 0);
    });

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

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".about-intro",
        start: "top top",
        // Corsa proporzionale al numero di lettere: il riempimento resta
        // "preciso" (≈12px di scroll a lettera) a qualsiasi viewport.
        end: () => "+=" + Math.max(900, Math.round(chars.length * 12)),
        pin: true,
        scrub: 0.3,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // Come il pin dei servizi: ricalcolato prima dei trigger a valle,
        // così morph colore e marquee leggono le posizioni già spostate.
        refreshPriority: 1,
      },
    });

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
    // Coda: la frase resta piena e ferma prima dello sblocco.
    tl.to({}, { duration: chars.length * 0.14 });
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
      scrollTrigger: { trigger: ".about-intro", start: "top 70%" },
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
        scrollTrigger: { trigger: ch, start: "top 82%" },
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
        scrollTrigger: { trigger: duo, start: "top 80%" },
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
        scrollTrigger: { trigger: duo, start: "top 80%" },
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
      },
    }
  );
});

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

// ---------- Effetti legati alla VELOCITÀ di scroll ----------
// Un unico ScrollTrigger globale legge la velocità e la distribuisce:
// 1. il marquee accelera quando si scrolla forte e decanta verso la velocità
//    di crociera (il loop CSS viene sostituito da un tween GSAP equivalente);
// 2. la rail dei progetti si inclina di qualche frazione di grado nel verso
//    dello scroll e si raddrizza subito — l'inerzia di un oggetto fisico.
if (!reduceMotion) {
  const marqueeTrack = document.querySelector<HTMLElement>(".marquee-track");
  let marqueeTween: gsap.core.Tween | null = null;
  if (marqueeTrack) {
    marqueeTrack.classList.add("is-js");
    marqueeTween = gsap.to(marqueeTrack, {
      xPercent: -50,
      duration: 36,
      ease: "none",
      repeat: -1,
    });
  }

  const rail = document.querySelector<HTMLElement>(".works-rail");
  const railSkew = rail
    ? gsap.quickTo(rail, "skewY", { duration: 0.4, ease: "power2.out" })
    : null;

  let marqueeDecay: gsap.core.Tween | null = null;
  let skewReset: gsap.core.Tween | null = null;

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate(self) {
      const v = self.getVelocity();

      if (marqueeTween) {
        marqueeTween.timeScale(1 + Math.min(Math.abs(v) / 700, 4));
        marqueeDecay?.kill();
        marqueeDecay = gsap.to(marqueeTween, {
          timeScale: 1,
          duration: 1.6,
          ease: "power2.out",
        });
      }

      if (railSkew) {
        railSkew(gsap.utils.clamp(-1.4, 1.4, v / 900));
        skewReset?.kill();
        skewReset = gsap.delayedCall(0.15, () => railSkew(0));
      }
    },
  });
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
      panel.addEventListener("pointerenter", () => {
        railEl.classList.add("is-engaged");
        panels.forEach((other) =>
          other.classList.toggle("is-active", other === panel)
        );
      });
    });
    railEl.addEventListener("pointerleave", () => {
      railEl.classList.remove("is-engaged");
      panels.forEach((other) => other.classList.remove("is-active"));
    });
  }
}

// ---------- Pagina /chi-siamo ----------
// Le coreografie condivise (glow, capitoli, tilt founder, marquee, CTA,
// footer) si agganciano da sole alle stesse classi; qui vive solo ciò che
// è esclusivo della pagina: l'entrata della hero, i ritratti del duo e la
// timeline del percorso.
const aboutPage = document.querySelector<HTMLElement>(".aboutpage");
if (aboutPage) {
  // Hero — badge, titolo dalla maschera parola per parola, sottotitolo, hint.
  // Il titolo parte con opacity: 0 inline (anti-flash prima dello split);
  // qui viene riacceso in entrambi i rami.
  const apTitle = aboutPage.querySelector<HTMLElement>(".ap-hero-title");
  if (apTitle) {
    if (reduceMotion) {
      gsap.set(apTitle, { opacity: 1 });
    } else {
      const words = splitTitleWords(apTitle);
      gsap.set(apTitle, { opacity: 1 });
      gsap.fromTo(
        words,
        { yPercent: 115, rotate: 5 },
        {
          yPercent: 0,
          rotate: 0,
          duration: 1.1,
          ease: "power4.out",
          stagger: 0.08,
          delay: 0.55,
        }
      );
    }
  }
  const apHeroBits: { sel: string; delay: number }[] = [
    { sel: ".ap-hero .hero-badge", delay: 0.45 },
    { sel: ".ap-hero-sub", delay: 1.0 },
    { sel: ".ap-hero .hero-scroll-hint", delay: 1.25 },
  ];
  apHeroBits.forEach(({ sel, delay }) => {
    if (!aboutPage.querySelector(sel)) return;
    gsap.fromTo(
      sel,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay }
    );
  });

  // Duo — ogni riga entra come scena: prima il ritratto, poi la bio a pezzi.
  aboutPage.querySelectorAll<HTMLElement>(".ap-person").forEach((row) => {
    revealRise(row.querySelectorAll(":scope > .founder-card, .ap-bio > *"), {
      trigger: row,
      start: "top 78%",
      stagger: 0.1,
      y: 44,
      duration: 0.9,
    });
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
    revealRise(step.querySelectorAll(":scope > *"), {
      trigger: step,
      start: "top 84%",
      stagger: 0.1,
      y: 30,
      duration: 0.8,
    });
  });
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

// ---------- Hero — il cerchio sketch si disegna attorno a "prossima" ----------
// Lo stroke parte "non disegnato" (dashoffset = lunghezza) e si traccia in
// un solo gesto dopo l'entrata della riga. One-shot, non legato allo scroll.
const sketchPath = document.querySelector<SVGPathElement>(".circle-sketch path");
if (sketchPath && !reduceMotion) {
  const len = sketchPath.getTotalLength();
  gsap.set(sketchPath, { strokeDasharray: len, strokeDashoffset: len });
  gsap.to(sketchPath, {
    strokeDashoffset: 0,
    duration: 1.1,
    ease: "power2.inOut",
    delay: 1.4,
  });
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
