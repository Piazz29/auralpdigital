// IL BLOCCO — il tratto tipografico del sito.
// Un titolo [data-type-block] si compone come un manifesto: le righe (quelle
// in cui il browser lo manda a capo, o quelle già scritte nel markup con
// .tb-line) vengono portate TUTTE alla stessa larghezza, quella del titolo.
// Ogni riga prende la taglia che le serve: le parole corte diventano enormi,
// le frasi lunghe restano più piccole. Il gioco di taglie nasce da una regola
// (la larghezza), non dal caso.
// Con lo scroll le righe arrivano alternate da sinistra e da destra, escono
// dalla sfocatura e si incastrano nel blocco; tornando su si sfilano.
// Opzioni via data-attribute: data-tb-start / data-tb-end (ScrollTrigger),
// data-tb-max (ingrandimento massimo di una riga, default 2), data-tb-static
// (solo composizione, senza entrata).
import type { gsap as GSAP } from "gsap";
import type { ScrollTrigger as ST } from "gsap/ScrollTrigger";
import type { SplitText as SPLIT } from "gsap/SplitText";

type Deps = {
  gsap: typeof GSAP;
  ScrollTrigger: typeof ST;
  SplitText: typeof SPLIT;
  animate: boolean;
  scrub: number;
};

export function initTypeBlocks({ gsap, ScrollTrigger, SplitText, animate, scrub }: Deps) {
  // Comporre un blocco cambia l'altezza del titolo: un solo refresh dei
  // trigger per tutti, a composizione finita.
  let refreshT = 0;
  const refresh = () => {
    clearTimeout(refreshT);
    refreshT = window.setTimeout(() => ScrollTrigger.refresh(), 120);
  };

  const compose = (el: HTMLElement) => {
    const source = el.innerHTML;
    const max = Number(el.dataset.tbMax) || 2;
    let split: SplitText | null = null;
    let tween: gsap.core.Tween | null = null;
    let width = 0;

    const lineWidth = (line: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(line);
      return range.getBoundingClientRect().width;
    };

    const build = () => {
      tween?.scrollTrigger?.kill();
      tween?.kill();
      // Righe già scritte nel markup (.tb-line): si tocca solo la loro
      // taglia, il contenuto resta quello (altri script ci hanno già diviso
      // le parole, es. i Servizi). Altrimenti si ricompone da capo.
      const fixed = el.querySelector(".tb-line") !== null;
      if (!fixed) {
        split?.revert();
        split = null;
        el.innerHTML = source;
        el.classList.remove("is-blocked");
      }

      width = el.clientWidth;
      // ancora senza larghezza (scena nascosta): ci pensa il ResizeObserver
      if (!width) return;
      let lines = Array.from(el.querySelectorAll<HTMLElement>(".tb-line"));
      if (!lines.length) {
        // Si va a capo dove cambia il tono: la parte dritta e il corsivo
        // stanno su righe loro, così la riga che cresce è quella che conta.
        el.querySelectorAll("em").forEach((em) => {
          if (em.previousSibling && em.previousSibling.textContent?.trim())
            em.before(document.createElement("br"));
          if (em.nextSibling && em.nextSibling.textContent?.trim())
            em.after(document.createElement("br"));
        });
        split = SplitText.create(el, { type: "lines", linesClass: "tb-line" });
        lines = split.lines as HTMLElement[];
      }
      const base = parseFloat(getComputedStyle(el).fontSize);
      el.classList.add("is-blocked");
      lines.forEach((line) => {
        line.style.fontSize = `${base}px`;
        // due passate: la crenatura non scala in modo perfettamente lineare
        for (let pass = 0; pass < 2; pass++) {
          const w = lineWidth(line);
          if (!w) break;
          const size = parseFloat(line.style.fontSize);
          const k = Math.min(max * base, (size * width * 0.996) / w) / size;
          line.style.fontSize = `${(size * k).toFixed(2)}px`;
        }
      });

      // data-tb-static: solo composizione, l'entrata la fa già il componente
      if (!animate || "tbStatic" in el.dataset) return;
      tween = gsap.fromTo(
        lines,
        {
          xPercent: (i: number) => (i % 2 ? 16 : -16),
          autoAlpha: 0,
          filter: "blur(14px)",
        },
        {
          xPercent: 0,
          autoAlpha: 1,
          filter: "blur(0px)",
          ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: {
            trigger: el,
            start: el.dataset.tbStart || "top 92%",
            end: el.dataset.tbEnd || "top 50%",
            scrub,
          },
        }
      );
    };

    build();
    refresh();
    let t = 0;
    new ResizeObserver(() => {
      if (Math.abs(el.clientWidth - width) < 2) return;
      clearTimeout(t);
      t = window.setTimeout(() => {
        build();
        refresh();
      }, 120);
    }).observe(el);
  };

  document.fonts.ready.then(() => {
    document.querySelectorAll<HTMLElement>("[data-type-block]").forEach((el) => {
      const island = el.closest("astro-island");
      if (!island) return compose(el);
      // Isole React (FAQ, Percorso): React idrata in modo asincrono anche
      // dopo che Astro toglie [ssr]. Si aspetta che abbia finito e si
      // ritrova il titolo (se React l'ha rigenerato, è un nodo nuovo).
      const selector = `${el.tagName.toLowerCase()}.${el.classList[0]}[data-type-block]`;
      // Safari non ha requestIdleCallback: lì basta un'attesa fissa.
      const idle = (cb: () => void) =>
        "requestIdleCallback" in window
          ? window.requestIdleCallback(cb, { timeout: 2000 })
          : setTimeout(cb, 600);
      const go = () =>
        idle(() =>
          setTimeout(() => {
            const live = island.querySelector<HTMLElement>(selector);
            if (live) compose(live);
          }, 250)
        );
      if (!island.hasAttribute("ssr")) return go();
      const mo = new MutationObserver(() => {
        if (island.hasAttribute("ssr")) return;
        mo.disconnect();
        go();
      });
      mo.observe(island, { attributes: true, attributeFilter: ["ssr"] });
    });
  });
}
