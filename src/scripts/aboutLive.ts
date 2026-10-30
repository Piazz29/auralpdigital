// HERO DI CHI SIAMO (AboutPage.astro) — un cursore finisce la pagina davanti
// a chi guarda. Si parte dai riquadri tratteggiati dei blocchi, col nome del
// livello; il cursore passa sul titolo e le lettere compaiono morbide dietro
// di lui, fa comparire il testo, disegna il bottone e con un click rivela la
// foto di noi due. Poi esce di scena.
//
// Il cursore sta in un livello sopra tutta la hero e si muove in px rispetto
// a lei: le mete si misurano al momento, quindi reggono il resize.
// Con reduced motion: pagina già finita, niente cursore.

import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

type Opts = {
  reduce: boolean;
  afterLoader: (cb: () => void) => void;
  scrub: number;
};
type Pt = { x: number; y: number };

const STEP = 0.028; // s tra una lettera e la successiva
// Velocità di tutta la scena del cursore (1 = ritmo originale). Vale per la
// timeline e per i movimenti/click del cursore, che sono tween a parte.
const SPEED = 1.2;

export function initAboutLive(hero: HTMLElement, { reduce, afterLoader, scrub }: Opts) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => hero.querySelector<T>(sel)!;
  const layer = $("[data-ap-live-layer]");
  const stage = $("[data-ap-stage]");
  const frame = $("[data-ap-live-frame]");
  const shadow = $("[data-ap-live-shadow]");
  const photo = $("[data-ap-live-photo]");
  const img = photo.querySelector("img");
  const top = $(".ap-hero-top");
  const sub = $(".ap-hero-sub");
  const cta = $(".ap-hero-cta");
  const btn = $(".ap-hero-btn");
  const meet = $(".ap-hero-meet");
  const cur = $("[data-ap-cur]");
  const title = $("[data-ap-hero-title]");
  const whos = hero.querySelectorAll<HTMLElement>("[data-ap-who]");

  const done = () => hero.classList.add("is-live-done");

  if (reduce) {
    done();
    return;
  }

  // Stato di partenza: lo mette lo script, così senza JS la pagina è finita.
  hero.classList.add("is-live");
  gsap.set(btn, { clipPath: "inset(-2px 100% -2px 0% round 999px)" });
  gsap.set([top, sub, meet, cur], { autoAlpha: 0 });
  gsap.set(photo, { clipPath: "circle(0% at 50% 50%)" });

  const split = SplitText.create(title.querySelectorAll(".ap-hero-line > *"), {
    type: "words,chars",
    charsClass: "ap-ch",
  });
  const chars = split.chars as HTMLElement[];
  gsap.set(chars, { autoAlpha: 0 });

  // --- misure -------------------------------------------------------------
  const box = (el: Element) => {
    const h = hero.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const ly = Number(gsap.getProperty(layer, "y")) || 0;
    return { x: r.left - h.left, y: r.top - h.top - ly, w: r.width, h: r.height };
  };
  // Punto (fx, fy) del box di un elemento (0..1), tenuto dentro la hero.
  const at = (el: Element, fx: number, fy: number): Pt => {
    const b = box(el);
    return { x: Math.min(hero.clientWidth - 30, b.x + b.w * fx), y: b.y + b.h * fy };
  };
  // Sotto una lettera: x dalla lettera, y dalla sua parola (che non si
  // muove: la lettera intanto sta ancora salendo).
  const under = (c: HTMLElement, side: 0 | 1): Pt => {
    const b = box(c);
    const w = box(c.parentElement ?? c);
    return { x: Math.min(hero.clientWidth - 30, b.x + b.w * side), y: w.y + w.h * 0.92 };
  };
  const move = (p: Pt, duration = 0.8, ease = "power3.inOut") =>
    gsap.to(cur, { x: p.x, y: p.y, duration: duration / SPEED, ease, overwrite: "auto" });
  // Click: il cursore si schiaccia e dalla punta partono due onde arancioni
  // (più grandi e lente sulla foto).
  const ripple = document.createElement("span");
  ripple.className = "ap-click";
  ripple.innerHTML = "<i></i><i></i><b></b>";
  layer.prepend(ripple);
  const rings = ripple.querySelectorAll("i");
  const dot = ripple.querySelector("b");
  gsap.set(ripple, { autoAlpha: 0 });
  // p: il punto dove clicca (la meta del cursore, non la sua posizione del
  // momento: se un fotogramma salta, le onde restano comunque al posto giusto).
  const click = (p: Pt, big = false) => {
    gsap.fromTo(cur.firstElementChild, { scale: 1 }, { scale: big ? 0.7 : 0.8, duration: 0.1 / SPEED, yoyo: true, repeat: 1, ease: "power1.inOut" });
    const size = big ? 200 : 70;
    gsap.set(ripple, {
      // centrato sulla punta del cursore
      x: p.x + 2 - size / 2,
      y: p.y + 2 - size / 2,
      width: size,
      height: size,
      autoAlpha: 1,
    });
    // Si allargano veloci e svaniscono solo alla fine: restano ben visibili.
    const d = (big ? 1.2 : 0.7) / SPEED;
    const stagger = (big ? 0.18 : 0.1) / SPEED;
    gsap.fromTo(rings, { scale: 0 }, { scale: 1, duration: d, ease: "power3.out", stagger });
    gsap.fromTo(rings, { opacity: 1 }, { opacity: 0, duration: d, ease: "power2.in", stagger });
    gsap.fromTo(dot, { scale: 0.2, opacity: 1 }, { scale: 1, opacity: 0, duration: (big ? 0.6 : 0.4) / SPEED, ease: "power2.out" });
  };

  // --- riquadri dei blocchi -------------------------------------------------
  // Prima di essere scritto, ogni blocco è un riquadro tratteggiato col nome
  // del suo livello (come in un tool di design); sparisce quando è fatto.
  const fontPx = (el: Element) => Math.round(parseFloat(getComputedStyle(el).fontSize));
  const wires = [
    { el: top, label: "span" },
    { el: title, label: `h1 · ${fontPx(title)}` },
    { el: sub, label: `p · ${fontPx(sub)}` },
    { el: cta, label: "button" },
  ].map(({ el, label }) => {
    const w = document.createElement("span");
    w.className = "ap-wire";
    w.innerHTML = `<em>${label}</em>`;
    layer.prepend(w);
    return { el, w };
  });
  const placeWires = () =>
    wires.forEach(({ el, w }) => {
      const b = box(el);
      gsap.set(w, { x: b.x - 8, y: b.y - 8, width: b.w + 16, height: b.h + 16 });
    });
  const wire = (el: Element) => wires.find((x) => x.el === el)!.w;
  gsap.set(wires.map((x) => x.w), { autoAlpha: 0 });

  // Le righe come si vedono davvero (una riga lunga può andare a capo):
  // lettere raggruppate per altezza, il cursore le percorre una alla volta.
  const rows = () => {
    const out: HTMLElement[][] = [];
    let last = NaN;
    chars.forEach((c) => {
      const y = Math.round(c.getBoundingClientRect().top);
      if (!out.length || Math.abs(y - last) > 4) out.push([]);
      out[out.length - 1].push(c);
      last = y;
    });
    return out;
  };

  afterLoader(() => {
    const h = hero.getBoundingClientRect();
    gsap.set(cur, { x: h.width + 30, y: h.height * 0.85, autoAlpha: 1 });
    placeWires();
    window.addEventListener("resize", placeWires);

    const tl = gsap.timeline({ onComplete: done }).timeScale(SPEED);
    tl.set(title, { opacity: 1 })
      .set(cta, { opacity: 1 })
      .fromTo([frame, shadow], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: "power2.out" }, 0.2)
      // I riquadri vuoti si disegnano uno dopo l'altro (il margine in alto
      // lascia fuori dalla maschera l'etichetta).
      .fromTo(
        wires.map((x) => x.w),
        { autoAlpha: 0, clipPath: "inset(-32px 100% -4px -4px)" },
        { autoAlpha: 1, clipPath: "inset(-32px -4px -4px -4px)", duration: 0.7, ease: "power2.inOut", stagger: 0.12 },
        0.05
      )
      .fromTo(top, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" }, 0.6)
      .to(wire(top), { autoAlpha: 0, duration: 0.4 }, 1.1);

    // 1 · Il titolo: il cursore scorre lungo ogni riga, le lettere salgono
    // appena e si accendono dietro di lui.
    let t = 0.5;
    rows().forEach((row, i) => {
      const first = row[0];
      const last = row[row.length - 1];
      const reach = i === 0 ? 0.8 : 0.35;
      tl.add(() => move(under(first, 0), reach, i === 0 ? "power3.inOut" : "power2.inOut"), t);
      t += reach;
      const span = row.length * STEP;
      tl.add(() => move(under(last, 1), span, "none"), t);
      tl.fromTo(
        row,
        { autoAlpha: 0, yPercent: 22 },
        { autoAlpha: 1, yPercent: 0, duration: 0.6, ease: "power3.out", stagger: STEP },
        t
      );
      t += span;
    });

    tl.to(wire(title), { autoAlpha: 0, duration: 0.4 }, t + 0.1);

    // 2 · Il testo: un click e compare.
    tl.add(() => move(at(sub, 0.02, 0.35), 0.6), t + 0.1)
      .add(() => click(at(sub, 0.02, 0.35)), t + 0.75)
      .to(wire(sub), { autoAlpha: 0, duration: 0.35 }, t + 0.8)
      .fromTo(sub, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" }, t + 0.8);
    t += 0.9;

    // 3 · Il bottone: lo disegna trascinando da sinistra a destra.
    tl.add(() => move(at(btn, 0.02, 0.5), 0.6), t + 0.1)
      .add(() => click(at(btn, 0.02, 0.5)), t + 0.75)
      .add(() => move(at(btn, 1, 0.5), 0.8, "power2.inOut"), t + 0.85)
      .to(btn, { clipPath: "inset(-2px 0% -2px 0% round 999px)", duration: 0.8, ease: "power2.inOut" }, t + 0.85)
      .to(wire(cta), { autoAlpha: 0, duration: 0.4 }, t + 1.55)
      .fromTo(meet, { autoAlpha: 0, x: -6 }, { autoAlpha: 1, x: 0, duration: 0.6, ease: "power3.out" }, t + 1.5);
    t += 1.7;

    // 4 · La foto: click al centro del vetro (che cede un attimo sotto il
    // dito) e la foto si apre da lì.
    tl.add(() => move(at(frame, 0.5, 0.5), 0.9), t)
      .add(() => click(at(frame, 0.5, 0.5), true), t + 0.95)
      .to(frame, { scale: 0.97, duration: 0.12, ease: "power2.out" }, t + 0.95)
      .to(frame, { scale: 1, duration: 0.7, ease: "elastic.out(1, 0.45)" }, t + 1.07)
      // l'alone segue la pressione: si stringe, poi torna
      .to(shadow, { scaleX: 0.94, duration: 0.12, ease: "power2.out" }, t + 0.95)
      .to(shadow, { scaleX: 1, duration: 0.7, ease: "elastic.out(1, 0.45)" }, t + 1.07)
      .to(photo, { clipPath: "circle(120% at 50% 50%)", duration: 1.3, ease: "power3.inOut" }, t + 1)
      .fromTo(img, { scale: 1.12 }, { scale: 1, duration: 1.6, ease: "power3.out" }, t + 1)
      .set(photo, { clearProps: "clipPath" })
      // I due riquadri si posano sulla foto appena aperta: prima Julian,
      // poi Alice.
      .fromTo(
        whos,
        { autoAlpha: 0, y: 18, scale: 0.94, filter: "blur(8px)" },
        { autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 1.1, ease: "expo.out", stagger: 0.25, clearProps: "filter" },
        t + 2.1
      )
      .add(() => window.removeEventListener("resize", placeWires), t + 2.3)
      // ed esce di scena, senza fretta.
      .add(() => move(at(frame, 0.62, 0.78), 0.9, "power2.inOut"), t + 1.4)
      .to(cur, { autoAlpha: 0, duration: 0.6 }, t + 1.8);
  });

  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine) {
    // La foto segue appena il mouse, inclinandosi.
    const tiltX = gsap.quickTo(stage, "rotationX", { duration: 0.9, ease: "power3.out" });
    const tiltY = gsap.quickTo(stage, "rotationY", { duration: 0.9, ease: "power3.out" });
    gsap.set(stage, { transformPerspective: 1400 });
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const s = stage.getBoundingClientRect();
      tiltY(gsap.utils.clamp(-1, 1, (e.clientX - (s.left + s.width / 2)) / s.width) * 6);
      tiltX(gsap.utils.clamp(-1, 1, (e.clientY - (s.top + s.height / 2)) / s.height) * -4);
    });
    hero.addEventListener("pointerleave", () => {
      tiltX(0);
      tiltY(0);
    });

    // A pagina finita le lettere vicine al mouse si sollevano appena e
    // prendono colore (--f, 0..1, global.css): un'onda lungo le righe.
    const lift = chars.map((c) => gsap.quickTo(c, "y", { duration: 0.6, ease: "power3.out" }));
    const tint = chars.map((c) => gsap.quickTo(c, "--f", { duration: 0.6, ease: "power3.out" }));
    let centers: Pt[] = [];
    let size = 0;
    const measureChars = () => {
      const tb = title.getBoundingClientRect();
      centers = chars.map((c) => {
        const r = c.getBoundingClientRect();
        const y = Number(gsap.getProperty(c, "y")) || 0;
        return { x: r.left - tb.left + r.width / 2, y: r.top - tb.top - y + r.height / 2 };
      });
      size = parseFloat(getComputedStyle(title).fontSize);
    };
    title.addEventListener("pointerenter", measureChars);
    title.addEventListener("pointermove", (e) => {
      if (!hero.classList.contains("is-live-done")) return;
      const R = size * 1.6;
      const tb = title.getBoundingClientRect();
      const mx = e.clientX - tb.left;
      const my = e.clientY - tb.top;
      centers.forEach((c, i) => {
        const d = Math.hypot(mx - c.x, (my - c.y) * 1.6);
        const f = Math.max(0, 1 - d / R);
        lift[i](-f * f * size * 0.12);
        tint[i](f);
      });
    });
    title.addEventListener("pointerleave", () => {
      lift.forEach((q) => q(0));
      tint.forEach((q) => q(0));
    });
  }

  // Uscita: tutta la scena sale un filo più veloce della pagina.
  gsap.to([$(".ap-hero-inner"), layer], {
    y: -90,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub },
  });
}
