// Diagnostica temporanea (solo con #diag nell'indirizzo): misure della hero
// ed errori JS a schermo, per capire dal telefono vero cosa si sfalsa.
if (location.hash === "#diag") {
  const errs: string[] = [];
  addEventListener("error", (e) => errs.push(String(e.message || e.error)));
  addEventListener("unhandledrejection", (e) => errs.push("rej " + String(e.reason)));
  const box = document.createElement("pre");
  box.style.cssText =
    "position:fixed;left:6px;right:6px;bottom:6px;z-index:2147483647;margin:0;padding:8px;max-height:55vh;overflow:auto;" +
    "background:rgba(0,0,0,.85);color:#7f7;font:10px/1.35 ui-monospace,monospace;white-space:pre-wrap;pointer-events:auto";
  const R = (sel: string) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) return sel + ": -";
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return `${sel}: x${Math.round(r.left)} y${Math.round(r.top)} w${Math.round(r.width)} h${Math.round(r.height)} disp=${cs.display} pos=${cs.position} maxw=${cs.maxWidth} fs=${cs.fontSize}`;
  };
  const mq = (q: string) => (matchMedia(q).matches ? 1 : 0);
  const draw = (tag: string) => {
    const vv = window.visualViewport;
    box.textContent = [
      `${tag} t=${Math.round(performance.now())}ms`,
      navigator.userAgent,
      `inner ${innerWidth}x${innerHeight} vv ${vv ? `${Math.round(vv.width)}x${Math.round(vv.height)} s${vv.scale.toFixed(2)}` : "-"} dpr ${devicePixelRatio} scrollY ${Math.round(scrollY)}`,
      `mq <900:${mq("(max-width: 899px)")} hoverNone:${mq("(hover: none)")} coarse:${mq("(pointer: coarse)")} reduce:${mq("(prefers-reduced-motion: reduce)")}`,
      `html: ${document.documentElement.className}`,
      `fonts: ${document.fonts?.status} satoshi=${document.fonts?.check?.("16px Satoshi")}`,
      R(".hero-section"),
      R(".hero-copy"),
      R(".hero-logo-slot"),
      R(".hero-logo-bar"),
      R(".handoff-logo"),
      R(".hero-title"),
      R(".hero-foot"),
      `errors: ${errs.join(" | ") || "none"}`,
    ].join("\n");
  };
  const mount = () => {
    document.body.appendChild(box);
    box.onclick = () => draw("tap");
    [500, 2000, 5000, 9000].forEach((t) => setTimeout(() => draw("auto"), t));
    addEventListener("scroll", () => draw("scroll"), { passive: true });
  };
  if (document.body) mount();
  else addEventListener("DOMContentLoaded", mount);
}
