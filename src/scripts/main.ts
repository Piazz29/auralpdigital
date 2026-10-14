import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Draggable } from "gsap/Draggable";
import { SplitText } from "gsap/SplitText";
import { initContactFlow } from "./contactFlow";
import { PixelPortrait, RAMPS } from "./pixelPortrait";

gsap.registerPlugin(ScrollTrigger, Draggable, SplitText);

// Su mobile la barra URL che appare/scompare cambia l'altezza del viewport e
// scatena un refresh di ScrollTrigger (ricalcolo di tutti i pin) in pieno
// scroll → scatto. Ignorando quel resize lo scroll resta fluido.
ScrollTrigger.config({ ignoreMobileResize: true });

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

// Telefono in orizzontale: ~390px di altezza non bastano alle scene pinnate
// (Il punto, Servizi, sosta dei Progetti), che si tagliavano o si
// sovrapponevano. Lì le sezioni restano nella loro versione impilata — la
// stessa di reduced-motion — e si scorrono normalmente; i reveal restano.
// Solo touch (hover: none): una finestra desktop bassa non cambia modo.
// Ruotando il telefono il modo cambia: si ricarica la pagina, perché pin e
// misure delle scene sono costruiti una volta sola al caricamento.
const shortViewportMq = window.matchMedia(
  "(max-height: 500px) and (orientation: landscape) and (hover: none)"
);
const shortViewport = shortViewportMq.matches;
shortViewportMq.addEventListener("change", () => location.reload());
document.documentElement.classList.toggle("is-short-vp", shortViewport);
const staticScenes = reduceMotion || shortViewport;

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
  // Fermate di scroll: vicino a una fermata la rotella fa resistenza e una
  // scrollata non la scavalca; su touch lo swipe lanciato si posa sulla
  // prossima fermata (vedi "Fermate di scroll" sotto). Solo per l'input
  // utente, mai durante uno scroll programmato.
  virtualScroll: (data) => {
    if (!lenis || lenis.isLocked || isTravelling()) return true;
    const type = data.event.type;
    // Un evento "trattenuto" (pagina ferma su una fermata) va anche tolto al
    // browser: con delta 0 Lenis lo ignorerebbe senza preventDefault e lo
    // scroll nativo lo eseguirebbe lo stesso.
    const swallow = () => {
      if (data.event.cancelable) data.event.preventDefault();
      return false;
    };
    if (type === "wheel") {
      const raw = data.deltaY;
      data.deltaY *= detentFactor(lenis.targetScroll);
      if (stopGate(data, raw)) return swallow();
    } else if (type === "touchmove") {
      if (touchGate(data)) return swallow();
    } else if (type === "touchend") {
      return touchLanding(data.deltaY);
    } else if (type === "touchstart") {
      touchHeld = NaN;
    }
    return true;
  },
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
  // Anche il touch passa da Lenis: con lo scroll nativo lo slancio di uno
  // swipe non si può fermare e le fermate su telefono venivano scavalcate
  // (le tappe del Percorso passavano prima che l'animazione partisse). Il
  // dito resta 1:1 (lerp 1 durante il trascinamento), lo slancio decelera
  // con lo stesso smorzamento della rotella.
  syncTouch: true,
  syncTouchLerp: 0.075,
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

// ---------- Fermate di scroll ----------
// UNA regola per tutto il sito: ogni sezione e ogni passo di una sezione
// (le righe del Punto, le tappe del Percorso, le fasi di Come lavoriamo, le
// card del duo su telefono…) è una FERMATA, e tutte si comportano allo stesso
// modo:
//   - rotella/trackpad: vicino alla fermata lo scroll fa resistenza e un
//     colpo che la attraverserebbe si ferma esattamente lì; per proseguire
//     serve un nuovo gesto (una pausa nella rotella) o tenerla ancora un po';
//   - touch: lo swipe lanciato si posa sulla prossima fermata invece di
//     scavalcarla; il trascinamento col dito resta libero;
//   - da fermi, vicino a una fermata, la pagina ci si posa da sola.
// Così nessun passo si perde, a qualunque velocità si scorra.
// Le fermate sono gli elementi [data-scroll-detent] (la posizione di scroll
// che li porta in cima al viewport) più le posizioni calcolate in
// `extraDetents` (passi dentro un pin). Si rileggono a ogni refresh di
// ScrollTrigger e quando un'isola le ri-misura (evento "apd:detents").
// I Servizi hanno la loro regia a scatti (una scrollata = una scena), che è
// la stessa regola applicata dentro al pin.
let detentYs: number[] = [];
const extraDetents: (() => number)[] = [];
// Posizione dal LAYOUT (catena di offsetTop), non da getBoundingClientRect:
// alcune fermate stanno dentro elementi animati in transform (il foglio dei
// contatti che sale) e misurate a metà animazione finivano spostate.
const layoutTop = (el: HTMLElement) => {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
};
const readDetents = () => {
  const ys = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-detent]")).map((el) =>
    Math.round(layoutTop(el))
  );
  detentYs = [...ys, ...extraDetents.map((f) => Math.round(f()))].sort((a, b) => a - b);
};

// Prima fermata attraversata andando da `from` a `to` (NaN se nessuna). La
// fermata su cui si è già posati non conta: da lì si riparte.
const crossedStop = (from: number, to: number) => {
  if (to > from) {
    for (const d of detentYs) if (from < d - 1 && to > d) return d;
  } else {
    for (let i = detentYs.length - 1; i >= 0; i--) {
      const d = detentYs[i];
      if (from > d + 1 && to < d) return d;
    }
  }
  return NaN;
};

const STOP_QUIET_MS = 140; // pausa della rotella che conta come "nuovo gesto"
// Un nuovo gesto si riconosce anche senza pausa: la coda d'inerzia del
// trackpad ha delta che si spengono e basta, una spinta nuova li fa
// RISALIRE. Finché i delta calano la pagina resta ferma sulla fermata
// (prima una valvola a tempo si apriva durante l'inerzia e la fermata
// veniva superata lo stesso). STOP_HOLD_MS resta solo come sicurezza.
const STOP_HOLD_MS = 2200;
let gateY = NaN;
let gateSince = 0;
let lastWheelAt = 0;
let lastRaw = 0;
const stopGate = (data: { deltaY: number }, raw: number): boolean => {
  const now = performance.now();
  const quiet = now - lastWheelAt > STOP_QUIET_MS;
  const rising = Math.abs(raw) > Math.abs(lastRaw) * 1.3 + 2 && now - gateSince > 200;
  lastWheelAt = now;
  lastRaw = raw;
  const t = lenis.targetScroll;
  if (!isNaN(gateY)) {
    const fresh = quiet || rising || now - gateSince > STOP_HOLD_MS;
    if (Math.abs(t - gateY) < 2 && !fresh) return true;
    gateY = NaN;
  }
  const d = crossedStop(t, t + data.deltaY);
  if (!isNaN(d)) {
    data.deltaY = d - t;
    gateY = d;
    gateSince = now;
  }
  return Math.abs(data.deltaY) < 0.5;
};

// Touch, stessa regola: un gesto supera al massimo una fermata. Se il dito
// la attraversa trascinando, la pagina si ferma lì finché il dito non si
// alza (o dopo TOUCH_HOLD_MS di trascinamento continuo).
const TOUCH_HOLD_MS = 1000;
let touchHeld = NaN;
let touchHeldSince = 0;
const touchGate = (data: { deltaY: number }): boolean => {
  const now = performance.now();
  const t = lenis.targetScroll;
  if (!isNaN(touchHeld)) {
    if (now - touchHeldSince < TOUCH_HOLD_MS) return true;
    touchHeld = NaN;
    return false;
  }
  const d = crossedStop(t, t + data.deltaY);
  if (!isNaN(d)) {
    data.deltaY = d - t;
    touchHeld = d;
    touchHeldSince = now;
  }
  return Math.abs(data.deltaY) < 0.5;
};

// Swipe lanciato: Lenis calcola lo slancio dalla velocità (|v|^1.7, vedi
// touchInertiaExponent). Se la corsa scavalcherebbe una fermata, la corsa
// finisce lì, con la stessa decelerazione. Se il gesto si è già fermato su
// una fermata, niente slancio: si riparte col gesto dopo.
const touchLanding = (dir: number) => {
  if (!isNaN(touchHeld)) {
    touchHeld = NaN;
    return false;
  }
  const v = lenis.velocity;
  if (Math.abs(v) < 0.5) return true;
  const sign = Math.sign(dir || v);
  const t = lenis.targetScroll;
  const d = crossedStop(t, t + sign * Math.abs(v) ** 1.7);
  if (isNaN(d)) return true;
  lenis.scrollTo(d, { programmatic: false, lerp: 0.075 });
  return false;
};

const nearestDetent = (y: number) => {
  let best = NaN;
  for (const d of detentYs) if (isNaN(best) || Math.abs(d - y) < Math.abs(best - y)) best = d;
  return best;
};
ScrollTrigger.addEventListener("refresh", readDetents);
window.addEventListener("apd:detents", readDetents);
readDetents();

const DETENT_ZONE = 0.16; // ±viewport in cui la rotella fa resistenza
const DETENT_SNAP = 0.3; // ±viewport entro cui, da fermi, ci si posa
const DETENT_GRIP = 0.25; // fattore minimo sul delta (sul punto esatto)
const detentFactor = (y: number) => {
  if (!detentYs.length) return 1;
  const zone = window.innerHeight * DETENT_ZONE;
  const dist = Math.abs(y - nearestDetent(y));
  if (dist >= zone) return 1;
  return DETENT_GRIP + (1 - DETENT_GRIP) * Math.pow(dist / zone, 1.6);
};

let touching = false;
window.addEventListener("touchstart", () => (touching = true), { passive: true });
window.addEventListener("touchend", () => (touching = false), { passive: true });
let detentTimer = 0;
const settleOnDetent = () => {
  window.clearTimeout(detentTimer);
  detentTimer = window.setTimeout(() => {
    if (touching || lenis.isLocked || isTravelling() || Math.abs(lenis.velocity) > 0.4) return;
    const y = lenis.scroll;
    const d = nearestDetent(y);
    const dist = Math.abs(d - y);
    // In avanti (nel verso dello scroll) ci si posa da più lontano; una
    // fermata appena superata richiama indietro solo se è vicinissima.
    const ahead = Math.sign(d - y) === lastDir;
    const reach = window.innerHeight * (ahead ? DETENT_SNAP : DETENT_SNAP * 0.4);
    if (isNaN(d) || dist < 2 || dist > reach) return;
    lenis.scrollTo(d, {
      duration: gsap.utils.clamp(0.5, 1, (dist / window.innerHeight) * 2.6),
      easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    });
  }, 170);
};
let lastDir = 1;
lenis.on("scroll", () => {
  if (lenis.direction) lastDir = lenis.direction;
  settleOnDetent();
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

// ---------- Navbar a scomparsa (schermi stretti) ----------
// Su telefono e tablet la pillola copre titoli e form mentre si legge: si
// ritira scorrendo verso il basso e torna appena si risale (o vicino al
// top). Solo una classe sul dock (transform in PillNav.css); mai a menu
// aperto né con il focus da tastiera dentro la navbar.
{
  const narrow = window.matchMedia("(max-width: 960px)");
  let dock: HTMLElement | null = null;
  let menuOpen = false;
  let lastY = 0;
  let run = 0; // strada fatta nella direzione corrente
  const setTucked = (on: boolean) => {
    dock ??= document.querySelector<HTMLElement>(".pnav-dock");
    dock?.classList.toggle("is-tucked", on);
  };
  window.addEventListener("pillnav:toggle", (e) => {
    menuOpen = (e as CustomEvent<{ open: boolean }>).detail.open;
    if (menuOpen) setTucked(false);
  });
  // Una scena a schermo pieno (le card del duo) chiede la scena libera: la
  // pillola resta ritirata finché la sosta dura.
  let hushed = false;
  window.addEventListener("pillnav:hush", (e) => {
    hushed = (e as CustomEvent<{ on: boolean }>).detail.on;
    if (hushed && !menuOpen) setTucked(true);
  });
  document.addEventListener("focusin", (e) => {
    if ((e.target as Element | null)?.closest?.(".pnav-dock")) setTucked(false);
  });
  lenis.on("scroll", ({ scroll }: { scroll: number }) => {
    const dy = scroll - lastY;
    lastY = scroll;
    if (!narrow.matches || menuOpen) return setTucked(false);
    if (scroll < 120) return setTucked(false);
    if (hushed) return setTucked(true);
    run = Math.sign(dy) === Math.sign(run) ? run + dy : dy;
    if (run > 36) setTucked(true);
    else if (run < -16) setTucked(false);
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
const svcSteps = gsap.utils.toArray<HTMLButtonElement>("[data-svc-step]");
const svcFixes = gsap.utils.toArray<HTMLElement>("[data-svc-fix]");
const servicesSection = document.querySelector<HTMLElement>("#cosa-facciamo");

if (
  svcRoot &&
  svcScene &&
  svcFrame &&
  svcTrack &&
  svcCopyWrap &&
  svcShots.length &&
  !staticScenes
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
    // Notifiche risolte: ognuna nel posto della card della SUA scena (con
    // `translate`, separato dal transform dell'entrata). Nel modo reel
    // stanno tutte in alto al centro (CSS).
    svcFixes.forEach((el, k) => {
      el.style.translate = reel ? "" : `${frameAt(k)}px 0`;
    });
  };

  // ---- Entrata a tempo del testo di scena ----
  // Le descrizioni si danno il cambio in dissolvenza seguendo `p` (apply);
  // il CONTENUTO della scena invece entra a tempo, quando la card si è
  // posata: numero, titolo parola per parola (maschera), evidenziatore sul
  // corsivo, descrizione, etichette in cascata, link. Insieme, la notifica
  // risolta arriva sul bordo della card (storta, si posa dritta: force3D off
  // e niente scala, così a riposo resta nitida). Le timeline tornano a zero
  // quando la loro scena è del tutto spenta, pronte per il prossimo giro.
  const copyTls = svcCopies.map((el, k) => {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
    const num = el.querySelector("[data-svc-num]");
    const title = el.querySelector<HTMLElement>("[data-svc-title]");
    const desc = el.querySelector("[data-svc-desc]");
    const tags = el.querySelectorAll("[data-svc-tag]");
    const link = el.querySelector("[data-svc-link]");
    if (num) tl.fromTo(num, { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.5 }, 0);
    if (title) {
      const words = SplitText.create(title, { type: "words", mask: "words" }).words;
      tl.fromTo(words, { yPercent: 112 }, { yPercent: 0, duration: 0.75, stagger: 0.06 }, 0.05);
      const em = title.querySelector("em");
      if (em) tl.fromTo(em, { "--hl": 0 }, { "--hl": 1, duration: 0.55, ease: "power2.inOut" }, 0.5);
    }
    if (desc) tl.fromTo(desc, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.3);
    if (tags.length) {
      tl.fromTo(
        tags,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.07, ease: "back.out(1.6)" },
        0.45
      );
    }
    if (link) tl.fromTo(link, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45 }, 0.62);
    const fix = svcFixes[k];
    if (fix) {
      tl.fromTo(
        fix,
        { autoAlpha: 0, y: 30, rotation: k % 2 ? 6 : -6 },
        { autoAlpha: 1, y: 0, rotation: 0, duration: 0.7, ease: "back.out(1.5)", force3D: false },
        0.35
      );
    }
    return tl;
  });
  // La notifica esce in fretta appena la sua card riparte (prima che la
  // cornice la porti via).
  const fixLeaving = new Set<number>();
  const fixOut = (k: number) => {
    const fix = svcFixes[k];
    if (!fix || fixLeaving.has(k)) return;
    fixLeaving.add(k);
    copyTls[k].pause();
    gsap.to(fix, { autoAlpha: 0, y: 14, duration: 0.22, ease: "power2.in", overwrite: true });
  };

  const setFrame = (v: number) =>
    gsap.set(svcFrame, vertical ? { y: v } : { x: v });
  const setTrack = (v: number) =>
    gsap.set(svcTrack, vertical ? { y: v } : { x: v });

  // `p` = indice continuo della scena (0 → N-1): lo muove la timeline in
  // scrub, tutto il resto è calcolato da qui (idempotente, quindi corretto
  // anche scrollando all'indietro).
  const state = { p: 0 };
  // Il pin (creato più sotto): serve già ad apply per sapere se è attivo.
  let st: ScrollTrigger | null = null;

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

    // Barre: quella della scena a fuoco si riempie mentre la corsa avanza.
    svcFills.forEach((el, k) => {
      el.style.transform = `scaleX(${gsap.utils.clamp(0, 1, p - k + 1).toFixed(3)})`;
    });
    const near = Math.round(p);
    svcSteps.forEach((el, k) => {
      el.classList.toggle("is-on", k === near);
      if (k === near) el.setAttribute("aria-current", "step");
      else el.removeAttribute("aria-current");
    });

    // Entrata a tempo: parte quando la card è posata (solo a sezione in
    // pin, non al caricamento); torna a zero a scena spenta.
    const live = !!st?.isActive;
    copyTls.forEach((tl, k) => {
      const d = Math.abs(p - k);
      if (live && d < 0.004 && tl.progress() === 0 && !tl.isActive()) {
        fixLeaving.delete(k);
        tl.play(0);
      } else if (d > 0.02 && tl.progress() > 0) fixOut(k);
      if (d >= 0.3 && tl.progress() > 0) tl.pause(0);
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
    // Entrando nel pin la scena a fuoco fa la sua entrata (vedi apply).
    onToggle: () => apply(),
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

  // Navigazione: un clic porta alla scena (anche saltandone una). Il
  // viaggio dichiara di essere tale, così l'atterraggio d'ingresso non lo
  // intercetta se si clicca a sezione non ancora in pin.
  svcSteps.forEach((el, k) =>
    el.addEventListener("click", () => {
      if (!st) return;
      if (!st.isActive) {
        travelFor(STEP_TIME);
        index = k;
        state.p = k;
        apply();
        lockedScrollTo(anchorOf(k), STEP_TIME);
        return;
      }
      goTo(k);
    })
  );

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

// Servizi impilati per schermo basso (non per reduced motion): le clip
// suonano quando sono in vista, come nella versione animata.
if (shortViewport && !reduceMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach(({ target, isIntersecting }) => {
        const v = target as HTMLVideoElement;
        if (isIntersecting) {
          v.preload = "auto";
          void v.play().catch(() => {});
        } else if (!v.paused) v.pause();
      }),
    { threshold: 0.4 }
  );
  document.querySelectorAll<HTMLVideoElement>("[data-svc-video]").forEach((v) => io.observe(v));
}

// ---------- Il punto — racconto in tre tempi dentro un pin ----------------
// Il palco (una schermata) si ferma e lo scroll, in scrub, fa avanzare la
// storia (markup e tempi in HomePage.astro, impaginazione in global.css):
//   0. ARRIVO — mentre il palco sale dalla hero il fondale compare e
//      "Fai un lavoro eccellente." si alza parola per parola, GRANDE e al
//      centro della schermata (il lead parte trasformato verso il centro).
//   1. LAVORO → CAOS — il lead si rimpicciolisce al suo posto di testata e
//      sotto la frase si completa riga per riga: hairline che si disegna,
//      riga che sale, evidenziatore sulla parola chiave e, insieme, la
//      notifica di quella riga che "arriva" ai margini.
//   2. SVOLTA — il problema si ritira verso l'alto, le notifiche vengono
//      risucchiate al centro e lì sale la promessa: parole che emergono,
//      evidenziatore blu su "il sistema", poi il corsivo e la notifica "ok".
//   3. USCITA — a pin finito la svolta sale e si spegne mentre arrivano i
//      Servizi; i bordi del fondale sono già sciolti nella carta.
// Solo transform, opacità e due variabili CSS (tratti): niente layout per
// frame. Le misure (centro del lead, rotte delle notifiche) si rileggono a
// ogni refresh. Con reduced motion non parte nulla: colonna statica.
const point = document.querySelector<HTMLElement>("[data-point]");
const pointStage = point?.querySelector<HTMLElement>("[data-point-stage]");
const pointBg = point?.querySelector<HTMLElement>("[data-point-bg]");
const pointLead = point?.querySelector<HTMLElement>("[data-point-lead]");
const pointPain = point?.querySelector<HTMLElement>("[data-point-pain]");
const pointTurn = point?.querySelector<HTMLElement>("[data-point-turn]");
const pointTurnTitle = point?.querySelector<HTMLElement>("[data-point-turn-title]");
const pointTurnSub = point?.querySelector<HTMLElement>("[data-point-turn-sub]");
if (
  point &&
  pointStage &&
  pointBg &&
  pointLead &&
  pointPain &&
  pointTurn &&
  pointTurnTitle &&
  pointTurnSub &&
  !staticScenes
) {
  point.classList.add("is-live");

  const but = point.querySelector<HTMLElement>("[data-point-but]");
  const items = gsap.utils.toArray<HTMLElement>("[data-point-item]", point);
  const pings = gsap.utils.toArray<HTMLElement>("[data-point-ping]", point);
  const ok = point.querySelector<HTMLElement>("[data-point-ok]");
  const bgImg = pointBg.querySelector<HTMLElement>("img");
  const turnKey = pointTurnTitle.querySelector<HTMLElement>("strong");

  // Posizione di un elemento nel palco dal layout (offset* ignora i
  // transform): corretta anche a scena già mossa.
  const offsetIn = (el: HTMLElement) => {
    let x = 0;
    let y = 0;
    let n: HTMLElement | null = el;
    while (n && n !== pointStage) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    return { x, y };
  };
  // Il lead parte al centro della schermata, ingrandito fin dove ci sta.
  const leadScale = () =>
    Math.min(1.9, (pointStage.clientWidth * 0.88) / pointLead.offsetWidth);
  const leadShift = (axis: "x" | "y") => {
    const o = offsetIn(pointLead);
    return axis === "x"
      ? pointStage.clientWidth / 2 - (o.x + pointLead.offsetWidth / 2)
      : pointStage.clientHeight / 2 - (o.y + pointLead.offsetHeight / 2);
  };
  // Rotta di una notifica verso il centro del palco (il risucchio).
  const toCenter = (el: HTMLElement, axis: "x" | "y") => {
    const o = offsetIn(el);
    return axis === "x"
      ? pointStage.clientWidth / 2 - (o.x + el.offsetWidth / 2)
      : pointStage.clientHeight / 2 - (o.y + el.offsetHeight / 2);
  };

  // Parole con maschera: salgono dal basso come da una fessura.
  const leadWords = SplitText.create(pointLead, { type: "words", mask: "words" }).words;
  const turnWords = SplitText.create(pointTurnTitle, { type: "words", mask: "words" }).words;
  const subWords = SplitText.create(pointTurnSub, { type: "words", mask: "words" }).words;
  const marks = items.map((el) => el.querySelector<HTMLElement>("strong"));

  // ---- 0. Arrivo dalla hero (prima del pin) ----
  gsap.set(pointLead, {
    x: () => leadShift("x"),
    y: () => leadShift("y"),
    scale: leadScale,
  });
  gsap.fromTo(
    pointBg,
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      ease: "sine.inOut",
      scrollTrigger: { trigger: point, start: "top 95%", end: "top 15%", scrub: SCRUB },
    }
  );
  gsap.fromTo(
    leadWords,
    { yPercent: 110 },
    {
      yPercent: 0,
      ease: "power3.out",
      stagger: 0.12,
      scrollTrigger: { trigger: point, start: "top 70%", end: "top 12%", scrub: SCRUB },
    }
  );

  // ---- 1-2. Il racconto, dentro al pin ----
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  // Respiro: il lead resta solo per un attimo.
  tl.to({}, { duration: 0.5 });
  // Il lead va al suo posto di testata.
  tl.fromTo(
    pointLead,
    { x: () => leadShift("x"), y: () => leadShift("y"), scale: leadScale },
    { x: 0, y: 0, scale: 1, duration: 1.1, ease: "power3.inOut" },
    0.5
  );
  if (but) tl.fromTo(but, { autoAlpha: 0, x: -16 }, { autoAlpha: 1, x: 0, duration: 0.6 }, 1.25);

  items.forEach((item, i) => {
    const at = 1.55 + i * 1.05;
    tl.fromTo(item, { "--rule": 0 }, { "--rule": 1, duration: 0.6, ease: "power2.inOut" }, at);
    tl.fromTo(item, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.7 }, at + 0.1);
    const mark = marks[i];
    if (mark) tl.fromTo(mark, { "--mark": 0 }, { "--mark": 1, duration: 0.55, ease: "power2.inOut" }, at + 0.45);
    // La notifica arriva storta e si posa dritta. Niente scala in entrata e
    // force3D off: Chrome rasterizzerebbe la scheda alla taglia piccola
    // d'inizio e la terrebbe sgranata; così a riposo è un 2D pulito.
    const ping = pings[i];
    if (ping) {
      tl.fromTo(
        ping,
        { autoAlpha: 0, y: 46, rotation: i % 2 ? 7 : -7 },
        { autoAlpha: 1, y: 0, rotation: 0, duration: 0.7, ease: "back.out(1.5)", force3D: false },
        at + 0.3
      );
    }
  });

  // SVOLTA — il caos si ritira e viene risucchiato al centro.
  const turnAt = 1.55 + items.length * 1.05 + 0.6;
  tl.to(
    pointPain,
    { autoAlpha: 0, y: -70, scale: 0.97, duration: 0.9, ease: "power2.in" },
    turnAt
  );
  pings.forEach((ping, i) => {
    tl.to(
      ping,
      {
        x: () => toCenter(ping, "x"),
        y: () => toCenter(ping, "y"),
        scale: 0.25,
        autoAlpha: 0,
        duration: 0.85,
        ease: "power2.in",
        force3D: false,
      },
      turnAt + 0.05 + i * 0.08
    );
  });
  // Il fondale si schiarisce di un filo: dopo il caos, aria.
  if (bgImg) tl.to(bgImg, { opacity: 0.36, duration: 1.4, ease: "sine.inOut" }, turnAt);

  const riseAt = turnAt + 0.85;
  tl.set(pointTurn, { autoAlpha: 1 }, riseAt - 0.01);
  tl.fromTo(turnWords, { yPercent: 110 }, { yPercent: 0, duration: 0.8, stagger: 0.07 }, riseAt);
  if (turnKey) {
    tl.fromTo(
      turnKey,
      { "--line": 0 },
      { "--line": 1, duration: 0.6, ease: "power2.inOut" },
      riseAt + 0.75
    );
  }
  tl.fromTo(subWords, { yPercent: 110 }, { yPercent: 0, duration: 0.7, stagger: 0.05 }, riseAt + 0.95);
  if (ok) {
    tl.fromTo(
      ok,
      { autoAlpha: 0, scale: 0.85, y: 24 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.6)" },
      riseAt + 1.45
    );
  }
  // Coda: la promessa resta in scena da sola prima di lasciare il pin.
  tl.to({}, { duration: 0.8 });

  gsap.set(pointTurn, { autoAlpha: 0 });

  // Il fondale si distende lungo tutto il racconto (da 1.1 a 1).
  if (bgImg) {
    gsap.fromTo(
      bgImg,
      { scale: 1.1 },
      {
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: point,
          start: "top bottom",
          end: () => "+=" + (window.innerHeight * 3.6),
          scrub: SCRUB,
          invalidateOnRefresh: true,
        },
      }
    );
  }

  const pointPin = ScrollTrigger.create({
    trigger: point,
    start: "top top",
    // ~0.34 schermate per unità di timeline: ogni riga del problema vale
    // poco più di un terzo di schermata di scroll.
    end: () => "+=" + Math.round(window.innerHeight * 0.34 * tl.duration()),
    pin: pointStage,
    animation: tl,
    scrub: SCRUB,
    invalidateOnRefresh: true,
    // Primo pin della pagina, prima dei Servizi (3): ogni spacer a valle
    // legge posizioni già spostate.
    refreshPriority: 4,
  });

  // Fermate dentro al pin (vedi "Fermate di scroll"): il lead al centro,
  // ogni riga del problema completa (riga, evidenziatore e notifica), la
  // svolta chiusa dalla notifica "ok".
  const pointStops = [
    0,
    ...items.map((_, i) => 1.55 + i * 1.05 + 1),
    riseAt + (ok ? 2.15 : 1.65),
  ];
  pointStops.forEach((t) =>
    extraDetents.push(() => pointPin.start + (pointPin.end - pointPin.start) * (t / tl.duration()))
  );
  readDetents();

  // ---- 3. Uscita, a pin finito ----
  gsap.fromTo(
    pointTurn,
    { y: 0 },
    {
      y: () => -window.innerHeight * 0.12,
      ease: "none",
      immediateRender: false,
      scrollTrigger: {
        start: () => pointPin.end,
        end: () => pointPin.end + window.innerHeight * 0.7,
        scrub: SCRUB,
        invalidateOnRefresh: true,
        refreshPriority: 4,
      },
    }
  );
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

// (Progetti e Contatti non hanno più un pin di "sosta": la fermata in cima
// alla sezione — [data-scroll-detent] in HomePage.astro — li ferma come ogni
// altra sezione, senza scroll a vuoto dopo.)

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
    // la sottolineatura a mano si disegna quando il titolo è in vista
    ScrollTrigger.create({
      trigger: aboutCta.querySelector(".about-cta-title"),
      start: "top 72%",
      once: true,
      onEnter: () => aboutCta.classList.add("is-drawn"),
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
// Hero "dietro i pixel" (ritratti a tessere + lente), manifesto che si
// accende con lo scroll, card del duo che si mettono a fuoco. Le coreografie
// condivise (CTA, footer, Percorso) restano più sotto.
const aboutPage = document.querySelector<HTMLElement>(".aboutpage");
if (aboutPage) {
  // Le entrate della hero partono quando il loader se n'è andato (o subito,
  // se in questa sessione è già stato visto).
  const afterLoader = (cb: () => void) => {
    const root = document.documentElement;
    if (!root.classList.contains("apd-loading")) return cb();
    const mo = new MutationObserver(() => {
      if (root.classList.contains("apd-loading")) return;
      mo.disconnect();
      cb();
    });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
  };
  const rampOf = (el: HTMLElement) =>
    RAMPS[(el.dataset.tone as keyof typeof RAMPS) || "shadow"] ?? RAMPS.shadow;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // --- HERO ---
  const apHero = aboutPage.querySelector<HTMLElement>("[data-ap-hero]");
  const stage = aboutPage.querySelector<HTMLElement>("[data-ap-stage]");
  const lensCanvases = Array.from(
    aboutPage.querySelectorAll<HTMLCanvasElement>("[data-px-lens]")
  );
  const lenses = lensCanvases.map(
    (c) =>
      new PixelPortrait(c, {
        src: c.dataset.src!,
        ramp: rampOf(c),
        block: c.getBoundingClientRect().width < 220 ? 10 : 14,
        zoom: Number(c.dataset.zoom) || 1,
      })
  );

  if (reduceMotion) {
    lenses.forEach((p) => p.sharp());
  } else if (apHero && stage) {
    // Lente: col mouse segue il cursore sul ritratto sotto di lui (l'altro si
    // spegne tutto pixel); fuori dal palco torna il percorso automatico. Su
    // touch un tocco mette a fuoco il punto per qualche secondo.
    const localOf = (c: HTMLCanvasElement, e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, r };
    };
    stage.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      lensCanvases.forEach((c, i) => {
        const { x, y, r } = localOf(c, e);
        const pad = r.width * 0.25;
        const near = x > -pad && y > -pad && x < r.width + pad && y < r.height + pad;
        near ? lenses[i].point(x, y) : lenses[i].dim();
      });
    });
    stage.addEventListener("pointerleave", () => lenses.forEach((p) => p.point(null)));
    lensCanvases.forEach((c, i) => {
      let release = 0;
      c.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse") return;
        const { x, y } = localOf(c, e);
        lenses[i].point(x, y);
        window.clearTimeout(release);
        release = window.setTimeout(() => lenses[i].point(null), 2600);
      });
    });

    // Pixel sfuggiti: parallasse col cursore su tutta la hero.
    if (finePointer) {
      apHero.addEventListener("pointermove", (e) => {
        const r = apHero.getBoundingClientRect();
        stage.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        stage.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
    }

    const title = apHero.querySelector<HTMLElement>("[data-ap-hero-title]");
    const plain = title
      ? SplitText.create(title.querySelectorAll(".ap-hero-line > span"), {
          type: "words",
          mask: "words",
        })
      : null;
    const accent = apHero.querySelectorAll<HTMLElement>("[data-ap-hero-accent]");
    const dots = apHero.querySelectorAll<HTMLElement>("[data-ap-px-dot]");
    const fades = apHero.querySelectorAll<HTMLElement>("[data-ap-hero-fade]");
    const caps = apHero.querySelectorAll<HTMLElement>(".ap-portrait-cap");
    const bits = apHero.querySelectorAll<HTMLElement>("[data-ap-bit]");
    const hint = apHero.querySelector<HTMLElement>("[data-ap-hint]");
    gsap.set(accent, { clipPath: "inset(-12% 100% -28% -6%)" });
    gsap.set(dots, { scale: 0 });

    afterLoader(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.set(title, { opacity: 1 })
        .fromTo(fades[0], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8 }, 0)
        .fromTo(
          plain?.words ?? [],
          { yPercent: 115 },
          { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.08 },
          0.1
        )
        // "i pixel." si scrive a scatti, come un display che si accende.
        .to(accent, { clipPath: "inset(-12% -10% -28% -6%)", duration: 0.75, ease: "steps(9)" }, 0.55)
        .to(dots, { scale: 1, duration: 0.5, ease: "back.out(3)" }, 1.25)
        .to(dots, { opacity: 0, duration: 0.14, ease: "steps(1)", repeat: 3, yoyo: true }, 1.5)
        .fromTo(
          Array.from(fades).slice(1),
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 },
          0.8
        )
        .call(() => lenses.forEach((p) => p.start()), [], 0.35)
        .fromTo(
          bits,
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2.4)", stagger: 0.09 },
          1.1
        )
        .fromTo(caps, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.15 }, 1.35)
        .fromTo(hint, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8 }, 2);
    });

    // Uscita: il testo sale un filo più veloce della pagina, i due ritratti a
    // velocità diverse → profondità sull'aurora.
    const scrubOut = { trigger: apHero, start: "top top", end: "bottom top", scrub: SCRUB };
    gsap.to("[data-ap-hero-copy]", { yPercent: -10, ease: "none", scrollTrigger: scrubOut });
    // Su mobile i ritratti stanno in colonna sotto il testo: niente scarto.
    if (window.matchMedia("(min-width: 961px)").matches) {
      aboutPage.querySelectorAll<HTMLElement>("[data-ap-portrait]").forEach((el, i) => {
        gsap.to(el, { y: i ? -150 : -70, ease: "none", scrollTrigger: { ...scrubOut } });
      });
    }
  }

  // --- MANIFESTO ---
  aboutPage.querySelectorAll<HTMLElement>("[data-ap-manifesto] [data-ap-rise]").forEach((el) =>
    revealRise(el, { trigger: el, start: "top 86%", y: 24, duration: 0.9 })
  );
  const statement = aboutPage.querySelector<HTMLElement>("[data-ap-statement]");
  if (statement && !reduceMotion) {
    // Le parole si accendono una a una mentre la frase attraversa lo schermo;
    // per ultimo l'evidenziatore sotto "un'agenzia intera".
    const words = SplitText.create(statement, { type: "words" }).words;
    const em = statement.querySelectorAll("em");
    gsap.set(em, { "--hl": 0 });
    gsap
      .timeline({
        scrollTrigger: { trigger: statement, start: "top 85%", end: "bottom 58%", scrub: SCRUB },
      })
      .fromTo(words, { opacity: 0.13 }, { opacity: 1, duration: 0.3, stagger: 0.12, ease: "none" })
      .to(em, { "--hl": 1, duration: 0.6, ease: "power2.out" });
  }
  aboutPage.querySelectorAll<HTMLElement>("[data-ap-fact]").forEach((fact, i) => {
    if (reduceMotion) return;
    const reel = fact.querySelector<HTMLElement>("[data-ap-reel]");
    const rest = fact.querySelectorAll<HTMLElement>(".ap-fact-label, .ap-fact-text");
    gsap
      .timeline({
        scrollTrigger: { trigger: fact, start: "top 88%", once: true },
        delay: i * 0.14,
      })
      .fromTo(fact, { "--rule": 0 }, { "--rule": 1, duration: 1.1, ease: "power3.inOut" }, 0)
      // Contachilometri: la striscia gira e si ferma sulla cifra vera.
      .fromTo(reel, { y: 0, yPercent: 0 }, { y: 0, yPercent: -90, duration: 1.7, ease: "power4.out" }, 0.1)
      .fromTo(rest, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }, 0.45);
    // Al passaggio del mouse la cifra rigira e si riferma sul valore vero.
    fact.addEventListener("mouseenter", () => {
      if (!reel || gsap.isTweening(reel)) return;
      gsap.fromTo(reel, { yPercent: 0 }, { yPercent: -90, duration: 1.1, ease: "power4.out" });
    });
  });

  // La catena: con lo scroll i passaggi in mezzo vengono barrati e cadono,
  // "tu" e "noi" si vengono incontro, il filo tratteggiato diventa pieno e
  // l'etichetta passa da "Di solito" a "Con noi". Scrub: si riavvolge
  // tornando su. Con reduced motion resta lo stato finale.
  const chain = aboutPage.querySelector<HTMLElement>("[data-ap-chain]");
  if (chain) {
    const track = chain.querySelector<HTMLElement>(".ap-chain-track")!;
    const you = chain.querySelector<HTMLElement>("[data-ap-chain-you]")!;
    const us = chain.querySelector<HTMLElement>("[data-ap-chain-us]")!;
    const wire = chain.querySelector<HTMLElement>("[data-ap-chain-wire]")!;
    const on = chain.querySelector<HTMLElement>("[data-ap-chain-on]");
    const hops = chain.querySelectorAll<HTMLElement>("[data-ap-chain-hop]");
    const before = chain.querySelectorAll<HTMLElement>("[data-ap-chain-before]");
    const after = chain.querySelectorAll<HTMLElement>("[data-ap-chain-after]");
    // Misure senza transform: posizioni di layout dentro la traccia.
    const GAP = 44; // filo che resta fra i due capi, a catena chiusa
    const wireL = () => you.offsetLeft + you.offsetWidth / 2;
    const wireR = () => track.clientWidth - (us.offsetLeft + us.offsetWidth / 2);
    const dx = () => Math.max(0, (us.offsetLeft - (you.offsetLeft + you.offsetWidth) - GAP) / 2);
    gsap.set(wire, { left: wireL, right: wireR });

    const tl = gsap
      .timeline({ defaults: { ease: "power2.inOut" }, paused: true })
      .to(hops, { "--strike": 1, duration: 0.35, stagger: 0.12, ease: "power2.out" }, 0)
      .to(hops, {
        y: 34,
        rotation: (i: number) => (i % 2 ? 9 : -7),
        opacity: 0,
        duration: 0.45,
        stagger: 0.1,
        ease: "power2.in",
      }, 0.4)
      .to(you, { x: dx, duration: 0.6 }, 0.85)
      .to(us, { x: () => -dx(), duration: 0.6 }, 0.85)
      .to(wire, { left: () => wireL() + dx(), right: () => wireR() + dx(), duration: 0.6 }, 0.85)
      .to(on, { opacity: 1, duration: 0.4 }, 1.05)
      .to(before, { yPercent: -60, opacity: 0, duration: 0.3 }, 1.05)
      .fromTo(after, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.3 }, 1.15)
      .set({}, {}, 1.5);
    // l'inchiostro sui due capi arriva solo a catena chiusa
    tl.eventCallback("onUpdate", () => chain.classList.toggle("is-linked", tl.progress() > 0.9));

    if (reduceMotion) {
      tl.progress(1);
    } else {
      ScrollTrigger.create({
        trigger: chain,
        // si legge prima "Di solito" (catena intera), poi la si vede chiudersi
        // mentre sale verso la parte alta dello schermo
        start: "top 62%",
        end: "top 18%",
        scrub: SCRUB,
        animation: tl,
        invalidateOnRefresh: true,
      });
    }
  }

  // --- IL DUO ---
  revealRise(aboutPage.querySelectorAll("[data-ap-duo] .ap-duo-head [data-ap-rise]"), {
    trigger: "[data-ap-duo]",
    start: "top 78%",
    stagger: 0.12,
    y: 36,
  });
  aboutPage.querySelectorAll<HTMLElement>("[data-ap-card]").forEach((card) => {
    const canvas = card.querySelector<HTMLCanvasElement>("[data-px-reveal]");
    if (reduceMotion) {
      if (canvas) canvas.hidden = true;
      return;
    }
    const name = card.querySelector<HTMLElement>("[data-ap-card-name]");
    const dot = name?.querySelector<HTMLElement>(".ap-px-dot");
    const ins = card.querySelectorAll<HTMLElement>("[data-ap-card-in]");
    const quoteEm = card.querySelectorAll<HTMLElement>(".ap-card-quote em");
    const chars = name ? SplitText.create(name, { type: "chars", mask: "chars" }).chars : [];
    const px = canvas
      ? new PixelPortrait(canvas, { src: canvas.dataset.src!, ramp: rampOf(canvas), block: 22, mode: "reveal" })
      : null;
    const wave = { v: 0 };
    gsap.set(quoteEm, { "--hl": 0 });
    gsap.set(dot, { scale: 0 });

    const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: "top 80%", once: true } });
    tl.fromTo(card, { opacity: 0, y: 90 }, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }, 0)
      // La foto si mette a fuoco a ondata dall'alto, poi resta la <img> vera.
      .to(wave, { v: 1.1, duration: 1.7, ease: "power1.inOut", onUpdate: () => px?.setWave(wave.v) }, 0.35)
      .to(canvas, { autoAlpha: 0, duration: 0.35, onComplete: () => px?.destroy() }, ">-0.1")
      .fromTo(chars, { yPercent: 108 }, { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.05 }, 0.5)
      .to(dot, { scale: 1, duration: 0.5, ease: "back.out(3)" }, 0.95)
      .fromTo(ins, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" }, 0.75)
      .to(quoteEm, { "--hl": 1, duration: 0.8, ease: "power2.inOut" }, 1.45);

    // Inclinazione leggera verso il cursore (solo mouse).
    if (finePointer) {
      gsap.set(card, { transformPerspective: 1400 });
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.8, ease: "power3.out" });
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.8, ease: "power3.out" });
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        rx(((e.clientY - r.top) / r.height - 0.5) * -4);
        ry(((e.clientX - r.left) / r.width - 0.5) * 5);
      });
      card.addEventListener("pointerleave", () => {
        rx(0);
        ry(0);
      });
    }
  });

  // Il duo su telefono: ogni card è alta una schermata e ognuna è una
  // fermata, posata al centro del viewport: la si legge intera prima di
  // passare all'altra. Finché la card occupa la scena la pillola resta
  // ritirata (copriva il chip in cima alla card).
  if (!staticScenes && window.matchMedia("(max-width: 559px)").matches) {
    aboutPage.querySelectorAll<HTMLElement>("[data-ap-card-slot]").forEach((slot) => {
      extraDetents.push(
        () =>
          slot.getBoundingClientRect().top +
          lenis.scroll -
          Math.max(0, Math.round((window.innerHeight - slot.offsetHeight) / 2))
      );
      ScrollTrigger.create({
        trigger: slot,
        start: "top 40%",
        end: "bottom 60%",
        onToggle: (self) =>
          window.dispatchEvent(new CustomEvent("pillnav:hush", { detail: { on: self.isActive } })),
      });
    });
    readDetents();
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
  // Mobile: cambiando passo la card cambia altezza; se la sua testata è
  // finita sopra lo schermo la si riporta in vista.
  reveal: (el) => {
    setTimeout(() => {
      const top = el.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.62) {
        lenis.scrollTo(el, { offset: -90, duration: 0.9 });
      }
    }, 60);
  },
  onResize: () => ghostTrigger?.refresh(),
});

// ---------- Ancora all'arrivo da un'altra pagina ----------
// Un link tipo /#come-lavoriamo: il browser salta all'ancora prima
// che i pin aggiungano i loro spacer, quindi atterra nel punto sbagliato. Si
// riparte da capo e, a layout completo (font, immagini, refresh dei trigger),
// si va all'ancora di colpo.
if (location.hash.length > 1) {
  const id = decodeURIComponent(location.hash.slice(1));
  if (document.getElementById(id)) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const goToHash = () => {
      ScrollTrigger.refresh();
      const el = document.getElementById(id);
      if (el) lenis.scrollTo(el, { immediate: true, force: true });
    };
    if (document.readyState === "complete") requestAnimationFrame(goToHash);
    else window.addEventListener("load", () => requestAnimationFrame(goToHash), { once: true });
  }
}
