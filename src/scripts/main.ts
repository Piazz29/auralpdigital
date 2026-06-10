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

  document.querySelectorAll("a, button, .service-row, .menu-link").forEach((el) => {
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

// ---------- Lavori selezionati — entrata header + pannelli ----------
gsap.fromTo(
  "[data-anim='works-head']",
  { opacity: 0, y: 24 },
  {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: "power2.out",
    stagger: 0.12,
    scrollTrigger: {
      trigger: ".works-rail",
      start: "top 85%",
    },
  }
);
gsap.fromTo(
  "[data-anim='work-panel']",
  { opacity: 0, y: 72, scale: 0.96 },
  {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 1.0,
    ease: "power3.out",
    stagger: 0.12,
    scrollTrigger: {
      trigger: ".works-rail",
      start: "top 82%",
    },
  }
);

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
revealHead("[data-anim='about-head']", "#chi-siamo");

// ---------- Service rows entrance ----------
gsap.fromTo(
  "[data-anim='service-row']",
  { opacity: 0, y: 30 },
  {
    opacity: 1,
    y: 0,
    duration: 0.7,
    ease: "power2.out",
    stagger: 0.08,
    scrollTrigger: {
      trigger: "[data-anim='services']",
      start: "top 80%",
    },
  }
);

// ---------- Servizi — anteprima flottante che segue il cursore ----------
// Una sola wrapper fissa (#service-float) con dentro una card per servizio;
// in hover sulla riga si attiva la card giusta e la wrapper insegue il mouse
// con gsap.quickTo (lerp fluido). Una rotazione leggera legata alla velocità
// orizzontale dà l'effetto "trascinato". Solo desktop, mai con reduced motion.
const floatWrap = document.getElementById("service-float");
const servicesList = document.querySelector<HTMLElement>(".services-list");
if (
  floatWrap &&
  servicesList &&
  !reduceMotion &&
  window.matchMedia("(min-width: 1024px)").matches
) {
  const floatCards =
    floatWrap.querySelectorAll<HTMLElement>(".service-float-card");

  const xTo = gsap.quickTo(floatWrap, "x", { duration: 0.5, ease: "power3" });
  const yTo = gsap.quickTo(floatWrap, "y", { duration: 0.5, ease: "power3" });
  const rTo = gsap.quickTo(floatWrap, "rotation", {
    duration: 0.6,
    ease: "power3",
  });

  let lastX = 0;
  let settleRot: gsap.core.Tween | null = null;

  servicesList.addEventListener("mousemove", (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    // Inclinazione proporzionale alla velocità orizzontale, poi rientra a 0.
    rTo(gsap.utils.clamp(-9, 9, (e.clientX - lastX) * 0.55));
    lastX = e.clientX;
    settleRot?.kill();
    settleRot = gsap.delayedCall(0.12, () => rTo(0));
  });

  servicesList.querySelectorAll<HTMLElement>(".service-row").forEach((row) => {
    row.addEventListener("mouseenter", () => {
      const idx = row.dataset.service;
      floatCards.forEach((c) =>
        c.classList.toggle("is-active", c.dataset.float === idx)
      );
    });
  });

  servicesList.addEventListener("mouseenter", (e) => {
    // Posiziona subito sul punto d'ingresso per evitare il volo dall'origine.
    gsap.set(floatWrap, { x: e.clientX, y: e.clientY });
    lastX = e.clientX;
    gsap.to(floatWrap, {
      opacity: 1,
      scale: 1,
      duration: 0.45,
      ease: "back.out(1.6)",
    });
  });
  servicesList.addEventListener("mouseleave", () => {
    gsap.to(floatWrap, {
      opacity: 0,
      scale: 0.7,
      duration: 0.3,
      ease: "power2.in",
    });
  });
}

// ---------- Chi Siamo — statement parola-per-parola in scrub ----------
// Le parole partono quasi spente e si "accendono" in sequenza mentre lo
// statement attraversa il viewport. Con reduced motion restano piene.
const stWords = gsap.utils.toArray<HTMLElement>(".st-word");
if (stWords.length) {
  if (reduceMotion) {
    gsap.set(stWords, { opacity: 1 });
  } else {
    gsap.fromTo(
      stWords,
      { opacity: 0.12 },
      {
        opacity: 1,
        ease: "none",
        stagger: 0.06,
        scrollTrigger: {
          trigger: ".about-statement",
          start: "top 78%",
          end: "bottom 45%",
          scrub: 0.6,
        },
      }
    );
  }
}

// ---------- Chi Siamo — founder card + colonna testo ----------
gsap.fromTo(
  "[data-anim='founder']",
  { opacity: 0, y: 50 },
  {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: "power3.out",
    stagger: 0.14,
    scrollTrigger: {
      trigger: ".about-grid",
      start: "top 80%",
    },
  }
);

// ---------- Stats — entrata + count-up ----------
gsap.fromTo(
  "[data-anim='stat']",
  { opacity: 0, y: 40 },
  {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: "power2.out",
    stagger: 0.15,
    scrollTrigger: {
      trigger: "[data-anim='stats']",
      start: "top 85%",
    },
  }
);

document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
  const target = Number(el.dataset.count ?? 0);
  if (reduceMotion) {
    el.textContent = String(target);
    return;
  }
  const counter = { v: 0 };
  gsap.to(counter, {
    v: target,
    duration: 1.8,
    ease: "power3.out",
    scrollTrigger: {
      trigger: el,
      start: "top 88%",
    },
    onUpdate: () => {
      el.textContent = String(Math.round(counter.v));
    },
  });
});

// ---------- CTA finale — reveal del pannello + contenuti in cascata ----------
gsap.fromTo(
  ".cta-panel",
  { opacity: 0, y: 90, scale: 0.96 },
  {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 1.1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: "[data-anim='contact']",
      start: "top 78%",
    },
  }
);

const ctaInner: { sel: string; delay: number; y?: number }[] = [
  { sel: "[data-anim='contact-kicker']", delay: 0.2, y: 16 },
  { sel: "[data-anim='contact-headline']", delay: 0.32, y: 40 },
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
