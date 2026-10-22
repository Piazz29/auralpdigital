import "./diag";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { initContactFlow } from "./contactFlow";
import { initTypeBlocks } from "./typeBlock";
import { initAboutLive } from "./aboutLive";

// Draggable non serve (nessun trascinabile nel sito): registrato metteva su
// window un listener touchmove NON passivo (vuoto), che obbliga il telefono
// ad aspettare il main thread prima di scorrere col dito.
gsap.registerPlugin(ScrollTrigger, SplitText);

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

// Telefoni e tablet: lo scroll col dito resta NATIVO. Lo slancio del sistema
// è quello che la mano si aspetta; passarlo da Lenis (syncTouch) e fermarlo
// sulle fermate dava attrito: la pagina si inchiodava sotto il dito, gli swipe
// si accorciavano, i Servizi si prendevano lo scroll. Su touch quindi niente
// fermate né prese in carico: le scene seguono lo scroll e basta (scrub).
const touchUI = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

// ---------- Avvio a pezzi ----------
// Montare tutte le scene in un colpo solo era un unico compito lungo (sul
// telefono quasi un secondo con la CPU rallentata): la pagina era dipinta ma
// non rispondeva. Le scene sotto la prima schermata si montano a pezzi,
// ridando la mano al browser fra un pezzo e l'altro; l'ordine resta quello
// della pagina, quindi i pin si impilano come prima.
const yieldToMain = () =>
  new Promise<void>((resolve) => {
    const s = (window as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (s?.yield) s.yield().then(resolve);
    else setTimeout(resolve, 0);
  });

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
// Smorzamento dello scroll: ogni frame la pagina recupera questa frazione
// della strada che le manca. Più basso = planata più lunga e morbida.
const SMOOTH_LERP = 0.06;
const lenis = new Lenis({
  // Fermate di scroll: vicino a una fermata la rotella fa resistenza e una
  // scrollata non la scavalca; su touch lo swipe lanciato si posa sulla
  // prossima fermata (vedi "Fermate di scroll" sotto). Solo per l'input
  // utente, mai durante uno scroll programmato.
  virtualScroll: (data) => {
    const type = data.event.type;
    // touch nativo (vedi touchUI): Lenis non lo tocca, noi nemmeno
    if (touchUI && type.startsWith("touch")) return true;
    if (!lenis || lenis.isLocked || isTravelling()) return true;
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
  // 0.06 (era 0.075): planata un filo più lunga e morbida, scroll "burroso".
  lerp: SMOOTH_LERP,
  smoothWheel: true,
  // Anche il touch passa da Lenis: con lo scroll nativo lo slancio di uno
  // swipe non si può fermare e le fermate su telefono venivano scavalcate
  // (le tappe del Percorso passavano prima che l'animazione partisse). Il
  // dito resta 1:1 (lerp 1 durante il trascinamento), lo slancio decelera
  // con lo stesso smorzamento della rotella.
  // Solo dove c'è anche un mouse (portatili touch): sui telefoni il dito
  // scorre la pagina in modo nativo (vedi touchUI).
  syncTouch: !touchUI,
  syncTouchLerp: SMOOTH_LERP,
});

// Touch: via i listener touch di Lenis. Lenis li mette su tutta la pagina e
// NON passivi (per poter fermare lo scroll), quindi il browser, prima di
// scorrere, deve aspettare che il main thread li abbia eseguiti: con la hero
// e Il punto che lavorano a ogni frame lo scroll col dito partiva in
// ritardo e si inceppava ("va, poi non va"). Sul telefono non servono — il
// virtualScroll qui sopra lascia passare ogni evento touch — tranne in due
// casi: menu aperto (lenis.stop) e scroll programmato bloccato (lock). Solo
// in quei momenti un listener non passivo ferma il dito; il pannello del
// menu ([data-lenis-prevent]) resta scorribile.
if (touchUI) {
  type TouchHandlers = Record<"onTouchStart" | "onTouchMove" | "onTouchEnd", EventListener> & {
    element?: EventTarget;
  };
  const vs = (lenis as unknown as { virtualScroll?: TouchHandlers }).virtualScroll;
  if (vs?.element) {
    vs.element.removeEventListener("touchstart", vs.onTouchStart);
    vs.element.removeEventListener("touchmove", vs.onTouchMove);
    vs.element.removeEventListener("touchend", vs.onTouchEnd);
  }
  const hold = (e: TouchEvent) => {
    if ((e.target as Element | null)?.closest?.("[data-lenis-prevent]")) return;
    if (e.cancelable) e.preventDefault();
  };
  let holding = false;
  gsap.ticker.add(() => {
    const on = lenis.isStopped || lenis.isLocked;
    if (on === holding) return;
    holding = on;
    if (on) window.addEventListener("touchmove", hold, { passive: false });
    else window.removeEventListener("touchmove", hold);
  });
}

// Su touch lo scroll è nativo e ScrollTrigger ascolta già da solo l'evento
// scroll del browser (e aggiorna una volta per frame). Agganciarlo anche a
// Lenis lo faceva girare una seconda volta, sincrono dentro ogni evento
// scroll: tutte le scene ricalcolate due volte, con layout forzato, proprio
// nel passaggio hero → Il punto. Su touch quindi solo il suo.
if (!touchUI) lenis.on("scroll", ScrollTrigger.update);

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
  lenis.scrollTo(d, { programmatic: false, lerp: SMOOTH_LERP });
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
  // su touch la pagina non si sposta mai da sola: si ferma dove la lascia il dito
  if (touchUI) return;
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
// Sui tablet la pillola copre titoli e form mentre si legge: si ritira
// scorrendo verso il basso e torna appena si risale (o vicino al top). Solo
// una classe sul dock (transform in PillNav.css); mai a menu aperto né con il
// focus da tastiera dentro la navbar. Sul telefono resta solo il burger,
// piccolo e sempre lì: non si ritira.
{
  const narrow = window.matchMedia("(min-width: 900px) and (max-width: 960px)");
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
  document.addEventListener("focusin", (e) => {
    if ((e.target as Element | null)?.closest?.(".pnav-dock")) setTucked(false);
  });
  lenis.on("scroll", ({ scroll }: { scroll: number }) => {
    const dy = scroll - lastY;
    lastY = scroll;
    if (!narrow.matches || menuOpen) return setTucked(false);
    const tuckFrom = 120;
    if (scroll < tuckFrom) {
      run = 0;
      return setTucked(false);
    }
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

// ---------- Hero ----------
// Entrata e parallasse della hero (cerchio d'apertura, logo che passa alla
// navbar, finestra / tavolo / testo a velocità diverse) vivono in logoHandoff.ts.

await yieldToMain();

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
      ".works-title:not(.split-parent):not([data-type-block]), .cta-title:not(.split-parent)"
    )
    .forEach((title) => {
      const words = splitTitleWords(title);
      const isCta = title.classList.contains("cta-title");
      gsap.fromTo(
        words,
        { yPercent: 110, filter: "blur(8px)" },
        {
          yPercent: 0,
          filter: "blur(0px)",
          duration: 1.2,
          ease: "expo.out",
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

await yieldToMain();

// ---------- Cosa Facciamo ----------
// Il cambio di servizio (menu, frecce, swipe) e le clip sono nello script di
// ServicesTabs.astro: la sezione non ha regia di scroll.

// Poster delle clip: in `data-poster`, assegnati solo quando la clip si
// avvicina allo schermo. Un `poster` nell'HTML si scarica subito, con
// priorità alta (Chrome alza le prime immagini grandi): tre jpg sotto la
// piega rubavano banda al CSS bloccante e ritardavano il primo paint.
{
  const lazyPosters = document.querySelectorAll<HTMLVideoElement>("video[data-poster]");
  const setPoster = (v: HTMLVideoElement) => {
    if (v.dataset.poster && !v.poster) v.poster = v.dataset.poster;
  };
  // Si osserva la SEZIONE, non la clip: nei Servizi le card fuori scena
  // stanno traslate di lato e per l'observer non si avvicinerebbero mai.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          target.querySelectorAll<HTMLVideoElement>("video[data-poster]").forEach(setPoster);
          if (target instanceof HTMLVideoElement) setPoster(target);
          io.unobserve(target);
        }),
      { rootMargin: "150% 0px 150% 0px" }
    );
    new Set([...lazyPosters].map((v) => v.closest("section") ?? v)).forEach((el) => io.observe(el));
  } else lazyPosters.forEach(setPoster);
}

await yieldToMain();

// ---------- Il punto — lavoro → caos → svolta ----------------------------
// Markup in HomePage.astro, impaginazione in global.css. Due regie:
// DESKTOP (pinned) — il palco si ferma per poco meno di due schermate e lo
// scroll, in scrub, fa avanzare la storia:
//   0. ARRIVO — mentre il palco sale dalla hero il fondale compare e la
//      testata si alza parola per parola, già al suo posto (prima partiva
//      enorme al centro e poi volava in alto: confondeva);
//   1. CAOS — "Ma i clienti…" e le tre righe, una dopo l'altra: hairline,
//      riga che sale, parola chiave che si colora e, accanto, la SUA
//      notifica;
//   2. SVOLTA — il problema esce verso l'alto, le notifiche confluiscono
//      nella notifica "ok" e sale la promessa.
//   Niente fermate dentro al pin: lo scroll resta continuo e ogni passo
//   vale la stessa porzione di scroll, così il ritmo si capisce subito.
// TOUCH / colonna stretta (flow) — niente pin: la sezione scorre nativa e
// ogni pezzo entra una volta quando arriva sullo schermo (non in scrub:
// sullo scroll nativo inseguire il dito dà scatti).
// Solo transform e opacità; le misure si rileggono a ogni refresh. Con
// reduced motion non parte nulla: colonna statica.
const point = document.querySelector<HTMLElement>("[data-point]");
const pointStage = point?.querySelector<HTMLElement>("[data-point-stage]");
const pointBg = point?.querySelector<HTMLElement>("[data-point-bg]");
const pointLead = point?.querySelector<HTMLElement>("[data-point-lead]");
const pointTurn = point?.querySelector<HTMLElement>("[data-point-turn]");
const pointTurnTitle = point?.querySelector<HTMLElement>("[data-point-turn-title]");
const pointTurnSub = point?.querySelector<HTMLElement>("[data-point-turn-sub]");
if (
  point &&
  pointStage &&
  pointBg &&
  pointLead &&
  pointTurn &&
  pointTurnTitle &&
  pointTurnSub &&
  !staticScenes
) {
  // Stessa condizione del modo desktop in global.css. Se cambia a pagina
  // aperta (finestra stretta/allargata oltre i 900px, emulazione mobile)
  // CSS e regia finirebbero in due modi diversi: si ricarica.
  const pinnedMq = window.matchMedia(
    "(min-width: 900px) and (hover: hover), (min-width: 900px) and (pointer: fine)"
  );
  const pinned = pinnedMq.matches;
  pinnedMq.addEventListener("change", () => location.reload());
  point.classList.add("is-live", pinned ? "is-pinned" : "is-flow");

  const but = point.querySelector<HTMLElement>("[data-point-but]");
  const rows = gsap.utils.toArray<HTMLElement>("[data-point-item]", point).map((item) => ({
    item,
    rule: item.querySelector<HTMLElement>(".point-rule"),
    num: item.querySelector<HTMLElement>(".point-num"),
    text: item.querySelector<HTMLElement>(".point-item-text"),
    mark: item.querySelector<HTMLElement>("strong"),
    ping: item.querySelector<HTMLElement>("[data-point-ping]"),
  }));
  const ok = point.querySelector<HTMLElement>("[data-point-ok]");
  const check = point.querySelector<SVGPathElement>("[data-point-check]");
  const bgImg = pointBg.querySelector<HTMLElement>("img");
  const turnKey = pointTurnTitle.querySelector<HTMLElement>("strong");
  const glow = point.querySelector<HTMLElement>("[data-point-glow]");
  const cue = point.querySelector<HTMLElement>("[data-point-cue]");

  // Parole con maschera: salgono dal basso come da una fessura.
  const leadWords = SplitText.create(pointLead, { type: "words", mask: "words" }).words;
  const turnWords = SplitText.create(pointTurnTitle, { type: "words", mask: "words" }).words;
  const subWords = SplitText.create(pointTurnSub, { type: "words", mask: "words" }).words;
  const keyWords = turnKey ? turnKey.querySelectorAll<HTMLElement>("div div") : [];
  const keyColor = turnKey ? getComputedStyle(turnKey).color : "";

  if (pinned) {
    // ---- 0. Arrivo dalla hero (prima del pin) ----
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
    // "Ma i clienti…" arriva subito dopo la testata, così quando il palco si
    // ferma la frase è già aperta e le righe sotto aspettano di accendersi.
    // Si animano le sue parole: l'uscita della svolta muove il paragrafo,
    // e due tween sulla stessa opacità si pestavano (restava in scena).
    if (but) {
      gsap.fromTo(
        SplitText.create(but, { type: "words", mask: "words" }).words,
        { yPercent: 110 },
        {
          yPercent: 0,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: point, start: "top 40%", end: "top 8%", scrub: SCRUB },
        }
      );
    }

    // Centro di un elemento nel palco, dal layout (offset* ignora i
    // transform): corretto anche a scena già mossa.
    const centerIn = (el: HTMLElement) => {
      let x = el.offsetWidth / 2;
      let y = el.offsetHeight / 2;
      for (let n: HTMLElement | null = el; n && n !== pointStage; n = n.offsetParent as HTMLElement | null) {
        x += n.offsetLeft;
        y += n.offsetTop;
      }
      return { x, y };
    };

    // ---- 1. Il caos, una riga per passo ----
    // Le tre righe si vedono già tutte, in anteprima sbiadita: si capisce
    // subito che c'è altro e che lo scroll le accende una alla volta.
    const STEP = 0.9; // ogni riga = lo stesso tratto di scroll
    const P0 = 0.15;
    const GHOST = 0.16;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    rows.forEach((r, i) => {
      const at = P0 + i * STEP;
      tl.fromTo([r.num, r.text], { opacity: GHOST }, { opacity: 1, duration: 0.45, ease: "power2.out" }, at);
      tl.fromTo(r.text, { x: -10 }, { x: 0, duration: 0.6, ease: "expo.out" }, at);
      if (r.mark) tl.fromTo(r.mark, { "--mark": 0 }, { "--mark": 1, duration: 0.45, ease: "power2.inOut" }, at + 0.35);
      // La notifica entra da destra un filo storta e si posa dritta. Niente
      // scala e force3D off: a riposo resta un 2D nitido.
      if (r.ping) {
        tl.fromTo(
          r.ping,
          { autoAlpha: 0, x: 48, rotation: i % 2 ? 2 : -2 },
          { autoAlpha: 1, x: 0, rotation: 0, duration: 0.6, ease: "expo.out", force3D: false },
          at + 0.2
        );
      }
      // La riga prima fa un passo indietro: l'occhio legge quella nuova.
      if (i > 0) {
        const prev = rows[i - 1];
        tl.to([prev.num, prev.text], { opacity: 0.45, duration: 0.5, ease: "power2.out" }, at + 0.1);
      }
    });

    // ---- 2. La svolta ----
    const turnAt = P0 + rows.length * STEP + 0.35;
    const painParts = [pointLead, but, ...rows.flatMap((r) => [r.rule, r.num, r.text])].filter(
      (el): el is HTMLElement => !!el
    );
    tl.to(painParts, { autoAlpha: 0, y: -50, duration: 0.7, ease: "power2.in", stagger: 0.015 }, turnAt);
    // Le notifiche confluiscono dove comparirà la notifica "ok".
    rows.forEach((r, i) => {
      const ping = r.ping;
      if (!ping) return;
      tl.to(
        ping,
        {
          x: () => (ok ? centerIn(ok).x - centerIn(ping).x : 0),
          y: () => (ok ? centerIn(ok).y - centerIn(ping).y : -60),
          scale: 0.5,
          autoAlpha: 0,
          duration: 0.75,
          ease: "power2.in",
          force3D: false,
        },
        turnAt + i * 0.06
      );
    });
    // Il fondale si schiarisce di un filo: dopo il caos, aria.
    if (bgImg) tl.to(bgImg, { opacity: 0.36, duration: 1.2, ease: "sine.inOut" }, turnAt);
    if (glow) tl.fromTo(glow, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 1.4, ease: "sine.out" }, turnAt + 0.3);

    const riseAt = turnAt + 0.6;
    tl.set(pointTurn, { autoAlpha: 1 }, riseAt - 0.01);
    tl.fromTo(turnWords, { yPercent: 110 }, { yPercent: 0, duration: 0.8, stagger: 0.06, ease: "expo.out" }, riseAt);
    // "il sistema" nasce in inchiostro e si accende di blu.
    if (keyWords.length) {
      tl.fromTo(keyWords, { color: "#171310" }, { color: keyColor, duration: 0.5, stagger: 0.1, ease: "sine.inOut" }, riseAt + 0.5);
    }
    tl.fromTo(subWords, { yPercent: 110 }, { yPercent: 0, duration: 0.7, stagger: 0.04, ease: "expo.out" }, riseAt + 0.6);
    if (ok) {
      tl.fromTo(ok, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out" }, riseAt + 1.0);
      if (check) tl.fromTo(check, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, riseAt + 1.3);
    }
    // Coda breve: la promessa resta un attimo da sola prima di ripartire.
    tl.to({}, { duration: 0.5 });
    gsap.set(pointTurn, { autoAlpha: 0 });

    // Tratti dell'invito: uno per riga, l'ultimo per la svolta.
    const steps = gsap.utils.toArray<HTMLElement>("[data-point-step]", point);
    const stepSpans = [
      ...rows.map((_, i) => [P0 + i * STEP, P0 + (i + 1) * STEP] as const),
      [turnAt, riseAt + 1.2] as const,
    ];

    // ~0.3 schermate per unità: il pin dura poco meno di due schermate.
    const pinRun = () => Math.round(window.innerHeight * 0.3 * tl.duration());

    // Il fondale si distende lungo arrivo + racconto (da 1.1 a 1).
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
            end: () => "+=" + (window.innerHeight + pinRun()),
            scrub: SCRUB,
            invalidateOnRefresh: true,
          },
        }
      );
    }

    const pointPin = ScrollTrigger.create({
      trigger: point,
      start: "top top",
      end: () => "+=" + pinRun(),
      pin: pointStage,
      animation: tl,
      scrub: SCRUB,
      invalidateOnRefresh: true,
      // Primo pin della pagina, prima dei Servizi: ogni spacer a valle legge
      // posizioni già spostate.
      refreshPriority: 4,
      onUpdate: (self) => {
        ok?.classList.toggle("is-done", tl.time() >= riseAt + 1.4);
        // Invito e tratti seguono lo scroll vero (non lo scrub smorzato):
        // rispondono subito alla mano.
        const now = self.progress * tl.duration();
        steps.forEach((el, i) => {
          const [a, b] = stepSpans[i];
          el.style.transform = `scaleX(${gsap.utils.clamp(0, 1, (now - a) / (b - a))})`;
        });
        cue?.classList.toggle("is-off", now > riseAt + 1.2);
      },
    });

    // ---- 3. Uscita, a pin finito: la promessa sale coi Servizi ----
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
  } else {
    // ---- Flow: ogni pezzo entra una volta, quando arriva ----
    const once = (trigger: HTMLElement, start = "top 85%") => ({ trigger, start, once: true });
    gsap.fromTo(
      leadWords,
      { yPercent: 110 },
      { yPercent: 0, duration: 0.9, stagger: 0.08, ease: "expo.out", scrollTrigger: once(pointLead, "top 88%") }
    );
    if (but) {
      gsap.fromTo(
        but,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.7, ease: "expo.out", scrollTrigger: once(but, "top 88%") }
      );
    }
    rows.forEach((r) => {
      const t = gsap.timeline({ defaults: { ease: "expo.out" }, scrollTrigger: once(r.item, "top 82%") });
      if (r.rule) t.fromTo(r.rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, 0);
      t.fromTo([r.num, r.text], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05 }, 0.05);
      if (r.mark) t.fromTo(r.mark, { "--mark": 0 }, { "--mark": 1, duration: 0.6, ease: "power2.inOut" }, 0.35);
      if (r.ping) {
        t.fromTo(r.ping, { autoAlpha: 0, x: 28 }, { autoAlpha: 1, x: 0, duration: 0.8, force3D: false }, 0.3);
      }
    });
    const turnTl = gsap.timeline({ defaults: { ease: "expo.out" }, scrollTrigger: once(pointTurn, "top 80%") });
    turnTl.fromTo(turnWords, { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.06 }, 0);
    if (keyWords.length) {
      turnTl.fromTo(keyWords, { color: "#171310" }, { color: keyColor, duration: 0.5, stagger: 0.1, ease: "sine.inOut" }, 0.5);
    }
    turnTl.fromTo(subWords, { yPercent: 110 }, { yPercent: 0, duration: 0.8, stagger: 0.04 }, 0.5);
    if (ok) {
      turnTl.fromTo(ok, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.85);
      if (check) turnTl.fromTo(check, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, 1.15);
      turnTl.call(() => ok.classList.add("is-done"), [], 1.4);
    }
  }
}

await yieldToMain();

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

await yieldToMain();

// ---------- Progetti — il mazzo che si sparpaglia ----------
// Le carte partono impilate al centro come un mazzo buttato sul tavolo e si
// aprono verso le loro posizioni finali. Quelle posizioni le tiene già il CSS
// (left/top in percentuale dello stage): qui si anima solo un OFFSET in
// transform che le porta dalla pila al posto — nessun ricalcolo di layout per
// frame, tutto sul compositor.
//
// Lo sparpagliamento è LEGATO ALLO SCROLL (scrub), non a tempo: le carte
// seguono la rotella, già ammorbidita da Lenis, in avanti e all'indietro.
// Ease simmetrica (power2.inOut) → scendendo e risalendo il movimento è
// identico: le carte si staccano piano e si posano piano, in entrambi i sensi. Niente
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
    const STEP = 0.06;
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut", duration: 1 },
      scrollTrigger: {
        trigger: deck,
        // Corsa LUNGA: parte appena il mazzo affaccia dal fondo e finisce col
        // mazzo centrato (~una schermata di scroll). Più strada = ogni tacca
        // di rotella sposta le carte di poco = movimento continuo.
        start: "top bottom",
        end: "center center",
        // Stesso respiro di tutte le altre scene (SCRUB): prima qui c'era
        // un'inerzia più lunga sopra a quella di Lenis e le carte
        // sembravano rincorrere lo scroll. Col dito (scroll nativo) inerzia
        // corta: le carte restano sotto il dito.
        scrub: touchUI ? 0.25 : SCRUB,
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
    // In pila le carte sono un filo più piccole e scompigliate; aprendosi
    // crescono, si raddrizzano e si posano nel loro angolo. Solo x, y,
    // rotazione e scala, niente 3D: la carta resta un layer piatto e nitido
    // per tutta la corsa (le inclinazioni in prospettiva la sgranavano e
    // facevano lavorare il compositor).
    deckCards.forEach((card, i) => {
      tl.fromTo(
        card,
        {
          x: () => pile[i].x,
          y: () => pile[i].y,
          rotation: num(card.dataset.dr),
          scale: 0.86,
        },
        {
          x: 0,
          y: 0,
          rotation: () => finalRotation(card),
          scale: 1,
          force3D: true,
        },
        order.indexOf(i) * STEP
      );
    });
    // Il titolo si scopre mentre le carte se ne vanno: le due parole salgono
    // dalla maschera, poi il sottotitolo. Solo transform e opacità (prima
    // c'era una sfocatura animata, la cosa più costosa da ridisegnare).
    const deckTitle = deck.querySelector<HTMLElement>("[data-deck-title]");
    if (deckTitle) {
      const words = SplitText.create(deckTitle, { type: "words", mask: "words" }).words;
      tl.fromTo(words, { yPercent: 105 }, { yPercent: 0, ease: "power3.out", duration: 0.45, stagger: 0.1 }, 0.4);
    }
    const deckSub = deck.querySelector<HTMLElement>(".deck-sub");
    if (deckSub) {
      tl.fromTo(deckSub, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.35 }, 0.7);
    }
  }
}

// (Progetti non ha più fermate: lo scroll attraversa la sezione libero, le
// carte seguono la rotella.)

await yieldToMain();

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

await yieldToMain();

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

// ---------- Finale — l'invito e il brief entrano come le altre scene ----------
// Stessa grammatica di Servizi, Progetti e Il punto: il titolo sale dalla
// sfocatura parola per parola, il resto si mette a fuoco in cascata, la card
// del brief si alza dal tavolo in prospettiva e si posa piatta. A card
// posata passa una volta il riflesso. Tutto legato allo scroll (si riavvolge).
{
  const screen = document.querySelector<HTMLElement>(".finale-screen");
  if (screen && !staticScenes) {
    const title = screen.querySelector<HTMLElement>(".finale-title");
    const card = screen.querySelector<HTMLElement>(".cflow");
    const rest = screen.querySelectorAll<HTMLElement>(".finale-kicker, .finale-sub, .cflow-foot");
    // il titolo è un blocco tipografico (typeBlock.ts): entra da solo
    const words = title && !title.hasAttribute("data-type-block")
      ? SplitText.create(title, { type: "words", mask: "words" }).words
      : [];
    // Su telefono lo schermo è più alto della finestra: l'entrata finisce
    // a metà salita, se no titolo e testo restavano sfocati mentre si leggono.
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: screen, start: "top 85%", end: narrow ? "top 40%" : "top 4%", scrub: SCRUB },
    });
    if (card) {
      tl.fromTo(
        card,
        { y: 110, rotationX: 22, scale: 0.92, transformPerspective: 1400, transformOrigin: "50% 100%" },
        { y: 0, rotationX: 0, scale: 1, duration: 1.4, ease: "power1.out" },
        0
      );
    }
    if (words.length) {
      tl.fromTo(
        words,
        { yPercent: 110, filter: "blur(8px)" },
        { yPercent: 0, filter: "blur(0px)", duration: 0.8, stagger: 0.08, ease: "expo.out" },
        0.1
      );
    }
    tl.fromTo(
      rest,
      { autoAlpha: 0, y: 18, filter: "blur(6px)" },
      { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.7, stagger: 0.14, ease: "expo.out" },
      0.35
    );
    if (card) {
      ScrollTrigger.create({
        trigger: screen,
        start: "top 6%",
        onEnter: () => card.classList.add("is-landed"),
        onLeaveBack: () => card.classList.remove("is-landed"),
      });
    }
  }
}

// Il testo dentro al pannello (kicker, titolo, sottotitolo) NON ha comparse:
// sale insieme al pannello ed è già leggibile. In home nessun titolo entra in
// scena da solo — vedi `isHome` più sopra.

// ---------- CTA /chi-siamo — reveal dell'invito (non più card) ----------
{
  const aboutCta = document.querySelector<HTMLElement>(".about-cta");
  if (aboutCta) {
    // Stessa grammatica del resto: il titolo sale parola per parola dalla
    // sfocatura, il resto si mette a fuoco in fila.
    const ctaTitle = aboutCta.querySelector<HTMLElement>(".about-cta-title");
    if (!reduceMotion) {
      const words = ctaTitle && !ctaTitle.hasAttribute("data-type-block")
        ? SplitText.create(ctaTitle, { type: "words", mask: "words" }).words
        : [];
      gsap
        .timeline({ scrollTrigger: { trigger: aboutCta, start: "top 72%", once: true } })
        .fromTo(
          aboutCta.querySelectorAll(":scope > .works-kicker"),
          { autoAlpha: 0, y: 12, filter: "blur(6px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.1, ease: "expo.out" },
          0
        )
        .fromTo(
          words,
          { yPercent: 110, filter: "blur(10px)" },
          { yPercent: 0, filter: "blur(0px)", duration: 1.4, ease: "expo.out", stagger: 0.07 },
          0.1
        )
        .fromTo(
          aboutCta.querySelectorAll(":scope > .about-cta-sub, :scope > .about-cta-actions, :scope > .about-cta-foot"),
          { autoAlpha: 0, y: 14, filter: "blur(8px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: "expo.out", stagger: 0.14 },
          0.55
        );
    }
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

await yieldToMain();

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

  // --- HERO --- la pagina si fa in diretta (aboutLive.ts).
  const apHero = aboutPage.querySelector<HTMLElement>("[data-ap-hero]");
  if (apHero) initAboutLive(apHero, { reduce: reduceMotion, afterLoader, scrub: SCRUB });

  // --- MANIFESTO ---
  aboutPage.querySelectorAll<HTMLElement>("[data-ap-manifesto] [data-ap-rise]").forEach((el) => {
    if (reduceMotion) return;
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 14, filter: "blur(6px)" },
      {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.1,
        ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
      }
    );
  });
  const statement = aboutPage.querySelector<HTMLElement>("[data-ap-statement]");
  if (statement && !reduceMotion) {
    // Le parole si accendono una a una mentre la frase attraversa lo schermo;
    // per ultimo l'evidenziatore sotto "un'agenzia intera".
    const words = SplitText.create(statement, { type: "words" }).words;
    const em = statement.querySelectorAll("em");
    // Stato spento impostato una volta sola e tween in `to`: con un fromTo,
    // ai refresh di ScrollTrigger le parole non ancora raggiunte tornavano
    // piene, e arrivandoci si spegnevano e riaccendevano (sembrava un lag).
    gsap.set(em, { "--hl": 0 });
    gsap.set(words, { opacity: 0.13, filter: "blur(3px)" });
    gsap
      .timeline({
        scrollTrigger: { trigger: statement, start: "top 85%", end: "bottom 58%", scrub: SCRUB },
      })
      .to(words, { opacity: 1, filter: "blur(0px)", duration: 0.3, stagger: 0.12, ease: "none" })
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
      .fromTo(
        rest,
        { opacity: 0, y: 12, filter: "blur(6px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1, stagger: 0.12, ease: "expo.out" },
        0.45
      );
    // Al passaggio del mouse la cifra rigira e si riferma sul valore vero.
    fact.addEventListener("mouseenter", () => {
      if (!reel || gsap.isTweening(reel)) return;
      gsap.fromTo(reel, { yPercent: 0 }, { yPercent: -90, duration: 1.1, ease: "power4.out" });
    });
  });

  // La catena: quando la card è ben dentro lo schermo, da sola, i passaggi
  // in mezzo vengono barrati e cadono, "tu" e "noi" si vengono incontro, il
  // filo tratteggiato diventa pieno e l'etichetta passa da "Di solito" a
  // "Con noi". Parte una volta sola e non dipende dalla velocità dello
  // scroll. Con reduced motion resta lo stato finale.
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
    // a catena chiusa passa anche il riflesso di luce, una volta sola
    tl.eventCallback("onUpdate", () => {
      const linked = tl.progress() > 0.9;
      chain.classList.toggle("is-linked", linked);
      if (linked) chain.classList.add("is-landed");
    });

    if (reduceMotion) {
      tl.progress(1);
    } else {
      // Prima la card sale dal tavolo in prospettiva e si posa piatta.
      gsap.fromTo(
        chain,
        { y: 80, rotationX: 18, scale: 0.94, transformPerspective: 1400, transformOrigin: "50% 100%" },
        {
          y: 0,
          rotationX: 0,
          scale: 1,
          ease: "power1.out",
          scrollTrigger: { trigger: chain, start: "top 100%", end: "top 64%", scrub: SCRUB },
        }
      );
      // Parte quando la card si è posata (fine della salita, "top 64%"):
      // un attimo per leggere "Di solito", poi la catena si chiude in ~2 s.
      tl.timeScale(0.75);
      ScrollTrigger.create({
        trigger: chain,
        start: "top 66%",
        once: true,
        onEnter: () => gsap.delayedCall(0.45, () => tl.play()),
      });
      // Se lo schermo cambia misura a catena già chiusa, i capi si
      // rimettono al posto giusto (le distanze dipendono dalla larghezza).
      ScrollTrigger.addEventListener("refresh", () => {
        if (tl.progress() < 1) return;
        tl.progress(0).invalidate().progress(1);
      });
    }
  }
}

await yieldToMain();

// ---------- Animazioni CSS infinite — in pausa fuori scena ----------
// Aurora, segni fluttuanti, hint di scroll, carte che respirano: sono loop
// CSS infiniti che il browser continua a far avanzare (style + composite, e
// per l'aurora anche paint) anche quando la loro sezione è lontana. Un solo
// observer aggiunge .is-offscreen ai contenitori fuori vista e il CSS mette
// in pausa tutti i loro loop (animation-play-state). Riprendono dal punto in
// cui erano, quindi rientrando non si vede nessuno stacco.
if ("IntersectionObserver" in window) {
  // Ogni sezione con un loop infinito: Il punto (notifiche, rotellina),
  // Come lavoriamo (onda del suggerimento, cursore), la card del form
  // (bordo che gira, impulso), la catena e il Percorso di Chi siamo, i CTA.
  const loopHosts = document.querySelectorAll<HTMLElement>(
    ".hero-section, .ap-hero, [data-deck], [data-point], [data-apm], .cflow, [data-ap-chain], .ap-journey, .about-cta, .cta-panel"
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

// ---------- Il blocco tipografico ----------
// I titoli [data-type-block] si compongono a righe della stessa larghezza e
// si incastrano con lo scroll (typeBlock.ts): il tratto del sito.
initTypeBlocks({ gsap, ScrollTrigger, SplitText, animate: !reduceMotion, scrub: SCRUB });

// ---------- Telefono, home — il logo d'angolo sul blu del finale ----------
// La nuvola di carta dietro al logo d'angolo serve sul chiaro; sul blu del
// finale (e del footer che lo segue) farebbe una macchia bianca: lì sparisce
// e il logo diventa bianco (CSS, .corner-on-dark). Il blu copre l'angolo a
// metà della lunga sfumatura che porta alla fermata del finale.
const finaleDark = document.querySelector<HTMLElement>(".finale .finale-detent");
if (finaleDark && window.matchMedia("(max-width: 899px)").matches) {
  ScrollTrigger.create({
    trigger: finaleDark,
    start: () => `top-=${Math.round(finaleDark.offsetTop * 0.45)} 26px`,
    end: "+=100000", // fino in fondo, footer compreso
    toggleClass: { targets: document.documentElement, className: "corner-on-dark" },
  });
}

await yieldToMain();

// ---------- Footer — il wordmark gigante emerge lettera per lettera ----------
// Il wordmark parte più in basso e risale a posto mentre il footer entra; le
// lettere salgono in onda da sinistra, dalla sfocatura. L'ultima riga della
// pagina è anche l'ultimo movimento.
let ghostTrigger: ScrollTrigger | undefined;
const ghost = document.querySelector<HTMLElement>(".footer-ghost");
if (!reduceMotion && ghost) {
  const chars = SplitText.create(ghost, { type: "chars" }).chars;
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".site-footer",
      start: "top 95%",
      // Finisce un po' PRIMA della fine pagina (12% di schermo): con lo
      // scroll morbido ci si ferma spesso a pochi px dal fondo, e con
      // "bottom bottom" le lettere restavano sfocate o tagliate dal bordo.
      end: "bottom 112%",
      scrub: 0.6,
    },
  });
  tl.fromTo(ghost, { yPercent: 30 }, { yPercent: 0, ease: "none", duration: 1 }, 0);
  tl.fromTo(
    chars,
    { yPercent: 70, autoAlpha: 0, filter: "blur(10px)" },
    { yPercent: 0, autoAlpha: 1, filter: "blur(0px)", ease: "power3.out", duration: 0.55, stagger: 0.035 },
    0
  );
  ghostTrigger = tl.scrollTrigger;
}

// ---------- Footer — torna su ----------
document.querySelector("[data-back-to-top]")?.addEventListener("click", () => {
  travelFor(2);
  lenis.scrollTo(0, { duration: 2 });
});

// ---------- Torna su flottante ----------
// Piccolo e discreto in basso a destra: compare passata la prima schermata,
// sparisce quando il footer (che ha il suo "torna su") è in vista.
const toTop = document.querySelector<HTMLElement>("[data-to-top]");
if (toTop) {
  let footerIn = false;
  const sync = () =>
    toTop.classList.toggle("is-on", lenis.scroll > window.innerHeight * 0.8 && !footerIn);
  const footer = document.querySelector("footer");
  if (footer) {
    new IntersectionObserver(([e]) => {
      footerIn = e.isIntersecting;
      sync();
    }).observe(footer);
  }
  lenis.on("scroll", sync);
  sync();
  toTop.addEventListener("click", () => {
    travelFor(2);
    lenis.scrollTo(0, { duration: 2 });
  });
}

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

// ---------- Pin sempre al posto giusto ----------
// ScrollTrigger misura dove partono le sezioni bloccate (Il punto, il
// Percorso…) solo al load e al resize della finestra. Se dopo la pagina
// cambia altezza SOPRA una di loro (font arrivati tardi, un'isola React che
// si monta, il CSS ricaricato dal server di sviluppo) le misure restano
// quelle vecchie: il palco si fermava centinaia di px prima o dopo, saltava
// sopra la hero e a fine corsa ricadeva giù ("sezione fuori posto").
// Un osservatore sull'altezza della pagina confronta, a misure ferme, la
// posizione di layout di ogni sezione bloccata con quella dell'ultimo
// refresh: se è cambiata, rimisura tutto. Le altre variazioni (il form a
// passi in fondo che si allunga) non spostano nessun pin e non lo toccano.
if ("ResizeObserver" in window) {
  const pinTops = new Map<Element, number>();
  const pinTriggers = () =>
    ScrollTrigger.getAll().filter((st) => st.pin && st.trigger instanceof HTMLElement);
  const readPinTops = () => {
    pinTops.clear();
    pinTriggers().forEach((st) => pinTops.set(st.trigger!, layoutTop(st.trigger as HTMLElement)));
  };
  ScrollTrigger.addEventListener("refresh", readPinTops);
  readPinTops();
  let checkTimer = 0;
  new ResizeObserver(() => {
    window.clearTimeout(checkTimer);
    checkTimer = window.setTimeout(() => {
      const moved = pinTriggers().some((st) => {
        const before = pinTops.get(st.trigger!);
        return before === undefined || Math.abs(layoutTop(st.trigger as HTMLElement) - before) > 1;
      });
      if (moved) ScrollTrigger.refresh();
    }, 150);
  }).observe(document.body);
}

// Se il "load" (e con lui il refresh automatico di ScrollTrigger) è arrivato
// mentre si montavano i pezzi, le misure dei primi trigger non vedono gli
// spacer dei pin montati dopo: un refresh solo, alla fine.
if (document.readyState === "complete") ScrollTrigger.refresh();

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
