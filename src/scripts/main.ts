import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";
import { SplitText } from "gsap/SplitText";
import { initContactFlow } from "./contactFlow";

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
  // Modalità LERP (smorzamento esponenziale), NON `duration` fissa: con una
  // durata fissa un colpo di rotella veloce copre molta strada nello stesso
  // tempo → velocità alta, sembra non ammortizzato; lo scroll lento invece sì.
  // Col lerp ogni frame recupera la stessa FRAZIONE della distanza residua:
  // l'ammortizzamento è identico a qualunque velocità e la pagina DECELERA
  // sempre dolcemente fino a fermarsi, anche dentro le sezioni pinnate.
  // (Gli scroll programmati — ancore, cambi scena dei Servizi — passano una
  // `duration` esplicita a scrollTo e restano a tempo.)
  lerp: 0.075,
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

// ---------- Viaggi programmati che ATTRAVERSANO le sezioni ----------
// Un salto verso un'ancora (CTA della hero, voci del menu) passa sopra alla
// sezione pinnata dei Servizi, che all'ingresso "atterra" e si riprende lo
// scroll: il viaggio si fermava lì (il CTA "Esplora il nostro lavoro"
// arrivava sui Servizi invece che sui Progetti). Finché questa scadenza non
// è passata, le sezioni a scatti si lasciano attraversare.
let travelUntil = 0;
const isTravelling = () => performance.now() < travelUntil;
const travelFor = (seconds: number) => {
  travelUntil = performance.now() + seconds * 1000 + 250;
};

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
  if (lenis.isLocked && performance.now() > lockedUntil) lenis.isLocked = false;
});
gsap.ticker.lagSmoothing(0);

// ---------- Anchor links → scroll fluido via Lenis ----------
// Senza intercettazione i link #ancora saltano di colpo; qui usano la stessa
// easing dello smooth scroll, così la navigazione sembra un'unica gestualità.
// Delegato sul documento (non agganciato link per link al caricamento): le
// voci del menu sono un'isola React idratata DOPO questo script, e prima
// sfuggivano — finivano nello scroll nativo del browser, che attraversando
// i Servizi pinnati veniva catturato lì. Vale per "#id" e per "/#id" quando
// punta alla pagina in cui si è già.
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href*='#']");
  if (!a) return;
  const url = new URL(a.href, location.href);
  const samePage =
    url.origin === location.origin &&
    url.pathname.replace(/\/$/, "") === location.pathname.replace(/\/$/, "");
  if (!samePage || !url.hash || url.hash === "#") return;
  const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
  if (!target) return;
  e.preventDefault();
  // Salto dalla hero verso i progetti: deve essere diretto, non un lento
  // crawl che attraversa (e "accende" in modo brutto) la sezione servizi
  // pinnata. Scroll breve e bloccato → arriva netto all'inizio dei progetti,
  // l'offset resta corretto perché il pin-spacer è già nel DOM.
  const isHeroToProjects = url.hash === "#projects" && !!a.closest(".hero-section");
  if (isHeroToProjects) {
    travelFor(0.7);
    lockedScrollTo(target, 0.7);
  } else {
    travelFor(1.5);
    lenis.scrollTo(target, { duration: 1.5 });
  }
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

// ---------- Navbar a pillola — scroll fermo a menu aperto ----------
// PillNav (isola React) annuncia apertura/chiusura su window. L'evento arriva
// in modo sincrono dentro il click, quindi Lenis è già ripartito quando
// l'handler delle ancore qui sopra lancia lo scroll verso la sezione.
window.addEventListener("pillnav:toggle", (e) => {
  (e as CustomEvent<{ open: boolean }>).detail.open ? lenis.stop() : lenis.start();
});

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
if (document.querySelector("[data-anim='nav']")) {
  gsap.fromTo(
    "[data-anim='nav']",
    { opacity: 0, y: -10 },
    { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: 0.4 }
  );
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

  // Il playbackRate si riscrive solo quando cambia davvero: ogni assegnazione
  // fa riconfigurare il decoder, e farlo a ogni frame (anche col valore
  // identico) fa singhiozzare la riproduzione proprio mentre la hero entra.
  let lastRate = BASE_RATE;
  const setRate = (r: number) => {
    if (Math.abs(r - lastRate) < 0.01) return;
    lastRate = r;
    heroVideo.playbackRate = r;
  };

  // Il loop vive solo mentre il video sta davvero suonando: lo accende
  // l'evento `playing`. Prima partiva al primo frame e, se il video era
  // ancora in caricamento (in pausa), moriva subito → il rallentamento
  // finale non scattava mai.
  let rateLoop = 0;
  const tickPlaybackRate = () => {
    rateLoop = 0;
    if (heroVideo.paused || heroVideo.ended) return;
    const d = heroVideo.duration;
    if (Number.isFinite(d) && d > 0) {
      const remaining = d - heroVideo.currentTime;
      if (remaining <= SLOWDOWN_WINDOW) {
        const t = 1 - remaining / SLOWDOWN_WINDOW; // 0 → 1 across the window
        const eased = easeOut(Math.min(1, Math.max(0, t)));
        setRate(BASE_RATE - (BASE_RATE - MIN_RATE) * eased);
      } else {
        setRate(BASE_RATE);
      }
    }
    rateLoop = requestAnimationFrame(tickPlaybackRate);
  };
  const startRateLoop = () => {
    if (!rateLoop) rateLoop = requestAnimationFrame(tickPlaybackRate);
  };
  heroVideo.addEventListener("playing", startRateLoop);
  startRateLoop();

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

// ---------- Canvas — UN SOLO colore per tutta la fascia sotto la hero --------
// Il canvas (.post-reveal) resta sempre sulla CARTA base (--color-bg): niente
// più virata verso la sabbia avorio entrando in Chi Siamo e ritorno al warm
// white nei Servizi. Quel morph era l'unico punto in cui il fondo cambiava
// tono, e proprio sulla giunzione con la hero: toglierlo è ciò che rende il
// passaggio hero → Chi Siamo continuo (stesso identico bianco carta sopra e
// sotto il confine). Le sezioni scure che servono (CTA, footer) hanno il
// proprio fondo e non passano di qui.
// Le sezioni restano trasparenti: il colore lo dà il canvas sotto.
if (!reduceMotion && isHome) {
  gsap.set(["#cosa-facciamo", "#projects"], {
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

    syncSvcVideos();
  };

  // ---- Clip dei servizi ----
  // Una sola fonte di verità: una clip suona solo se la sezione è vicina allo
  // schermo E la sua scena è nella cornice (anche a metà cambio, così il
  // passaggio mostra movimento vero); altrimenti è in pausa. play()/pause()
  // si chiamano solo quando lo stato cambia davvero. Con reduced motion resta
  // il poster. Il download parte (preload) quando la sezione si avvicina.
  const svcVideos = svcShots.map((el) =>
    el.querySelector<HTMLVideoElement>("[data-svc-video]")
  );
  // Due soglie diverse: `vicina` fa partire il DOWNLOAD in anticipo,
  // `vista` fa partire la RIPRODUZIONE solo quando la sezione è davvero sullo
  // schermo, così il racconto comincia sotto gli occhi di chi guarda.
  let svcSeen = false;
  // Ogni volta che una card torna in scena (da un'altra scena o rientrando
  // nella sezione) la sua clip riparte DA CAPO: si vede sempre l'inizio del
  // racconto, mai un punto a caso del loop. Il ritorno a 0 avviene mentre è
  // ancora in pausa, quindi il primo fotogramma è già lì quando parte.
  //
  // Durante un cambio decodifica UNA clip sola: quella che esce continua a
  // girare finché è nella cornice, quella che entra arriva ferma sul primo
  // fotogramma e parte solo a card posata. Avviare il decoder di una clip
  // (e farne girare due insieme) proprio mentre la card viaggia mangiava
  // fotogrammi: il passaggio siti → social scendeva a 30 fps.
  // Il ritorno a 0 si fa quando la clip ESCE dalla cornice (non si vede),
  // così rientrando mostra già l'inizio e alla partenza non c'è nessun seek.
  const svcWanted = svcVideos.map(() => false);
  function syncSvcVideos() {
    if (reduceMotion) return;
    svcVideos.forEach((v, k) => {
      if (!v) return;
      const dist = Math.abs(state.p - k);
      const inFrame = dist < 1;
      const want =
        svcSeen && !document.hidden && inFrame && (svcWanted[k] || dist < 0.02);
      svcWanted[k] = want;
      if (want && v.paused) void v.play().catch(() => {});
      else if (!want && !v.paused) v.pause();
      // Anche uscendo dalla sezione: rientrando la clip riparte da capo.
      if ((!inFrame || !svcSeen) && v.paused && v.currentTime > 0) v.currentTime = 0;
    });
  }
  if (svcVideos.some(Boolean) && "IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        svcVideos.forEach((v) => {
          if (v && v.preload === "none") v.preload = "auto";
        });
      },
      { rootMargin: "50% 0px 50% 0px" }
    ).observe(svcRoot);
    new IntersectionObserver(
      ([entry]) => {
        svcSeen = entry.isIntersecting;
        syncSvcVideos();
      },
      { threshold: 0.35 }
    ).observe(svcScene);
    document.addEventListener("visibilitychange", syncSvcVideos);
  }

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

  // ---- Aggancio ammortizzato ----
  // Il pin ferma la sezione nel fotogramma esatto in cui la raggiunge: se ci
  // si arriva scrollando a 15–20 px/frame, la scena passava da quella
  // velocità a zero di colpo (più un salto dell'atterraggio), una frenata a
  // mano. Ora, quando la sezione è a meno di APPROACH_VH dal suo posto, lo
  // scroll viene preso in carico e accompagnato con una curva che decelera
  // (easeOutCubic, partendo dalla velocità che aveva): la sezione si posa e
  // arriva al pin già ferma. Lì il salto all'ancora interna è invisibile,
  // perché la sezione è bloccata. Stessa cosa risalendo da sotto.
  const APPROACH_VH = 0.42;
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  // Scadenza, non interruttore (come busyUntil): se la planata venisse
  // interrotta, l'aggancio non resta disattivato per sempre.
  let glideUntil = 0;
  const isGliding = () => performance.now() < glideUntil;

  const glideInto = (edge: number, i: number) => {
    if (isGliding() || isTravelling() || lenis.isLocked) return;
    const dist = Math.abs(edge - lenis.scroll);
    if (dist < 2) return;
    // Durata tarata sulla velocità attuale: con easeOutCubic la velocità
    // iniziale è 3·dist/durata, quindi si riparte esattamente dall'inerzia
    // dell'utente invece di accelerare o frenare bruscamente.
    const v = Math.max(Math.abs(lenis.velocity) * 60, 1); // px/s
    const duration = gsap.utils.clamp(0.55, 1.15, (3 * dist) / v);
    glideUntil = performance.now() + duration * 1000 + 150;
    index = i;
    state.p = i;
    apply();
    holdFor(duration + 0.1);
    lockedScrollTo(edge, duration, {
      easing: easeOutCubic,
      onComplete: () => {
        // Dentro al pin: lo spostamento all'ancora non si vede.
        lenis.scrollTo(anchorOf(i), { immediate: true, force: true });
      },
    });
  };

  st = ScrollTrigger.create({
    trigger: "#cosa-facciamo",
    start: "top top",
    end: () => "+=" + svcPinDistance(),
    pin: true,
    // Niente anticipatePin: bloccava la sezione qualche frame PRIMA del suo
    // posto (~25px) e la faceva scattare in posizione. L'arrivo lo ammortizza
    // già glideInto, quindi la sezione arriva al pin praticamente ferma.
    invalidateOnRefresh: true,
    // Primo pin della pagina: si ricalcola prima di progetti (2), chi-siamo
    // (1) e morph (0), così ogni spacer a valle legge posizioni già spostate.
    refreshPriority: 3,
    onRefresh: () => {
      measure();
      apply();
    },
    onUpdate: (self) => {
      if (isBusy() || isTravelling()) return;
      const delta = self.scroll() - anchorOf(index);
      if (delta > TRIGGER_PX) goTo(index + 1);
      else if (delta < -TRIGGER_PX) goTo(index - 1);
    },
    // Niente atterraggio se si sta solo attraversando la sezione: durante un
    // viaggio verso un'ancora, o con un salto diretto che è già oltre il
    // pin (progress 1 entrando dall'alto, 0 rientrando dal basso — scattano
    // onEnter e onLeave nello stesso aggiornamento).
    onEnter: (self) => {
      if (!isGliding() && !isTravelling() && self.progress < 1) land(0);
    },
    onEnterBack: (self) => {
      if (!isGliding() && !isTravelling() && self.progress > 0) land(N - 1);
    },
  });

  // Zone d'avvicinamento, appena prima e appena dopo il pin (posizioni di
  // scroll assolute, ricalcolate dopo il pin che ha priorità di refresh 3).
  ScrollTrigger.create({
    start: () => (st ? st.start : 0) - window.innerHeight * APPROACH_VH,
    end: () => (st ? st.start : 0),
    refreshPriority: 3,
    onEnter: () => {
      if (st) glideInto(st.start + 1, 0);
    },
  });
  ScrollTrigger.create({
    start: () => (st ? st.end : 0),
    end: () => (st ? st.end : 0) + window.innerHeight * APPROACH_VH,
    refreshPriority: 3,
    onEnterBack: () => {
      if (st) glideInto(st.end - 1, N - 1);
    },
  });

  // ARRIVO del palco: compare (con un filo di salita) mentre la scena del
  // Punto svanisce, nella stessa finestra di scroll e con la stessa curva
  // (vedi l'uscita nel blocco del Punto): un passaggio di mano senza vuoti.
  gsap.fromTo(
    svcScene,
    { autoAlpha: 0, y: 48 },
    {
      autoAlpha: 1,
      y: 0,
      ease: "sine.inOut",
      scrollTrigger: {
        trigger: svcScene,
        start: "top 100%",
        end: "top 55%",
        scrub: SCRUB,
      },
    }
  );
}

// ---------- Glow text — illuminazione lettera per lettera in scrub ----------
// Ogni elemento [data-glow] viene spezzato in lettere: le parole diventano
// span inline-block (così non si spezzano a metà riga), ogni carattere uno
// span che passa da quasi spento a pieno mentre l'elemento attraversa il
// viewport. Gli <em> conservano corsivo + colore accent via .gw-em; gli
// <strong> diventano parole chiave (.gw-key), colorate da chi le accende.
// Con reduced motion il testo resta pieno (niente split, niente tween).
const splitGlowChars = (el: HTMLElement): HTMLElement[] => {
  const chars: HTMLElement[] = [];
  const frag = document.createDocumentFragment();

  const pushText = (text: string, kind: "" | "em" | "key") => {
    text.split(/(\s+)/).forEach((tok) => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) {
        frag.appendChild(document.createTextNode(" "));
        return;
      }
      const word = document.createElement("span");
      word.className = kind ? `gw gw-${kind}` : "gw";
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
      pushText(node.textContent ?? "", "");
    } else if (node instanceof HTMLElement) {
      if (node.tagName === "BR") {
        frag.appendChild(document.createElement("br"));
        return;
      }
      pushText(
        node.textContent ?? "",
        node.tagName === "EM" ? "em" : node.tagName === "STRONG" ? "key" : ""
      );
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

// ---------- Il punto — fondale e testo che scorrono insieme ----------------
// Un unico blocco (160vh, vedi .point-scene.is-scene) con fondale Sciliar e
// testo centrato: scorre con la pagina alla stessa velocità, niente
// parallasse. Tutto in scrub, con la stessa inerzia del resto della pagina:
//   1. dalla hero si scrolla → il fondale compare in dissolvenza (e la foto
//      si distende da 1.08 a 1)
//   2. il testo compare con un filo di salita
//   3. mentre scorre si accende lettera per lettera: prima il PROBLEMA
//      (inchiostro, parole chiave in arancio), poi la SVOLTA (inchiostro,
//      corsivo e chiavi in blu). Il problema resta acceso: si legge tutto.
//   4. in uscita la montagna si scioglie nella carta con la stessa sfumatura
//      della hero, mentre il palco dei Servizi compare sotto.
// Solo opacità, colore e una scala leggera: niente layout per frame.
// Con reduced motion non parte nulla: schermata statica con testo pieno.
const pointScene = document.querySelector<HTMLElement>("[data-point-scene]");
const pointCopy = pointScene?.querySelector<HTMLElement>("[data-point-copy]");
const pointBg = pointScene?.querySelector<HTMLElement>(".point-bg");
const pointPain = pointScene?.querySelector<HTMLElement>("[data-point-pain]");
const pointTurn = pointScene?.querySelector<HTMLElement>("[data-point-turn]");
if (pointScene && pointCopy && pointBg && pointPain && pointTurn && !reduceMotion) {
  pointScene.classList.add("is-scene");

  const scrubbed = (trigger: Element, start: string, end: string) => ({
    trigger,
    start,
    end,
    scrub: SCRUB,
    invalidateOnRefresh: true,
  });

  // 1 — ENTRATA: il fondale compare mentre la hero se ne va — dal primo
  // pixel di scroll a hero uscita per il 60%. Agganciato alla hero, non al
  // blocco: il blocco parte già sovrapposto alla sua sfumatura (vedi
  // --point-overlap), quindi a pagina ferma è già in parte sullo schermo.
  const heroEl = document.querySelector(".hero-section") ?? pointScene;
  gsap.fromTo(
    pointBg,
    { autoAlpha: 0 },
    { autoAlpha: 1, ease: "sine.inOut", scrollTrigger: scrubbed(heroEl, "top top", "60% top") }
  );
  const pointImg = pointBg.querySelector<HTMLElement>("img");
  if (pointImg) {
    gsap.fromTo(
      pointImg,
      { scale: 1.08 },
      { scale: 1, ease: "sine.out", scrollTrigger: scrubbed(heroEl, "top top", "60% top") }
    );
  }

  // 2 — il testo compare a fondale ormai pieno.
  gsap.fromTo(
    pointCopy,
    { autoAlpha: 0, y: 28 },
    { autoAlpha: 1, y: 0, ease: "sine.out", scrollTrigger: scrubbed(pointCopy, "top 95%", "top 62%") }
  );

  // 3 — RIEMPIMENTO lettera per lettera mentre il testo sale verso il centro:
  // finisce quando il blocco è a metà schermo. Un tween per lettera in
  // sequenza (1 unità di timeline = 1 lettera): ogni lettera "scatta" piena
  // prima che parta la successiva, dal grigio al suo colore.
  const painChars = splitGlowChars(pointPain);
  const turnChars = splitGlowChars(pointTurn);
  const chars = [...painChars, ...turnChars];
  if (chars.length) {
    const GRAY = "rgba(23, 19, 16, 0.22)";
    const INK = "#171310";
    const ACCENT = "#2748A5";
    const EMBER = "#D84002";
    const painSet = new Set(painChars);
    gsap.set(chars, { color: GRAY });

    const fillTl = gsap.timeline({ defaults: { ease: "none" } });
    chars.forEach((c, i) => {
      const cls = c.parentElement?.classList;
      const color = cls?.contains("gw-em")
        ? ACCENT
        : cls?.contains("gw-key")
          ? painSet.has(c) ? EMBER : ACCENT
          : INK;
      fillTl.to(c, { color, duration: 0.6 }, i);
    });

    ScrollTrigger.create({
      animation: fillTl,
      ...scrubbed(pointCopy, "top 72%", "top 18%"),
    });
  }

  // 4 — USCITA: il fondale non svanisce in opacità ma si scioglie nella carta
  // scorrendo, con la sua sfumatura bassa (identica a quella della hero, vedi
  // .point-bg in global.css), mentre il palco dei Servizi sale dentro di lei.
  // Il testo si spegne mentre esce dall'alto, legato alla sua posizione: si
  // legge tutto prima che se ne vada.
  gsap.fromTo(
    pointCopy,
    { autoAlpha: 1 },
    {
      autoAlpha: 0,
      ease: "sine.in",
      immediateRender: false,
      scrollTrigger: scrubbed(pointCopy, "top 2%", "top -38%"),
    }
  );
  // Coda: quando il palco dei Servizi è quasi arrivato, quel che resta della
  // sfumatura svanisce, così la sezione si blocca su carta pulita (senza,
  // la coda della montagna restava dietro la parte alta dei Servizi fermi).
  if (svcScene) {
    gsap.fromTo(
      pointBg,
      { autoAlpha: 1 },
      {
        autoAlpha: 0,
        ease: "sine.in",
        immediateRender: false,
        scrollTrigger: scrubbed(svcScene, "top 70%", "top 22%"),
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

// ---------- Progetti — il mazzo che si sparpaglia ----------
// Le carte partono impilate al centro come un mazzo buttato sul tavolo e si
// aprono verso le loro posizioni finali. Quelle posizioni le tiene già il CSS
// (left/top in percentuale dello stage): qui si anima solo un OFFSET in
// transform che le porta dalla pila al posto — nessun ricalcolo di layout per
// frame, tutto sul compositor.
//
// Lo sparpagliamento è LEGATO ALLO SCROLL (scrub), non a tempo: le carte
// seguono la rotella, già ammorbidita da Lenis, in avanti e all'indietro.
// Ease simmetrica (sine.inOut) → scendendo e risalendo il movimento è identico:
// le carte si staccano piano e si posano piano, in entrambi i sensi. Niente
// soglie, niente tween che ripartono: se ti fermi a metà, il mazzo resta a
// metà; se inverti, inverte da dove è.
//
// A mazzo tutto aperto le carte iniziano a fluttuare (@keyframes CSS, su un
// layer proprio); appena si torna indietro la fluttuazione si posa in morbido.
const deck = document.querySelector<HTMLElement>("[data-deck]");
if (deck) {
  const deckCards = gsap.utils.toArray<HTMLElement>("[data-deck-card]", deck);
  const deckFloats = deckCards.map((c) => c.querySelector<HTMLElement>(".deck-card-float"));
  const num = (v: string | undefined) => Number(v ?? 0);
  // Rotazione a mazzo aperto: sta nella var CSS --r, unica fonte con le
  // posizioni finali (il fallback senza JS usa la stessa).
  const finalRotation = (card: HTMLElement) =>
    parseFloat(getComputedStyle(card).getPropertyValue("--r")) || 0;

  if (reduceMotion || !deckCards.length) {
    // Niente animazione: il CSS di base è già lo stato sparpagliato.
    deck.classList.remove("is-js");
  } else {
    // Offset che porta ogni carta dalla sua posa CSS al centro dello stage.
    // Si MISURA (non si ricalcola) così le posizioni restano una cosa sola del
    // CSS; togliendo l'x/y GSAP corrente la misura vale anche a metà corsa
    // (serve al refresh dopo un resize). La rotazione non sposta il centro.
    const pileOffsets = () => {
      const r = deck.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return deckCards.map((card) => {
        const b = card.getBoundingClientRect();
        const x = Number(gsap.getProperty(card, "x")) || 0;
        const y = Number(gsap.getProperty(card, "y")) || 0;
        return {
          x: cx - (b.left + b.width / 2 - x) + num(card.dataset.dx),
          y: cy - (b.top + b.height / 2 - y) + num(card.dataset.dy),
        };
      });
    };

    // Fluttuazione: si accende a mazzo aperto; si spegne PORTANDOLA A RIPOSO,
    // non strappandola (si congela il transform che l'@keyframes sta
    // mostrando, si toglie .is-open e da lì si torna a zero in morbido).
    const startFloat = () => {
      if (deck.classList.contains("is-open")) return;
      gsap.killTweensOf(deckFloats);
      gsap.set(deckFloats, { clearProps: "transform" });
      deck.classList.add("is-open");
    };
    const settleFloat = () => {
      if (!deck.classList.contains("is-open")) return;
      deckFloats.forEach((f) => f && gsap.set(f, { transform: getComputedStyle(f).transform }));
      deck.classList.remove("is-open");
      gsap.to(deckFloats, { x: 0, y: 0, rotation: 0, duration: 0.8, ease: "sine.out", overwrite: true });
    };

    // Il transform del CSS (translate(-50%,-50%) rotate(--r)) passa a GSAP.
    // Togliere .is-js e scrivere lo stato pila nello stesso blocco sincrono:
    // il browser non dipinge in mezzo, quindi nessun lampo di carte aperte.
    deck.classList.remove("is-js");
    gsap.set(deckCards, { xPercent: -50, yPercent: -50 });
    // Misura a .is-js tolta: le carte sono nella posa CSS (aperte).
    let pile = pileOffsets();

    // Ordine sparso ma FISSO (stesso in andata e ritorno): il mazzo si
    // sfalda, non si apre a ventaglio ordinato. Ogni carta parte un filo dopo
    // l'altra e le corse si sovrappongono quasi del tutto: un'onda unica.
    const order = [1, 3, 0, 2];
    const STEP = 0.07;
    const tl = gsap.timeline({
      defaults: { ease: "sine.inOut", duration: 1 },
      scrollTrigger: {
        trigger: deck,
        // Parte quando la pila (centro dello stage) affaccia dal fondo dello
        // schermo e finisce col mazzo centrato: corsa lunga (~mezzo schermo)
        // e sine.inOut, così ogni tacca di rotella sposta le carte di poco.
        start: "center 100%",
        end: "center 50%",
        // Catch-up morbido sopra al lerp di Lenis: assorbe gli scatti della
        // rotella senza far sembrare le carte in ritardo.
        scrub: 0.9,
        invalidateOnRefresh: true,
        onRefreshInit: () => {
          // Al refresh (resize) la pila va rimisurata sulla nuova scena.
          pile = pileOffsets();
        },
        onUpdate: (st) => {
          if (st.progress > 0.995) startFloat();
          else settleFloat();
        },
      },
    });
    deckCards.forEach((card, i) => {
      tl.fromTo(
        card,
        {
          x: () => pile[i].x,
          y: () => pile[i].y,
          rotation: num(card.dataset.dr),
        },
        {
          x: 0,
          y: 0,
          rotation: () => finalRotation(card),
        },
        order.indexOf(i) * STEP
      );
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

// ---------- Animazioni CSS infinite — in pausa fuori scena ----------
// Aurora, segni fluttuanti, hint di scroll, carte che respirano: sono loop
// CSS infiniti che il browser continua a far avanzare (style + composite, e
// per l'aurora anche paint) anche quando la loro sezione è lontana. Un solo
// observer aggiunge .is-offscreen ai contenitori fuori vista e il CSS mette
// in pausa tutti i loro loop (animation-play-state). Riprendono dal punto in
// cui erano, quindi rientrando non si vede nessuno stacco.
if ("IntersectionObserver" in window) {
  const loopHosts = document.querySelectorAll<HTMLElement>(
    ".hero-section, .ap-hero, [data-deck]"
  );
  if (loopHosts.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) =>
          e.target.classList.toggle("is-offscreen", !e.isIntersecting)
        );
      },
      { rootMargin: "15% 0px 15% 0px" }
    );
    loopHosts.forEach((el) => io.observe(el));
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
let ghostTrigger: ScrollTrigger | undefined;
if (!reduceMotion && document.querySelector(".footer-ghost")) {
  ghostTrigger = gsap.fromTo(
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
  ).scrollTrigger;
}

// ---------- Footer — torna su ----------
document.querySelector("[data-back-to-top]")?.addEventListener("click", () => {
  travelFor(2);
  lenis.scrollTo(0, { duration: 2 });
});

// ---------- Form a passi della sezione finale ----------
// Quando un passo si apre sotto il bordo dello schermo lo si porta in vista
// con lo stesso scroll morbido del resto del sito. Aprendosi, il form allunga
// la pagina: si ricalcola solo il trigger del wordmark (l'unico più in basso),
// senza un refresh globale che rilancerebbe le coreografie sopra.
initContactFlow({
  reveal: (el) => {
    setTimeout(() => {
      const top = el.getBoundingClientRect().top;
      if (top > window.innerHeight * 0.62) {
        lenis.scrollTo(el, { offset: -window.innerHeight * 0.3, duration: 1.2 });
      }
    }, 60);
  },
  onResize: () => ghostTrigger?.refresh(),
});
