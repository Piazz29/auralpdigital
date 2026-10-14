// FIRST-LOAD LOADER — logica della schermata di caricamento iniziale.
//
// Mostrata UNA sola volta per sessione (sessionStorage['apd:loaded']). Lo script
// inline in <head> (BaseLayout) decide skip/loading prima del render; qui
// gestiamo l'uscita: il loader resta visibile per un MINIMO di 3s (così
// l'animazione si vede sempre) e comunque non oltre un tetto di sicurezza,
// anche se un asset fallisce. Visivamente il "loading" è il cuboide 3D + la
// wordmark; non c'è una barra di progresso da pilotare.
import { gsap } from "gsap";

const root = document.documentElement;

// Visite successive nella stessa sessione: niente loader (CSS lo nasconde già).
if (!root.classList.contains("apd-skip-loader")) {
  initLoader();
}

function initLoader() {
  const loader = document.getElementById("apd-loader");
  if (!loader) {
    root.classList.remove("apd-loading");
    return;
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const START = performance.now();
  const MIN_MS = 3000; // durata minima visibile (richiesta esplicita)
  const MAX_MS = 6000; // tetto di sicurezza: non resta mai bloccato

  let done = false;
  let scheduled = false;
  let timeoutId = 0;
  let exitTween: gsap.core.Tween | null = null;

  // Segnali reali: font pronti, window load, e (se presente) hero video pronto.
  const signals: Promise<unknown>[] = [];

  if (document.fonts && document.fonts.ready) {
    signals.push(document.fonts.ready.catch(() => undefined));
  }

  signals.push(
    new Promise<void>((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", () => resolve(), { once: true });
    }),
  );

  const hero = document.querySelector<HTMLVideoElement>('video[data-anim="hero-video"]');
  if (hero) {
    signals.push(
      new Promise<void>((resolve) => {
        if (hero.readyState >= 3) {
          resolve();
          return;
        }
        const onReady = () => resolve();
        hero.addEventListener("canplay", onReady, { once: true });
        hero.addEventListener("loadeddata", onReady, { once: true });
        // Un errore sul video NON deve bloccare l'apertura del sito.
        hero.addEventListener("error", onReady, { once: true });
      }),
    );
  }

  // Quando gli asset sono pronti (o al tetto) → programma l'uscita rispettando
  // il minimo di 3s.
  Promise.all(signals).then(scheduleExit);
  timeoutId = window.setTimeout(scheduleExit, MAX_MS);

  function scheduleExit() {
    if (scheduled) return;
    scheduled = true;
    window.clearTimeout(timeoutId);
    const elapsed = performance.now() - START;
    const wait = Math.max(0, MIN_MS - elapsed);
    window.setTimeout(exit, wait);
  }

  function exit() {
    if (done) return;
    done = true;

    try {
      sessionStorage.setItem("apd:loaded", "1");
    } catch {
      /* storage non disponibile: il loader riapparirà — non blocca nulla */
    }

    const finalize = () => {
      loader.remove();
      root.classList.remove("apd-loading");
    };

    if (reduce) {
      exitTween = gsap.to(loader, {
        autoAlpha: 0,
        duration: 0.3,
        onComplete: finalize,
      });
    } else {
      exitTween = gsap.to(loader, {
        autoAlpha: 0,
        yPercent: -1.5,
        duration: 0.6,
        ease: "power3.inOut",
        onComplete: finalize,
      });
    }
  }

  // Se l'utente lascia la pagina prima dell'uscita, ferma tutto (no leak).
  window.addEventListener(
    "pagehide",
    () => {
      window.clearTimeout(timeoutId);
      exitTween?.kill();
    },
    { once: true },
  );
}
