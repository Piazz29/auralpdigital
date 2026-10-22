// LA PAGINA SI FA IN DIRETTA — hero di Chi siamo (AboutPage.astro).
// Due cursori con i nostri nomi, come in un file condiviso, finiscono la
// pagina davanti a chi guarda. Si parte dai riquadri tratteggiati vuoti,
// con il nome del livello. Alice e Julian scrivono il
// titolo insieme, una riga a testa; Alice incolla il testo, Julian disegna
// il bottone; Alice seleziona "lo studio." (font, misura e distanza dal
// testo sotto) e lo colora, poi trascina la foto di noi due nella cornice.
// Un commento, la risposta, e la pagina va online. I cursori restano lì, a riposo, e il visitatore ha il
// suo: "Tu".
//
// I cursori stanno in un livello sopra tutta la hero e si muovono in px
// rispetto a lei: le mete si misurano al momento, quindi reggono il resize.
// Con reduced motion: pagina già finita, niente cursori.

import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

type Opts = {
  reduce: boolean;
  afterLoader: (cb: () => void) => void;
  scrub: number;
};
type Pt = { x: number; y: number };

const TYPE = 0.058; // s per lettera del titolo

export function initAboutLive(hero: HTMLElement, { reduce, afterLoader, scrub }: Opts) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => hero.querySelector<T>(sel)!;
  const layer = $("[data-ap-live-layer]");
  const stage = $("[data-ap-stage]");
  const frame = $("[data-ap-live-frame]");
  const photo = $("[data-ap-live-photo]");
  const photoSel = $("[data-ap-live-photosel]");
  const textSel = $("[data-ap-live-textsel]");
  const fontTag = $("[data-ap-live-font]");
  const measure = $("[data-ap-live-measure]");
  const bar = $("[data-ap-live-bar]");
  const accent = $("[data-ap-hero-accent]");
  const top = $(".ap-hero-top");
  const sub = $(".ap-hero-sub");
  const cta = $(".ap-hero-cta");
  const btn = $(".ap-hero-btn");
  const meet = $(".ap-hero-meet");
  const curA = $("[data-ap-cur='a']");
  const curJ = $("[data-ap-cur='j']");
  const caretA = $("[data-ap-caret='a']");
  const caretJ = $("[data-ap-caret='j']");
  const you = $("[data-ap-cur-you]");
  const file = $("[data-ap-cur-file]");
  const chat = $("[data-ap-cur-chat]");
  const notes = hero.querySelectorAll<HTMLElement>("[data-ap-live-note]");
  const title = $("[data-ap-hero-title]");

  const done = () => {
    hero.classList.add("is-live-done");
    bar.classList.add("is-published");
    frame.classList.remove("is-empty");
  };

  if (reduce) {
    done();
    return;
  }

  // Stato di partenza: tutto ancora da fare. Lo mette lo script, così senza
  // JS la pagina è già finita.
  hero.classList.add("is-live");
  frame.classList.add("is-empty");
  gsap.set(btn, { clipPath: "inset(-2px 100% -2px 0% round 999px)" });
  gsap.set([meet, photo, photoSel, textSel, measure, file, chat, caretA, caretJ, ...notes], { autoAlpha: 0 });
  gsap.set(bar, { autoAlpha: 0, y: 10 });
  gsap.set([top, sub], { autoAlpha: 0 });

  // Il titolo a lettere: due righe, una a testa.
  const split = SplitText.create(title.querySelectorAll(".ap-hero-line > *"), {
    type: "words,chars",
    charsClass: "ap-ch",
  });
  gsap.set(split.chars, { autoAlpha: 0 });
  const lines = Array.from(title.querySelectorAll<HTMLElement>(".ap-hero-line")).map((l) =>
    Array.from(l.querySelectorAll<HTMLElement>(".ap-ch"))
  );

  // --- misure -------------------------------------------------------------
  const box = (el: Element) => {
    const h = hero.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const ly = Number(gsap.getProperty(layer, "y")) || 0;
    return { x: r.left - h.left, y: r.top - h.top - ly, w: r.width, h: r.height };
  };
  // Il cursore va al punto (fx, fy) del box di un elemento (0..1), tenuto
  // dentro la hero con l'etichetta del nome.
  const at = (el: Element, fx: number, fy: number): Pt => {
    const b = box(el);
    return { x: Math.min(hero.clientWidth - 96, b.x + b.w * fx), y: b.y + b.h * fy };
  };
  const move = (cur: HTMLElement, p: Pt, duration = 0.9, ease = "power3.inOut") =>
    gsap.to(cur, { x: p.x, y: p.y, duration, ease, overwrite: "auto" });
  const click = (cur: HTMLElement) =>
    gsap.fromTo(cur.firstElementChild, { scale: 1 }, { scale: 0.82, duration: 0.09, yoyo: true, repeat: 1, ease: "power1.inOut" });
  const fit = (sel: HTMLElement, el: Element, pad = 6) => {
    const b = box(el);
    gsap.set(sel, { x: b.x - pad, y: b.y - pad, width: b.w + pad * 2, height: b.h + pad * 2 });
  };

  // --- riquadri della tela ------------------------------------------------
  // Ogni blocco di testo è prima un riquadro tratteggiato col suo livello.
  const px = (el: Element) => Math.round(parseFloat(getComputedStyle(el).fontSize));
  const wires = [
    { el: top, label: "span" },
    { el: title, label: `h1 · ${px(title)}` },
    { el: sub, label: `p · ${px(sub)}` },
    { el: cta, label: "button" },
  ].map(({ el, label }) => {
    const w = document.createElement("span");
    w.className = "ap-wire";
    w.innerHTML = `<em>${label}</em>`;
    layer.prepend(w);
    return { el, w };
  });
  const placeWires = () => wires.forEach(({ el, w }) => fit(w, el, 8));
  const wire = (el: Element) => wires.find((x) => x.el === el)!.w;
  gsap.set(wires.map((x) => x.w), { autoAlpha: 0 });

  // --- scrittura del titolo -------------------------------------------------
  // Ogni lettera compare con un piccolo scatto; il caret colorato la segue e
  // il cursore di chi scrive sta poco sotto.
  const typeLine = (tl: gsap.core.Timeline, chars: HTMLElement[], caret: HTMLElement, cur: HTMLElement, t0: number) => {
    if (!chars.length) return t0;
    tl.add(() => {
      const b = box(chars[0]);
      gsap.set(caret, { x: b.x - 4, y: b.y + b.h * 0.12, height: b.h * 0.78, autoAlpha: 1 });
    }, t0 - 0.25);
    chars.forEach((c, i) => {
      const t = t0 + i * TYPE;
      tl.fromTo(c, { autoAlpha: 0, yPercent: 18 }, { autoAlpha: 1, yPercent: 0, duration: 0.16, ease: "back.out(3)" }, t);
      tl.add(() => {
        const b = box(c);
        gsap.set(caret, { x: b.x + b.w, y: b.y + b.h * 0.12, height: b.h * 0.78 });
        gsap.to(cur, { x: b.x + b.w + 10, y: b.y + b.h * 0.92, duration: 0.18, ease: "power2.out", overwrite: "auto" });
      }, t);
    });
    const end = t0 + chars.length * TYPE;
    tl.to(caret, { autoAlpha: 0, duration: 0.2 }, end + 0.5);
    return end;
  };

  // Entrano da fuori: Alice da destra in basso, Julian da sinistra.
  const enter = () => {
    const h = hero.getBoundingClientRect();
    gsap.set(curA, { x: h.width + 40, y: h.height * 0.82 });
    gsap.set(curJ, { x: -40, y: h.height * 0.9 });
  };

  afterLoader(() => {
    enter();
    placeWires();
    window.addEventListener("resize", placeWires);
    const [l1 = [], l2 = []] = lines;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: idle });
    tl.set(title, { opacity: 1 })
      .set(cta, { opacity: 1 })
      // 0 · Riquadri vuoti, file e cornice.
      .fromTo(
        wires.map((x) => x.w),
        // Il margine in alto lascia fuori dalla maschera l'etichetta.
        { autoAlpha: 0, clipPath: "inset(-32px 100% -4px -4px)" },
        { autoAlpha: 1, clipPath: "inset(-32px -4px -4px -4px)", duration: 0.7, ease: "power2.inOut", stagger: 0.12 },
        0.1
      )
      .to(bar, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.4)
      .fromTo(frame, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 1, ease: "expo.out" }, 0.5)
      .fromTo(top, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "expo.out" }, 0.6)
      .to(wire(top), { autoAlpha: 0, duration: 0.4 }, 1.2)

      // 1 · Il titolo, a quattro mani: Alice la prima riga, Julian la seconda.
      .add(() => move(curA, at(l1[0] ?? title, 0, 0.95), 0.8), 0.5)
      .add(() => move(curJ, at(l2[0] ?? title, 0, 0.95), 0.8), 0.6);
    const endA = typeLine(tl, l1, caretA, curA, 1.4);
    const endJ = typeLine(tl, l2, caretJ, curJ, 1.55);
    const T = Math.max(endA, endJ) + 0.25; // ≈ 2.8 s in italiano
    tl.to(wire(title), { autoAlpha: 0, duration: 0.4 }, T)

      // 2 · Alice incolla il testo; Julian disegna il bottone.
      .add(() => move(curA, at(sub, 0.04, 0.3), 0.7), endA + 0.2)
      .add(() => click(curA), T + 0.05)
      .add(() => sub.classList.add("is-pasted"), T + 0.1)
      .set(sub, { autoAlpha: 1 }, T + 0.1)
      .to(wire(sub), { autoAlpha: 0, duration: 0.3 }, T + 0.1)
      .add(() => sub.classList.remove("is-pasted"), T + 1)

      .add(() => move(curJ, at(btn, 0, 0.15), 0.8), endJ + 0.2)
      .add(() => click(curJ), T + 0.4)
      .add(() => move(curJ, at(btn, 1, 0.95), 0.9, "power2.inOut"), T + 0.5)
      .to(btn, { clipPath: "inset(-2px 0% -2px 0% round 999px)", duration: 0.9, ease: "power2.inOut" }, T + 0.5)
      .to(wire(cta), { autoAlpha: 0, duration: 0.4 }, T + 1.1)
      .to(meet, { autoAlpha: 1, duration: 0.6 }, T + 1.3)

      // 3 · Alice seleziona "lo studio.": font, misura, distanza; poi colore.
      .add(() => move(curA, at(accent, 0.62, 0.7), 0.8), T + 0.6)
      .add(() => {
        click(curA);
        fit(textSel, accent);
        const cs = getComputedStyle(accent);
        fontTag.textContent = `${cs.fontFamily.split(",")[0].replace(/["']/g, "")} · ${px(accent)}`;
        const a = box(accent);
        const s = box(sub);
        const gap = Math.max(0, s.y - (a.y + a.h));
        // Sotto "dietro", fuori dalla selezione.
        gsap.set(measure, { x: s.x + Math.min(48, s.w * 0.1), y: a.y + a.h, height: gap });
        measure.querySelector("em")!.textContent = String(Math.round(gap));
      }, T + 1.45)
      .fromTo(textSel, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, T + 1.5)
      .fromTo(measure, { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: 0.35, transformOrigin: "50% 0" }, T + 1.65)
      .add(() => hero.classList.add("is-colored"), T + 1.95)
      .to([textSel, measure], { autoAlpha: 0, duration: 0.3 }, T + 2.6)

      // 4 · Alice prende la foto e la porta nella cornice.
      .add(() => move(curA, at(frame, 0.74, 0.1), 0.8), T + 2.6)
      .to(file, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2.4)" }, T + 3.25)
      .add(() => move(curA, at(frame, 0.5, 0.5), 0.9), T + 3.45)
      .add(() => {
        click(curA);
        frame.classList.remove("is-empty");
        gsap.to(file, { autoAlpha: 0, scale: 0.6, duration: 0.25 });
        gsap.fromTo(photo, { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1, duration: 1, ease: "back.out(1.25)" });
      }, T + 4.4)
      .to(photoSel, { autoAlpha: 1, duration: 0.3 }, T + 5)
      .add(() => move(curA, at(frame, 0.94, 0.94), 0.7), T + 4.9)
      .to(photoSel, { autoAlpha: 0, duration: 0.4 }, T + 6.3)

      // 5 · Commento e risposta; la pagina va online.
      .add(() => move(curJ, at(frame, 0.38, 0.84), 1), T + 5)
      .fromTo(notes[0], { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2.2)" }, T + 5.4)
      .fromTo(notes[1], { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2.2)" }, T + 6.3)
      .add(() => { click(curJ); done(); }, T + 6.4);
  });

  // --- a riposo ----------------------------------------------------------
  // Ognuno vicino al suo pezzo, con un piccolo vagare.
  const rest = {
    a: () => at(frame, 0.86, 0.9),
    j: () => at(btn, 0.72, 1.3),
  };
  let resting = false;
  let busy = false;
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero);
  function idle() {
    resting = true;
    const wander = (cur: HTMLElement, base: () => Pt, delay: number) => {
      const step = () => {
        if (!visible || document.hidden || busy) return void gsap.delayedCall(2, step);
        const p = base();
        gsap.to(cur, {
          x: Math.min(hero.clientWidth - 96, p.x + gsap.utils.random(-46, 46)),
          y: p.y + gsap.utils.random(-12, 28),
          duration: gsap.utils.random(1.8, 2.8),
          ease: "sine.inOut",
          onComplete: () => void gsap.delayedCall(gsap.utils.random(0.6, 1.8), step),
        });
      };
      gsap.delayedCall(delay, step);
    };
    wander(curA, rest.a, 0.6);
    wander(curJ, rest.j, 1.3);
  }

  // --- il visitatore -----------------------------------------------------
  // Un'etichetta "Tu" accanto al suo cursore vero e la foto che si inclina
  // un poco. La prima volta che entra,
  // Julian gli va incontro e saluta.
  let greeted = false;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (fine) {
    const youX = gsap.quickSetter(you, "x", "px");
    const youY = gsap.quickSetter(you, "y", "px");
    const tiltX = gsap.quickTo(stage, "rotationX", { duration: 0.9, ease: "power3.out" });
    const tiltY = gsap.quickTo(stage, "rotationY", { duration: 0.9, ease: "power3.out" });
    gsap.set(stage, { transformPerspective: 1400 });
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const h = hero.getBoundingClientRect();
      const x = e.clientX - h.left;
      const y = e.clientY - h.top;
      youX(x);
      youY(y - Number(gsap.getProperty(layer, "y")));
      const s = stage.getBoundingClientRect();
      tiltY(gsap.utils.clamp(-1, 1, (e.clientX - (s.left + s.width / 2)) / s.width) * 6);
      tiltX(gsap.utils.clamp(-1, 1, (e.clientY - (s.top + s.height / 2)) / s.height) * -4);
      if (!hero.classList.contains("has-you")) hero.classList.add("has-you");
      if (resting && !greeted) {
        greeted = true;
        busy = true;
        gsap.killTweensOf(curJ);
        gsap.to(curJ, { x: x + 70, y: y + 46, duration: 1, ease: "power3.inOut" });
        gsap.timeline({ delay: 0.8, onComplete: () => void (busy = false) })
          .fromTo(chat, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)" })
          .to(chat, { autoAlpha: 0, scale: 0.8, duration: 0.3 }, "+=2.2");
      }
    });
    hero.addEventListener("pointerleave", () => {
      hero.classList.remove("has-you");
      tiltX(0);
      tiltY(0);
    });
  }

  // --- titolo al passaggio del mouse --------------------------------------
  // A pagina finita le lettere vicine al cursore si sollevano appena e
  // prendono colore (--f, 0..1, global.css), con una caduta morbida:
  // un'onda che segue il mouse lungo le righe.
  if (fine) {
    const chars = split.chars as HTMLElement[];
    const lift = chars.map((c) => gsap.quickTo(c, "y", { duration: 0.6, ease: "power3.out" }));
    const tint = chars.map((c) => gsap.quickTo(c, "--f", { duration: 0.6, ease: "power3.out" }));
    let centers: Pt[] = [];
    let size = 0;
    // Centri rispetto al titolo (tolto il sollevamento in corso): reggono
    // lo scroll mentre il mouse è sopra.
    const measureChars = () => {
      const t = title.getBoundingClientRect();
      centers = chars.map((c) => {
        const r = c.getBoundingClientRect();
        const y = Number(gsap.getProperty(c, "y")) || 0;
        return { x: r.left - t.left + r.width / 2, y: r.top - t.top - y + r.height / 2 };
      });
      size = parseFloat(getComputedStyle(title).fontSize);
    };
    title.addEventListener("pointerenter", measureChars);
    title.addEventListener("pointermove", (e) => {
      if (!hero.classList.contains("is-live-done")) return;
      const R = size * 1.6;
      const t = title.getBoundingClientRect();
      const mx = e.clientX - t.left;
      const my = e.clientY - t.top;
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

  // Uscita: tutta la scena sale un filo più veloce della pagina (cursori
  // compresi, così restano sui loro pezzi).
  gsap.to([$(".ap-hero-inner"), layer], {
    y: -90,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub },
  });
}
