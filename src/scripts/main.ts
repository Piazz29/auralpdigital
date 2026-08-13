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

// ---------- Ritardo unico dello scroll ----------
// Ogni animazione agganciata allo scroll (uscita della hero, zoom del suo
// video, passaggio di Chi Siamo, virata di colore del canvas) insegue lo
// scroll con un filo di inerzia. Se ognuna usa un ritardo diverso le scene si
// slegano: una arriva prima, l'altra dopo, e la pagina sembra fatta di pezzi
// indipendenti. Con un valore SOLO, condiviso, tutto viaggia con lo stesso
// respiro e le sezioni si passano la scena senza scalini.
const SCRUB = 0.6;
// Stessa inerzia, ma per le animazioni che pilotiamo a mano frame per frame
// (il riempimento delle lettere): un lerp con questo coefficiente ha la
// costante di tempo di uno scrub SCRUB, quindi decelera insieme al resto.
const SCRUB_LERP = 1 - Math.exp(-1 / (60 * (SCRUB / 2)));

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

// ---------- Scroll programmati "bloccanti" + valvola di sicurezza ----------
// Alcuni movimenti li facciamo fare a Lenis bloccando l'input per la loro
// durata (`lock`): serve a non far sommare l'inerzia dell'utente al movimento
// — è quello che tiene netti i cambi di scena nei Servizi.
//
// PERÒ Lenis toglie il lock SOLO quando l'animazione arriva in fondo: se
// viene interrotta a metà (un refresh di ScrollTrigger, un resize, un'altra
// scrollTo) `isLocked` resta acceso per sempre. E siccome da bloccato la
// rotella viene ignorata, non arriva nessun evento di scroll: la pagina
// sembra congelata e non c'è niente che possa rimetterla in moto.
//
// Quindi: ogni scroll bloccante dichiara fino a quando è lecito restare
// bloccati, e un controllo a ogni frame libera il lock appena quella
// finestra è scaduta. Costa un confronto per frame e rende impossibile
// restare inchiodati.
let lockedUntil = 0;
const lockedScrollTo = (
  target: number | HTMLElement,
  duration: number,
  extra: Record<string, unknown> = {}
) => {
  lockedUntil = performance.now() + duration * 1000 + 400;
  lenis.scrollTo(target, { duration, lock: true, force: true, ...extra });
};

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
  if (lenis.isLocked && performance.now() > lockedUntil) lenis.isLocked = false;
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
      lockedScrollTo(target, 0.7);
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
  // La card scura (ContainerScroll) è CENTRATA e più stretta del viewport: il
  // logo (estrema sinistra) e le icone/lingue (estrema destra) della navbar
  // cadono sui MARGINI chiari della pagina, NON sopra la card. Invertire a
  // bianco lì rendeva logo e icone invisibili su sfondo chiaro non appena la
  // card saliva sotto la navbar. In tutta l'ultima parte della home lo sfondo
  // dietro la navbar è chiaro → la navbar resta nella variante scura (default,
  // leggibile). Nessun darkZone per la sezione form.
  const darkZones: { sel: string; start: string; end: string }[] = [];
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
          scrub: SCRUB, // ritardo condiviso con tutto il resto della pagina
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
  //
  // La corsa è la STESSA dello zoom del video qui sopra (tutta la hero) e la
  // stessa su cui Chi Siamo comincia a salire: le tre animazioni condividono
  // inizio, fine e ritardo, quindi la consegna tra le due sezioni è un gesto
  // unico invece di tre movimenti scollegati. Il testo resta comunque più
  // veloce del video — la parallasse è nella differenza di spostamento, non
  // in una durata diversa.
  if (!reduceMotion) {
    const heroExit = {
      trigger: ".hero-section",
      start: "top top",
      end: "bottom top",
      scrub: SCRUB,
    };
    // Il MOVIMENTO occupa tutta la corsa della hero: è questo che va a tempo
    // con l'ingresso di Chi Siamo.
    gsap.to("[data-anim='hero-content']", {
      yPercent: -28,
      ease: "none",
      scrollTrigger: { ...heroExit },
    });
    // La DISSOLVENZA invece si consuma subito (power2.out) sulla stessa corsa:
    // il blocco continua a salire in sincrono, ma è già trasparente prima di
    // passare sotto la navbar, senza lasciarci sopra un fantasma di testo.
    gsap.to("[data-anim='hero-content']", {
      opacity: 0,
      ease: "power2.out",
      scrollTrigger: { ...heroExit },
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

// HOME — i titoli NON hanno comparse: sono già lì, fermi, dal primo scroll.
// Il marcatore lo mette HomePage.astro sul contenitore del contenuto; le altre
// pagine (chi-siamo, faq) conservano il reveal parola per parola.
const isHome = !!document.querySelector("[data-home]");

if (!reduceMotion && !isHome) {
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

// ---------- Header di sezione — stesso reveal per Servizi e Chi Siamo ----------
// Riusa il linguaggio dell'header "Lavori selezionati": fade + rise con
// stagger tra titolo e meta-strip, agganciato alla sezione che li contiene.
const revealHead = (selector: string, trigger: string, start = "top 80%") => {
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
      scrollTrigger: { trigger, start, once: true },
    }
  );
};
// (In home il titolo dei Servizi non ha reveal: vedi `isHome` più sopra.)

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
const pointText = pointSection?.querySelector<HTMLElement>("[data-point-text]");
const pointInk = pointSection?.querySelector<HTMLElement>("[data-point-ink]");
const pointAccent =
  pointSection?.querySelector<HTMLElement>("[data-point-accent]");

if (pointSection && pointLogo && pointText && pointInk && pointAccent && !reduceMotion) {
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
    textHideAt: 0.36, // progress (0→1): risalendo, soglia di RITIRO — alzata così il testo inizia a dissolversi mentre il logo è ANCORA sfocato (no momento "entrambi nitidi"); resta < textRevealAt (isteresi)
    charDur: 0.5, // durata (s) dell'ingresso di ogni lettera
    charStaggerAmount: 0.9, // secondi su cui è distribuito lo stagger di TUTTE le lettere (più alto = cascata più lenta)
    charFromX: -22, // px — scostamento orizzontale iniziale di ogni lettera (negativo = entra da sinistra)
    charEase: "power3.out", // ease morbida del movimento di ogni lettera
    // Uscita risalendo: dissolvenza MORBIDA (blur + opacità) dell'intero blocco
    // testo, SENZA scorrimento laterale. Parte appena il logo torna verso il
    // nitido e si completa prima che lo sia del tutto → mai "entrambi nitidi".
    textHideDur: 0.55, // durata (s) della dissolvenza in uscita
    textHideBlur: 12, // px — sfocatura raggiunta dal testo mentre svanisce
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
  // Blocco testo: contenitore visibile e nitido; le singole lettere partono
  // nascoste (scostate in orizzontale + trasparenti). La dissolvenza in uscita
  // agisce sul CONTENITORE (blur + opacità), il reveal in entrata sulle lettere.
  gsap.set(pointText, { autoAlpha: 1, filter: "blur(0px)", willChange: "filter, opacity" });
  gsap.set(chars, { autoAlpha: 0, x: PT.charFromX });

  // Reveal del testo come timeline A TEMPO, in pausa finché lo scroll non
  // supera la soglia: cascata orizzontale lettera-per-lettera (entrata da
  // sinistra + fade), sempre fluida e indipendente dagli scatti dello scroll.
  const lettersTl = gsap.timeline({ paused: true });
  lettersTl.to(chars, {
    autoAlpha: 1,
    x: 0,
    duration: PT.charDur,
    ease: PT.charEase,
    stagger: { amount: PT.charStaggerAmount },
  });
  let textRevealed = false;
  let hideTween: gsap.core.Tween | null = null;

  // SCENDENDO: il testo entra (cascata laterale invariata). Reset esplicito del
  // contenitore (nitido, opaco) e delle lettere allo stato iniziale, così la
  // cascata riparte pulita anche dopo una dissolvenza in uscita.
  const revealText = () => {
    hideTween?.kill();
    hideTween = null;
    gsap.set(pointText, { autoAlpha: 1, filter: "blur(0px)" });
    gsap.set(chars, { autoAlpha: 0, x: PT.charFromX });
    lettersTl.play(0);
  };

  // RISALENDO: il testo NON si ritira di lato. Svanisce con una dissolvenza
  // morbida (blur + opacità crescenti) di tutto il blocco, mentre il logo sotto
  // sta tornando nitido → niente scorrimento laterale, niente "entrambi nitidi".
  const hideText = () => {
    lettersTl.pause();
    hideTween?.kill();
    hideTween = gsap.to(pointText, {
      autoAlpha: 0,
      filter: `blur(${PT.textHideBlur}px)`,
      duration: PT.textHideDur,
      ease: "power2.in",
      overwrite: "auto",
    });
  };

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
      // Priorità massima: è il PRIMO pin della pagina, dev'essere ricalcolato
      // per primo così il suo spacer è in posizione quando i trigger a valle
      // (morph colore canvas, pin Servizi/Progetti) leggono le coordinate.
      // Scala per posizione: pointSection 4 > servizi 3 > progetti 2 >
      // morph 0. Chi Siamo non pinna più nulla: non entra in questa scala.
      refreshPriority: 4,
      onUpdate: (self) => {
        // Reveal a tempo (sempre fluido), lo scroll fa solo da grilletto. Soglie
        // ASIMMETRICHE: scendendo il testo compare a `textRevealAt` (logo che si
        // sfoca); risalendo si ritira solo a `textHideAt`, cioè quando il logo
        // torna nitido. Tra le due soglie lo stato resta com'è (isteresi).
        const p = self.progress;
        if (!textRevealed && p >= PT.textRevealAt) {
          textRevealed = true;
          revealText();
        } else if (textRevealed && p <= PT.textHideAt) {
          textRevealed = false;
          hideText();
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
    hideTween?.kill();
    splitInk.revert();
    splitAccent.revert();
  });
}

// ---------- Canvas — UN SOLO colore per tutta la fascia sotto la hero --------
// Il canvas (.post-reveal) resta sempre sulla CARTA base (--color-bg): niente
// più virata verso la sabbia avorio entrando in Chi Siamo e ritorno al warm
// white nei Servizi. Quel morph era l'unico punto in cui il fondo cambiava
// tono, e proprio sulla giunzione con la hero: toglierlo è ciò che rende il
// passaggio hero → Chi Siamo continuo (stesso identico bianco carta sopra e
// sotto il confine). Le sezioni scure che servono (CTA, footer) hanno il
// proprio fondo e non passano di qui.
// Le sezioni restano trasparenti: il colore lo dà il canvas sotto.
if (!reduceMotion) {
  gsap.set(["#cosa-facciamo", "#projects", "#chi-siamo"], {
    backgroundColor: "transparent",
  });
}

// ---------- Cosa Facciamo — due modi, una regia sola ----------
// La sezione si blocca (pin) e lo scroll avanza di scena in scena. Come si
// vede il cambio dipende dall'impaginazione (la sceglie il CSS con
// --svc-mode, qui si legge e basta):
//
//   SWAP (desktop)  card e testo si scambiano i due posti del palco: card
//                   destra → sinistra → destra, testo l'opposto. I pannelli
//                   immagine NON si muovono — ce n'è uno fermo per posto (il
//                   muro si controtrasla rispetto alla card). A spostarsi è
//                   solo la card, che durante il viaggio fa da cornice e
//                   scopre il pannello dell'altro posto: a metà corsa se ne
//                   vedono due affiancati. A card ferma non scorre niente.
//
//   REEL (mobile)   niente card: la clip riempie la schermata e il fondale
//                   successivo sale a tutta altezza, con la descrizione
//                   ferma in basso che si dà il cambio in dissolvenza.
//
// Le distanze sono misurate dal layout a ogni refresh (offset* degli strati,
// che ignorano i transform): nessuna geometria duplicata nel JS.
//
// Con reduced-motion niente pin: il componente resta senza `.is-live` e il
// CSS lo mostra come griglia statica (card + testi in colonna).
const svcRoot = document.querySelector<HTMLElement>("[data-svc]");
const svcScene = document.querySelector<HTMLElement>("[data-svc-scene]");
const svcFrame = document.querySelector<HTMLElement>("[data-svc-frame]");
const svcTrack = document.querySelector<HTMLElement>("[data-svc-track]");
const svcShots = gsap.utils.toArray<HTMLElement>("[data-svc-shot]");
// Il CONTENITORE delle descrizioni (il secondo posto del palco) e le singole
// descrizioni: il primo serve a misurare la distanza fra i due posti.
const svcCopyWrap = document.querySelector<HTMLElement>("[data-svc-copies]");
const svcCopies = gsap.utils.toArray<HTMLElement>("[data-svc-copy]");
const svcFills = gsap.utils.toArray<HTMLElement>("[data-svc-fill]");
const servicesSection = document.querySelector<HTMLElement>("#cosa-facciamo");

if (
  svcRoot &&
  svcScene &&
  svcFrame &&
  svcTrack &&
  svcCopyWrap &&
  svcShots.length &&
  !reduceMotion
) {
  const N = svcShots.length;
  svcRoot.classList.add("is-live");
  servicesSection?.classList.add("is-pin-mode");

  // Contratto con il CSS (vedi .svc in global.css).
  let reel = false; // modo fondale a tutta schermata (mobile)?
  let vertical = false; // movimento sull'asse y?
  let travel = 0; // swap: px fra il posto della card e quello del testo
  let pitch = 0; // reel: px di avanzamento del fondale per scena

  // Modo SWAP — spostamento della card nella scena i: posto di partenza (0)
  // sulle scene pari, posto dell'altro sulle dispari. Nel modo REEL la
  // cornice non si muove mai.
  const frameAt = (i: number) => {
    if (reel) return 0;
    return i % 2 === 0 ? 0 : vertical ? travel : -travel;
  };

  const measure = () => {
    const cs = getComputedStyle(svcRoot);
    reel = cs.getPropertyValue("--svc-mode").trim() === "reel";
    vertical = cs.getPropertyValue("--svc-axis").trim() === "y";
    // Letti dal layout: offset* ignora i transform, quindi le misure restano
    // corrette anche a scena già mossa.
    travel = vertical
      ? svcCopyWrap.offsetTop - svcFrame.offsetTop
      : svcFrame.offsetLeft - svcCopyWrap.offsetLeft;
    pitch = vertical ? svcFrame.offsetHeight : svcFrame.offsetWidth;

    // Posizione di riposo di ogni pannello:
    //  · swap → resta FERMO nel posto della sua scena (non si muove mai);
    //  · reel → è in fila, una schermata più in là del precedente.
    svcShots.forEach((el, k) => {
      const at = reel ? k * pitch : frameAt(k);
      el.style.transform = vertical
        ? `translate3d(0, ${at}px, 0)`
        : `translate3d(${at}px, 0, 0)`;
    });
    // L'asse inattivo resta a zero (il movimento avviene su uno solo).
    gsap.set([svcFrame, svcTrack], vertical ? { x: 0 } : { y: 0 });
  };

  const setFrame = (v: number) =>
    gsap.set(svcFrame, vertical ? { y: v } : { x: v });
  const setTrack = (v: number) =>
    gsap.set(svcTrack, vertical ? { y: v } : { x: v });

  // `p` = indice continuo della scena (0 → N-1): lo muove la timeline in
  // scrub, tutto il resto è calcolato da qui (idempotente, quindi corretto
  // anche scrollando all'indietro).
  const state = { p: 0 };

  const apply = () => {
    const p = state.p;
    const i = Math.max(0, Math.min(N - 2, Math.floor(p)));
    const t = gsap.utils.clamp(0, 1, p - i);
    const pos = frameAt(i) + (frameAt(i + 1) - frameAt(i)) * t;

    setFrame(pos);
    // swap → controtraslazione: i pannelli restano fermi nello spazio e la
    // card ci scorre sopra come una finestra.
    // reel → il muro avanza di una schermata per scena dentro alla cornice
    // ferma: il fondale successivo sale.
    setTrack(reel ? -p * pitch : -pos);

    // Le scene pari condividono lo stesso posto (01 e 03): fuori dalla propria
    // corsa il pannello si spegne, così non copre mai quello di turno. Lo
    // stacco avviene quando è già fuori dalla cornice, quindi non si vede.
    svcShots.forEach((el, k) => {
      el.style.opacity = Math.abs(p - k) < 1.001 ? "1" : "0";
    });

    // Descrizioni: nel modo swap stanno nel posto lasciato libero dalla card
    // (pari = posto di partenza, dispari = l'altro), nel modo reel sempre in
    // basso sul fondale. In entrambi i casi non viaggiano: si danno il cambio
    // in dissolvenza con una deriva di pochi px.
    svcCopies.forEach((el, k) => {
      // Finestra di dissolvenza stretta (0.3 di scena): la descrizione entra
      // solo quando la card ha ormai liberato il suo posto, così le due cose
      // non si sovrappongono mai a metà corsa.
      const a = 1 - gsap.utils.clamp(0, 1, Math.abs(p - k) / 0.3);
      const eased = a * a * (3 - 2 * a); // smoothstep: niente stacchi secchi
      const slot = -frameAt(k); // opposto a quello della card
      const drift = (p - k) * -18;
      el.style.opacity = String(eased);
      el.style.transform = vertical
        ? `translate3d(0, ${(slot + drift).toFixed(2)}px, 0)`
        : `translate3d(${slot}px, ${drift.toFixed(2)}px, 0)`;
      // La scena fuori fuoco esce anche dal tab order e dallo screen reader
      // (inert): non ci sono tre link "Parliamone" sovrapposti e invisibili.
      const off = eased <= 0.5;
      el.style.pointerEvents = off ? "none" : "auto";
      el.inert = off;
    });

    // Puntini: quello della scena a fuoco si riempie mentre la corsa avanza.
    svcFills.forEach((el, k) => {
      el.style.transform = `scale(${gsap.utils.clamp(0, 1, p - k + 1).toFixed(3)})`;
    });
  };

  measure();
  apply();

  // ---- Passi discreti: una scrollata = un cambio intero ----
  // Dentro alla sezione lo scroll NON pilota più l'animazione fotogramma per
  // fotogramma (niente scrub): fa da INTERRUTTORE. Basta un accenno di scroll
  // e la transizione parte e arriva in fondo da sola, sempre alla stessa
  // velocità; finché non ha finito, altri scroll non fanno niente. Così non
  // esistono stati "a metà" — la scena è sempre o una o l'altra, il che conta
  // ancora di più quando dentro alle card ci saranno delle clip.
  //
  // Lo scroll però deve restare coerente con la scena a fuoco, altrimenti al
  // giro dopo la sezione ripartirebbe da un punto sbagliato: a ogni cambio il
  // pin viene riportato all'ancora della nuova scena con lenis.scrollTo in
  // `lock` (input bloccato per la durata), quindi un colpo di rotella vale un
  // cambio solo e la coda d'inerzia non ne fa scattare un secondo.
  const STEP_VH = 0.7; // quanto scroll "occupa" una scena dentro al pin
  const STEP_TIME = 0.75; // durata del cambio, in secondi
  const TRIGGER_PX = 16; // scroll minimo che fa scattare il cambio
  // Cuscinetto ai due estremi del pin: le ancore della prima e dell'ultima
  // scena NON stanno sul bordo, se no il minimo sussulto uscirebbe e
  // rientrerebbe nella sezione (e ogni rientro la ri-ancorerebbe, bloccando
  // di fatto ogni avanzamento). Con il cuscinetto per uscire serve una
  // scrollata vera, e dentro si cambia scena e basta.
  const EDGE_PAD = 90;

  const svcPinDistance = () =>
    Math.round(window.innerHeight * STEP_VH) * (N - 1) + EDGE_PAD * 2;

  let st: ScrollTrigger | null = null;
  let index = 0; // scena a fuoco
  // "Cambio in corso" è una SCADENZA, non un interruttore: si spegne da sé al
  // passare del tempo. Un flag booleano dipenderebbe da una callback per
  // tornare false, e se quella non arrivasse (animazione interrotta) la
  // sezione resterebbe sorda a ogni scroll.
  let busyUntil = 0;
  const isBusy = () => performance.now() < busyUntil;

  const anchorOf = (i: number) => {
    if (!st) return 0;
    const span = st.end - st.start - EDGE_PAD * 2;
    return st.start + EDGE_PAD + (span * i) / (N - 1);
  };

  // Ignora l'input per la durata del movimento (più un filo di margine).
  const holdFor = (seconds: number) => {
    busyUntil = performance.now() + seconds * 1000 + 120;
  };

  const goTo = (target: number) => {
    const next = gsap.utils.clamp(0, N - 1, target);
    if (next === index || isBusy()) return;
    index = next;
    holdFor(STEP_TIME);
    gsap.to(state, {
      p: next,
      duration: STEP_TIME,
      ease: "power2.inOut",
      overwrite: true,
      onUpdate: apply,
    });
    lockedScrollTo(anchorOf(next), STEP_TIME, {
      easing: (t: number) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    });
  };

  // Atterraggio all'ingresso: scena e scroll allineati di netto, senza
  // animazione — la sezione "accoglie" l'inerzia con cui la si raggiunge
  // invece di lasciarsene attraversare mezza.
  const land = (i: number) => {
    index = i;
    state.p = i;
    apply();
    holdFor(0.3);
    lockedScrollTo(anchorOf(i), 0.3);
  };

  st = ScrollTrigger.create({
    trigger: "#cosa-facciamo",
    start: "top top",
    end: () => "+=" + svcPinDistance(),
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    // Primo pin della pagina: si ricalcola prima di progetti (2), chi-siamo
    // (1) e morph (0), così ogni spacer a valle legge posizioni già spostate.
    refreshPriority: 3,
    onRefresh: () => {
      measure();
      apply();
    },
    onUpdate: (self) => {
      if (isBusy()) return;
      const delta = self.scroll() - anchorOf(index);
      if (delta > TRIGGER_PX) goTo(index + 1);
      else if (delta < -TRIGGER_PX) goTo(index - 1);
    },
    onEnter: () => land(0),
    onEnterBack: () => land(N - 1),
  });

  // Arrivo ammortizzato: il palco sale e si accende PRIMA che la sezione si
  // blocchi, in scrub condiviso — così il pin non arriva di colpo su una
  // scena ferma, ma chiude un movimento già in corso. Parte appena il palco
  // spunta dal bordo basso (la sezione risale dentro alla coda di "Chi
  // siamo", vedi il margine negativo in global.css): mentre la frase esce
  // dall'alto, questo sale da sotto — nessuna fascia vuota fra le due.
  gsap.fromTo(
    svcScene,
    { autoAlpha: 0, y: 56 },
    {
      autoAlpha: 1,
      y: 0,
      ease: "none",
      scrollTrigger: {
        trigger: svcScene,
        start: "top bottom",
        end: "top 52%",
        scrub: SCRUB,
      },
    }
  );

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

// ---------- Chi Siamo — la frase scivola sopra la montagna ----------------
// NIENTE PIN: la pagina non si blocca mai. La sezione è lunga (vedi
// .about-intro in global.css) e la attraversano DUE STRATI INDIPENDENTI a
// velocità diverse:
//   · il fondale video sale più LENTO della pagina (≈0.82×)
//   · la frase sale più VELOCE (≈1.13×)
// La differenza tra le due è lo scivolamento: il testo scorre sopra la
// montagna invece di essere incollato ad essa. Mentre scorre, le lettere
// passano da grigio "vuoto" a colorato (ink, accent per i corsivi), una a una
// in ordine di lettura.
//
// L'ENTRATA (blocco "staffetta" più sotto) NON è una comparsa: il fondale è
// pieno da subito, si vede appena la sezione entra da sotto la hero. L'unica
// cosa che compare è il TESTO, che sale con una parallasse tutta sua mentre la
// hero esce. Il fondale intanto non sfuma: si MUOVE — parallasse lenta più una
// scala che raccoglie lo zoom del video della hero (1.12 → 1) e lo scarica.
//
// Il riempimento NON è agganciato alla progress della sezione ma alla
// posizione REALE della frase nel viewport: così si autoregola su qualunque
// schermo, qualunque sia l'altezza che il blocco di testo finisce per avere
// (desktop, mobile, lingue più lunghe come il tedesco).
// Con reduced motion non parte nulla: frase piena e statica sul fondale.
const aboutStatement = document.querySelector<HTMLElement>(
  "[data-about-statement]"
);
const aboutSection = document.querySelector<HTMLElement>("#chi-siamo");
if (aboutStatement && aboutSection && !reduceMotion) {
  const chars = splitGlowChars(aboutStatement);
  if (chars.length) {
    // Un filo più marcato del vecchio 0.16: senza velo davanti al video le
    // lettere "vuote" sparivano del tutto sul mosso della montagna.
    const GRAY = "rgba(23, 19, 16, 0.22)";
    const INK = "#171310";
    const ACCENT = "#3B5BDB";
    gsap.set(chars, { color: GRAY });

    // Timeline del riempimento, in PAUSA: la posizione non la decide uno
    // scrub ma noi (vedi il ticker più sotto). Un tween per lettera, in
    // sequenza: 1 unità di timeline = 1 lettera, duration < 1 → ogni lettera
    // "scatta" piena prima che parta la successiva, niente sovrapposizioni.
    const fillTl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    chars.forEach((c, i) => {
      const isEm = c.parentElement?.classList.contains("gw-em");
      fillTl.to(c, { color: isEm ? ACCENT : INK, duration: 0.6 }, i);
    });

    // Corsa condivisa dai due strati: tutta la traversata della sezione.
    const pass = {
      trigger: aboutSection,
      start: "top bottom",
      end: "bottom top",
      scrub: SCRUB,
      invalidateOnRefresh: true,
    };

    // FONDALE — più lento della pagina, di una frazione decisa qui.
    //
    // Un fondale che rallenta si STACCA dal bordo della sezione: mentre la
    // pagina sale di 1, lui sale di MEDIA_SPEED, quindi tra la fine della hero
    // e la cima del video si apre una fascia di pagina nuda che vale, al
    // massimo, esattamente (1 − MEDIA_SPEED) × viewport. Non è un margine da
    // togliere: è aritmetica, l'unico modo per chiuderla senza rinunciare alla
    // parallasse è far PARTIRE il video più in alto del bordo della sezione,
    // di quella stessa quantità. Con quell'anticipo il video resta incollato
    // sotto la hero — anzi la scavalca un po' — per tutto il tempo in cui il
    // confine tra le due sezioni è sullo schermo, e arriva a filo esattamente
    // quando quel confine esce dall'inquadratura.
    // (Perché possa sbordare, .about-section non ha più il clip verticale.)
    const MEDIA_SPEED = 0.82;
    const aboutMedia = document.querySelector<HTMLElement>(".about-media");
    if (aboutMedia) {
      const rest = () =>
        (aboutSection.offsetHeight - aboutMedia.offsetHeight) / 2;
      const from = () =>
        -(rest() + (1 - MEDIA_SPEED) * window.innerHeight);
      const to = () =>
        from() +
        (1 - MEDIA_SPEED) * (aboutSection.offsetHeight + window.innerHeight);
      gsap.fromTo(
        aboutMedia,
        { y: from },
        { y: to, ease: "none", scrollTrigger: { ...pass } }
      );
    }

    // FRASE — più veloce della pagina: guadagna terreno sul fondale per tutta
    // la traversata, ed è questo scarto che si legge come "il testo scivola
    // sulla montagna".
    //
    // L'escursione è tutta verso l'ALTO (da 0 a −2×lead) invece che simmetrica
    // (da +lead a −lead): la velocità relativa è identica, ma il blocco sta
    // mediamente più in alto e quindi ENTRA PRIMA nell'inquadratura. Far salire
    // solo l'opacità non bastava — la frase era già opaca ma ancora sotto il
    // bordo dello schermo, quindi non si vedeva comunque.
    const lead = () => window.innerHeight * 0.18;
    gsap.fromTo(
      aboutStatement,
      { y: 0 },
      { y: () => -2 * lead(), ease: "none", scrollTrigger: { ...pass } }
    );

    // ---- ENTRATA — la staffetta hero → Chi Siamo -------------------------
    // Tre gesti sfalsati, tutti agganciati alla GEOMETRIA DELLA SEZIONE (non
    // alla hero): così le soglie restano vere qualunque sia l'altezza della
    // hero, e sono espresse nell'unica scala che conta, cioè quanto la sezione
    // è già salita nell'inquadratura. Le percentuali sono la posizione del
    // bordo alto della sezione nel viewport: "top 65%" = il confine con la
    // hero è ai due terzi dello schermo (hero per un terzo fuori).
    //
    // ORDINE (questo è il punto): prima il TESTO, poi la montagna.
    //   1. il blocco di testo sale e si accende mentre la hero esce
    //   2. solo dopo il fondale si materializza DIETRO la frase, già in scena
    // Prima era il contrario e la sezione arrivava come un secondo video
    // attaccato al primo; ora tra i due c'è un respiro di carta.
    const entryPass = (start: string, end: string) => ({
      trigger: aboutSection,
      start,
      end,
      scrub: SCRUB,
      invalidateOnRefresh: true,
    });

    // 1a — PARALLASSE D'INGRESSO del blocco di testo: parte più in basso e
    // recupera. È un secondo strato di velocità SOPRA la corsa costante qui
    // sopra (che sta sulla frase, questo sul contenitore: due transform su due
    // elementi, si compongono senza pestarsi). L'effetto è che il testo entra
    // "inseguendo" la hero che se ne va, invece di scorrere con la pagina.
    const aboutContent =
      aboutSection.querySelector<HTMLElement>(".about-content");
    if (aboutContent) {
      gsap.fromTo(
        aboutContent,
        { y: () => window.innerHeight * 0.1 },
        {
          y: 0,
          ease: "none",
          scrollTrigger: entryPass("top 85%", "top 15%"),
        }
      );
    }

    // 1b — ACCENSIONE della frase: finita poco dopo che è entrata dal bordo
    // basso, così si legge subito (il riempimento lettera per lettera più
    // sotto è un'altra cosa: quello dura tutta la traversata).
    gsap.fromTo(
      aboutStatement,
      { opacity: 0 },
      {
        opacity: 1,
        ease: "none",
        scrollTrigger: entryPass("top 68%", "top 28%"),
      }
    );

    // 1c — USCITA della frase, in ANTICIPO sul bordo della sezione. I Servizi
    // ora risalgono dentro alla coda di "Chi siamo" (margine negativo in
    // global.css): senza questa dissolvenza le due scene resterebbero piene
    // insieme sullo stesso schermo. Così invece la frase si spegne mentre il
    // palco sale — una scena lascia, l'altra prende.
    gsap.fromTo(
      aboutStatement,
      { opacity: 1 },
      {
        opacity: 0,
        ease: "none",
        immediateRender: false,
        scrollTrigger: entryPass("bottom 120%", "bottom 62%"),
      }
    );

    // 2 — FONDALE: NESSUNA dissolvenza in entrata. La montagna è già lì, piena,
    // fin dal primo pixel della sezione: quello che la fa "arrivare" è solo il
    // movimento — la parallasse lenta del contenitore più una scala che si
    // DISTENDE da 1.12 a 1 sul <video>. 1.12 è esattamente il valore a cui la
    // hero lascia il suo video (vedi lo zoom d'uscita più in alto): la montagna
    // raccoglie il movimento dove l'altro lo ha lasciato e lo scarica, senza
    // che nulla debba comparire. Scala e y stanno sul <video>, la parallasse
    // sul contenitore: due transform su due elementi, non si pestano.
    if (aboutMedia) {
      // USCITA del fondale, anticipata insieme a quella della frase: la
      // montagna si scioglie mentre i Servizi salgono da sotto, non dopo.
      // Senza questa dissolvenza il video sbordava, scuro, sopra la sezione
      // seguente (la maschera CSS da sola non basta: lì la sua coda è ancora
      // quasi opaca).
      gsap.fromTo(
        aboutMedia,
        { opacity: 1 },
        {
          opacity: 0,
          ease: "none",
          immediateRender: false,
          scrollTrigger: entryPass("bottom 125%", "bottom 65%"),
        }
      );
      const aboutVideoEl = aboutMedia.querySelector<HTMLElement>(".about-video");
      if (aboutVideoEl) {
        gsap.fromTo(
          aboutVideoEl,
          { scale: 1.12, y: () => window.innerHeight * 0.05 },
          {
            scale: 1,
            y: 0,
            ease: "none",
            // Tiene 1.12 finché la hero è in scena (sta zoomando fino a quel
            // valore); molla appena il confine tra le due sezioni tocca il
            // bordo alto dello schermo. È lì che avviene il cambio di mano.
            scrollTrigger: entryPass("top 15%", "top -80%"),
          }
        );
      }
    }

    // RIEMPIMENTO — progress letta dalla geometria: 0 quando la frase entra
    // dal bordo basso, 1 quando è appena uscita da quello alto. La finestra
    // utile è ristretta ai due estremi (0.18 → 0.64): la frase entra già
    // "viva" e arriva PIENA proprio quando comincia a uscire dall'alto, invece
    // di completarsi fuori schermo.
    const clamp01 = gsap.utils.clamp(0, 1);
    const toWindow = gsap.utils.mapRange(0.18, 0.64, 0, 1);
    const readProgress = () => {
      const vh = window.innerHeight;
      const r = aboutStatement.getBoundingClientRect();
      return clamp01(toWindow((vh - r.top) / (vh + r.height)));
    };

    // Il valore letto viene inseguito con un lerp tarato su SCRUB_LERP: il
    // riempimento ha ESATTAMENTE la stessa inerzia dello scrub che muove la
    // scena, la hero e il colore del canvas. Prima correva con un ritardo di
    // circa un sesto rispetto a tutto il resto, e le lettere si accendevano
    // "in anticipo" sul movimento — è quello che rompeva il sincrono.
    // Il ticker legge la geometria SOLO mentre la sezione è in scena.
    let inView = false;
    let snap = true;
    let current = 0;
    const tick = () => {
      if (!inView) return;
      const target = readProgress();
      current = snap ? target : current + (target - current) * SCRUB_LERP;
      snap = false;
      if (Math.abs(target - current) < 0.001) current = target;
      fillTl.progress(current);
    };
    gsap.ticker.add(tick);

    ScrollTrigger.create({
      trigger: aboutSection,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        inView = self.isActive;
        // Entrando ci si allinea al volo (niente rincorsa visibile); uscendo
        // la frase resta coerente: piena sopra, vuota sotto.
        snap = self.isActive;
        if (!self.isActive) {
          current = self.direction === 1 ? 1 : 0;
          fillTl.progress(current);
        }
      },
    });

    window.addEventListener("astro:before-swap", () => {
      gsap.ticker.remove(tick);
      fillTl.kill();
    });
  }
}

// ---------- Chi Siamo — fondale video Sciliar ----------
// Il bianco e nero e la fusione col canvas sono CSS (filter + mask + velo);
// qui solo la regia: il video gira SEMPRE in loop, senza legarlo allo scroll.
// Niente più pausa alla visibilità (le chiamate play/pause incrociate lo
// lasciavano fermo sul primo frame) e niente zoomata in scrub: la montagna
// resta alla sua scala naturale, il movimento lo fa solo il video.
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
    // entrambi i versi).
    aboutVideo.loop = true;
    const keepPlaying = () => {
      if (aboutVideo.paused) void aboutVideo.play().catch(() => {});
    };
    keepPlaying();
    aboutVideo.addEventListener("canplay", keepPlaying);
    aboutVideo.addEventListener("pause", keepPlaying);
    // Al ritorno sulla scheda alcuni browser lasciano il video in pausa.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) keepPlaying();
    });
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

// ---------- Progetti — il mazzo che si sparpaglia ----------
// Le carte partono impilate al centro come un mazzo buttato sul tavolo e si
// aprono verso le loro posizioni finali. Quelle posizioni le tiene già il CSS
// (left/top in percentuale dello stage): qui si anima solo un OFFSET in
// transform che le riporta al centro e poi torna a zero — nessun ricalcolo di
// layout per frame, tutto sul compositor. Mentre le carte se ne vanno, il
// titolo che stava sotto entra in dissolvenza.
//
// La scena si RIARMA: appena il mazzo esce dallo schermo (in su o in giù) le
// carte tornano impilate, così ripassando la sezione l'apertura si rivede da
// capo. Il riarmo avviene solo fuori dal viewport, quindi non si vede mai.
const deck = document.querySelector<HTMLElement>("[data-deck]");
if (deck) {
  const deckCards = gsap.utils.toArray<HTMLElement>("[data-deck-card]", deck);
  const deckCopy = deck.querySelector<HTMLElement>("[data-deck-copy]");
  const num = (v: string | undefined) => Number(v ?? 0);
  // Rotazione a mazzo aperto: sta nella var CSS --r, unica fonte con le
  // posizioni finali (il fallback senza JS usa la stessa).
  const finalRotation = (card: HTMLElement) =>
    parseFloat(getComputedStyle(card).getPropertyValue("--r")) || 0;

  if (reduceMotion || !deckCards.length) {
    // Niente animazione: il CSS di base è già lo stato sparpagliato.
    deck.classList.remove("is-js");
  } else {
    // Stato MAZZO — l'offset che riporta ogni carta al centro dello stage si
    // MISURA (posa CSS → centro stage), non si ricalcola: così le posizioni
    // finali restano una cosa sola del CSS e qualsiasi media query funziona
    // senza duplicare qui la matematica.
    let opened = false;
    const stackCards = () => {
      gsap.set(deckCards, { clearProps: "transform" }); // torna alla posa CSS
      const r = deck.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const offsets = deckCards.map((card) => {
        const b = card.getBoundingClientRect();
        return { x: cx - (b.left + b.width / 2), y: cy - (b.top + b.height / 2) };
      });
      deckCards.forEach((card, i) => {
        const d = card.dataset;
        gsap.set(card, {
          xPercent: -50,
          yPercent: -50,
          x: offsets[i].x + num(d.dx),
          y: offsets[i].y + num(d.dy),
          rotation: num(d.dr),
        });
      });
      // Il titolo dei Progetti resta sempre visibile (niente comparsa in
      // home): le carte gli si aprono davanti, non lo accendono.
      // Spegne la fluttuazione: da chiuse le carte devono stare ferme.
      deck.classList.remove("is-open");
      opened = false;
    };

    // Togliere .is-js e scrivere lo stato mazzo nello stesso blocco sincrono:
    // il browser non dipinge in mezzo, quindi nessun lampo di carte già aperte.
    deck.classList.remove("is-js");
    stackCards();

    // Finché il mazzo è chiuso l'offset dipende dalla dimensione dello stage:
    // a mazzo aperto x/y valgono 0 e le posizioni le tiene il CSS, quindi non
    // c'è più niente da ricalcolare.
    window.addEventListener("resize", () => {
      if (!opened) stackCards();
    });

    // A sparpagliamento finito le carte iniziano a fluttuare (@keyframes CSS,
    // su un layer proprio: non tocca il transform che gestisce GSAP).
    const deckTl = gsap.timeline({
      paused: true,
      onComplete: () => deck.classList.add("is-open"),
    });
    deckTl.to(deckCards, {
      x: 0,
      y: 0,
      rotation: (_i, target: HTMLElement) => finalRotation(target),
      duration: 1.35,
      ease: "power3.out",
      // Ordine sparso: il mazzo si sfalda, non si apre a ventaglio ordinato.
      stagger: { each: 0.075, from: "random" },
    });

    // Il range è quello del MAZZO, non della sezione: agli estremi le carte
    // sono già fuori dal viewport, quindi il rimescolamento resta invisibile
    // sia scendendo sia risalendo.
    ScrollTrigger.create({
      trigger: deck,
      start: "top 85%",
      end: "bottom 15%",
      onEnter: () => {
        opened = true;
        // invalidate: dopo un riarmo (o un resize) i valori di partenza sono
        // cambiati, vanno riletti invece di riusare quelli del giro prima.
        deckTl.invalidate().restart();
      },
      onEnterBack: () => {
        opened = true;
        deckTl.invalidate().restart();
      },
      onLeave: () => {
        deckTl.pause(0);
        stackCards();
      },
      onLeaveBack: () => {
        deckTl.pause(0);
        stackCards();
      },
    });
  }
}

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

// Il testo dentro al pannello (kicker, titolo, sottotitolo) NON ha comparse:
// sale insieme al pannello ed è già leggibile. In home nessun titolo entra in
// scena da solo — vedi `isHome` più sopra.

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

// ---------- Pagina /chi-siamo ----------
// Le coreografie condivise (glow, capitoli, tilt founder, outro, CTA,
// footer) si agganciano da sole alle stesse classi; qui vive solo ciò che
// è esclusivo della pagina: l'entrata della hero, i ritratti del duo e la
// timeline del percorso.
const aboutPage = document.querySelector<HTMLElement>(".aboutpage");
if (aboutPage) {
  // Hero — il titolo ora usa l'isola VariableProximity (React Bits): le lettere
  // reagiscono al cursore variando il peso del font, quindi niente split/mask GSAP
  // qui. Sottotitolo e CTA mantengono l'entrata in dissolvenza.
  const apHeroBits: { sel: string; delay: number }[] = [
    { sel: ".ap-hero-sub", delay: 0.75 },
    { sel: ".ap-hero-cta", delay: 0.92 },
  ];
  apHeroBits.forEach(({ sel, delay }) => {
    if (!aboutPage.querySelector(sel)) return;
    gsap.fromTo(
      sel,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay }
    );
  });

  // Hero — parallax editoriale in scrub: uscendo dalla hero il blocco
  // tipografico sale un filo più veloce della pagina → profondità rispetto
  // all'aurora di fondo. Solo transform, costo nullo.
  if (!reduceMotion && aboutPage.querySelector(".ap-hero")) {
    gsap.to(".ap-hero-inner", {
      yPercent: -9,
      ease: "none",
      scrollTrigger: {
        trigger: ".ap-hero",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
  }

  // Duo — ogni riga è una scena indipendente: il badge cala dall'alto come da
  // un filo (corda che cresce + badge che scende, assestamento a pendolo),
  // mentre la bio sale a pezzi. L'animazione parte solo quando IL blocco di
  // QUELLA persona entra in viewport (trigger per riga), una volta sola, e il
  // badge resta poi fisso. Solo transform/opacity. Reduced-motion → stato
  // finale immediato (lo stato iniziale nascosto è inline nel componente).
  aboutPage.querySelectorAll<HTMLElement>(".ap-person").forEach((row, idx) => {
    revealRise(row.querySelectorAll(":scope > .ap-duo-head, .ap-bio > *"), {
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
      // Nel layout split le due metà entrano in vista insieme: la seconda
      // card cala con un piccolo scarto — caduta "a canone", non a blocco.
      delay: idx * 0.22,
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

  // Duo — le gridlines del "campo" seguono il cursore: pointermove aggiorna
  // due var CSS (--gx/--gy) e la mask radiale la disegna la GPU. Solo con
  // pointer fine; su touch il campo resta statico e tenue.
  const duoEnv = aboutPage.querySelector<HTMLElement>(".ap-duo-env");
  const duoField = duoEnv?.querySelector<HTMLElement>(".ap-duo-field");
  if (
    duoEnv &&
    duoField &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) {
    duoEnv.addEventListener(
      "pointermove",
      (e) => {
        const r = duoEnv.getBoundingClientRect();
        duoField.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
        duoField.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
      },
      { passive: true }
    );
  }

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

  // Come lavoriamo — la copy (kicker/titolo/lead) sale in cascata quando la
  // sezione entra: aggancia visivamente il Percorso al blocco finale.
  revealRise(aboutPage.querySelectorAll(".ap-flow-copy > *"), {
    trigger: ".ap-flow",
    start: "top 76%",
    stagger: 0.12,
    y: 34,
    duration: 0.9,
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
