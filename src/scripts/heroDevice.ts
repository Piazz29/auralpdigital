// Browser della hero: i nostri siti veri si danno il cambio (screenshot,
// indirizzo e didascalia insieme) ogni HOLD ms. Gira solo con la hero in
// vista e la scheda attiva; con reduced motion resta il primo sito.
// La barra sotto la didascalia mostra quanto manca al prossimo.

const HOLD = 4800;

const stage = document.querySelector<HTMLElement>("[data-hero-stage]");

function start(stage: HTMLElement) {
  // Elementi a turno: per ogni sito uno screenshot, un indirizzo, un nome.
  const slides = Array.from(stage.querySelectorAll<HTMLElement>("[data-hd-slide]"));
  const count = stage.querySelectorAll(".hd-shot").length;
  const bar = stage.querySelector<HTMLElement>("[data-hd-progress]");
  if (count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Raggruppati per sito: lo stesso ordine in ogni gruppo di elementi.
  const groups = ["hd-shot", "hd-url-text", "hd-caption-name"].map((cls) =>
    slides.filter((el) => el.classList.contains(cls)),
  );

  let index = 0;
  let timer = 0;
  let visible = true;

  const show = (i: number) => {
    for (const group of groups) group.forEach((el, k) => el.classList.toggle("is-active", k === i));
    // La barra riparte da zero (animazione CSS rimessa al frame dopo).
    if (bar) {
      bar.classList.remove("is-running");
      requestAnimationFrame(() => bar.classList.add("is-running"));
    }
  };
  const next = () => {
    index = (index + 1) % count;
    show(index);
  };
  const run = () => {
    if (timer || !visible || document.hidden) return;
    show(index);
    timer = window.setInterval(next, HOLD);
  };
  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };

  stage.style.setProperty("--hd-hold", `${HOLD}ms`);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) run();
    else stop();
  }).observe(stage);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
}

if (stage) start(stage);
