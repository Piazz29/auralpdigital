// IL PERCORSO sul telefono — la linea del tempo di Chi siamo (AboutPage,
// .apt). Il filo si riempie mentre scorri: la punta sta a 60% dello
// schermo e ogni tappa si accende quando la punta la raggiunge (nodo pieno,
// testo che esce dalla sfocatura). Sul desktop la sezione è nascosta e qui
// non si fa niente.

const root = document.querySelector<HTMLElement>("[data-apt]");
const list = root?.querySelector<HTMLElement>("[data-apt-list]");

if (root && list && window.matchMedia("(max-width: 768px)").matches) {
  const steps = [...list.querySelectorAll<HTMLElement>("[data-apt-step]")];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const now = list.querySelector<HTMLElement>(".apt-step--now");
  const last = steps[steps.length - 1];
  // Dove stanno i nodi di Oggi e dell'ultima tappa (centro, dall'alto della
  // lista): il filo è pieno fino al primo, a trattini fino al secondo.
  let n0 = 23, end = 0;
  const measure = () => {
    n0 = steps[0].offsetTop + 23;
    end = last.offsetTop + 23;
    list.style.setProperty("--end", `${end}px`);
    if (now) list.style.setProperty("--now", `${now.offsetTop + 23}px`);
  };
  let raf = 0;
  const update = () => {
    raf = 0;
    const r = list.getBoundingClientRect();
    const tip = window.innerHeight * 0.6;
    const p = reduce ? 1 : Math.min(1, Math.max(0, (tip - r.top - n0) / (end - n0)));
    list.style.setProperty("--p", p.toFixed(4));
    for (const s of steps) {
      // Il nodo sta in cima alla tappa: si accende quando la punta lo passa.
      s.classList.toggle("is-on", reduce || s.getBoundingClientRect().top + 14 <= tip);
    }
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener("scroll", ask, { passive: true });
  window.addEventListener("resize", () => { measure(); ask(); });
  measure();
  root.classList.add("is-live");
  update();
}
