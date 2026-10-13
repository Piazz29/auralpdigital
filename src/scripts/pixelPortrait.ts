// PIXEL PORTRAIT — il ritratto "dietro i pixel" di /chi-siamo.
//
// La foto viene ridotta a una griglia di tessere posterizzate su una rampa di
// colori del brand (brace per Julian, ombra blu per Alice). Una "lente" —
// il cursore, oppure un percorso automatico quando il cursore non c'è —
// alza la risoluzione delle tessere vicine: anello esterno 2×2 a colori
// veri, poi 4×4, al centro la foto nitida. Allontanandosi, le tessere
// tornano pixel con un ritardo (scia), così la lente sembra "lucidare"
// l'immagine.
//
// Modalità `reveal` (card del duo): niente lente, la griglia parte tutta
// pixel e si risolve a ondata dall'alto verso il basso, poi il canvas
// sparisce e resta la <img> vera sotto.
//
// Disegno solo su canvas 2D, un rettangolo per tessera: ~450 tessere per
// ritratto, costo trascurabile. Il loop si ferma fuori schermo e quando non
// c'è più nulla che cambia.

export interface PixelPortraitOpts {
  src: string;
  ramp: string[]; // dal più scuro al più chiaro
  block?: number; // lato della tessera in px CSS
  mode?: "lens" | "reveal";
  focusY?: number; // punto di ancoraggio verticale del cover-fit (0 = alto)
  zoom?: number; // ingrandimento oltre il cover-fit (volti piccoli nell'inquadratura)
}

type RGB = [number, number, number];

const hexToRgb = (h: string): RGB => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export class PixelPortrait {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: Required<PixelPortraitOpts>;
  private img: HTMLImageElement | null = null;
  private photo: HTMLCanvasElement | null = null;

  private dpr = 1;
  private w = 0; // px CSS
  private h = 0;
  private cols = 0;
  private rows = 0;
  private b = 0; // lato tessera in px device

  // Colori precalcolati: rampa per tessera, medie 2×2 e 4×4 a colori veri.
  private tone: string[] = [];
  private sub2: string[] = [];
  private sub4: string[] = [];
  private glintTone: string[] = [];

  // Stato per tessera.
  private res = new Float32Array(0); // risoluzione corrente 0..3
  private boot = new Float32Array(0); // comparsa 0..1
  private bootAt = new Float32Array(0);
  private glint = new Float32Array(0); // scintillio 0..1

  // Lente (px CSS, locali al canvas).
  private lens = { x: 0, y: 0, r: 0, s: 0 };
  private target = { x: 0, y: 0, r: 0, s: 0 };
  private auto = true;
  private phase = Math.random() * 10;

  // Ondata di risoluzione (modalità reveal): 0 → tutta pixel, 1 → nitida.
  private wave = 0;

  private bootStart = -1;
  private frozen = false; // reduced motion: foto nitida, nessun loop
  private running = false;
  private visible = true;
  private raf = 0;
  private last = 0;
  private t = 0;
  private ro: ResizeObserver | null = null;
  private io: IntersectionObserver | null = null;
  ready: Promise<void>;

  constructor(canvas: HTMLCanvasElement, opts: PixelPortraitOpts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.opts = { block: 14, mode: "lens", focusY: 0.3, zoom: 1, ...opts };
    this.ready = this.load();
  }

  private async load() {
    const img = new Image();
    img.decoding = "async";
    img.src = this.opts.src;
    try {
      await img.decode();
    } catch {
      await new Promise((r) => (img.onload = r));
    }
    this.img = img;
    this.layout();
    if (this.opts.mode === "reveal") {
      // La griglia copre subito la <img> sottostante: si parte tutta pixel.
      this.boot.fill(1);
      this.bootStart = 0;
      this.draw();
    }
    // start()/setWave() chiamati prima che la foto fosse pronta.
    if (this.bootStart >= 0) this.kick();
    this.ro = new ResizeObserver(() => {
      const r = this.canvas.getBoundingClientRect();
      if (Math.abs(r.width - this.w) > 1 || Math.abs(r.height - this.h) > 1) {
        this.layout();
        if (this.frozen) {
          this.res.fill(3);
          this.boot.fill(1);
          this.draw();
        } else this.kick();
      }
    });
    this.ro.observe(this.canvas);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.kick();
    });
    this.io.observe(this.canvas);
  }

  // Griglia + colori. Richiamato anche al resize.
  private layout() {
    const img = this.img;
    if (!img) return;
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);

    const B = this.opts.block;
    this.cols = Math.ceil(this.w / B);
    this.rows = Math.ceil(this.h / B);
    this.b = B * this.dpr;

    // Foto in cover-fit sulla griglia intera (che deborda di < 1 tessera).
    const gw = Math.round(this.cols * this.b);
    const gh = Math.round(this.rows * this.b);
    const photo = document.createElement("canvas");
    photo.width = gw;
    photo.height = gh;
    const pc = photo.getContext("2d")!;
    const scale = Math.max(gw / img.naturalWidth, gh / img.naturalHeight) * this.opts.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    pc.imageSmoothingQuality = "high";
    pc.drawImage(img, (gw - dw) / 2, (gh - dh) * this.opts.focusY, dw, dh);
    this.photo = photo;

    // Media 4×4 per tessera: una sola riduzione "high quality", poi le medie
    // 2×2 e 1×1 si ricavano a mano (niente aliasing da downscale brusco).
    const c4 = this.cols * 4;
    const r4 = this.rows * 4;
    const small = document.createElement("canvas");
    small.width = c4;
    small.height = r4;
    const sc = small.getContext("2d", { willReadFrequently: true })!;
    sc.imageSmoothingQuality = "high";
    sc.drawImage(photo, 0, 0, c4, r4);
    const px = sc.getImageData(0, 0, c4, r4).data;
    const at = (x: number, y: number): RGB => {
      const i = (y * c4 + x) * 4;
      return [px[i], px[i + 1], px[i + 2]];
    };
    const avg = (x0: number, y0: number, n: number): RGB => {
      let rr = 0, gg = 0, bb = 0;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const c = at(x0 + x, y0 + y);
          rr += c[0]; gg += c[1]; bb += c[2];
        }
      const k = n * n;
      return [rr / k, gg / k, bb / k];
    };
    const css = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

    const n = this.cols * this.rows;
    const lum = new Float32Array(n);
    this.sub2 = new Array(n * 4);
    this.sub4 = new Array(n * 16);
    for (let j = 0; j < this.rows; j++)
      for (let i = 0; i < this.cols; i++) {
        const k = j * this.cols + i;
        const c = avg(i * 4, j * 4, 4);
        lum[k] = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
        for (let q = 0; q < 4; q++)
          this.sub2[k * 4 + q] = css(avg(i * 4 + (q % 2) * 2, j * 4 + (q >> 1) * 2, 2));
        for (let q = 0; q < 16; q++)
          this.sub4[k * 16 + q] = css(at(i * 4 + (q % 4), j * 4 + (q >> 2)));
      }

    // Duotone sulla rampa con stiramento del contrasto (percentili), così ogni
    // foto — chiara o scura — usa tutta la rampa. Interpolazione continua fra
    // i gradini: i volti restano riconoscibili anche a tessere grandi.
    const sorted = Array.from(lum).sort((a, b) => a - b);
    const lo = sorted[Math.floor(n * 0.03)];
    const hi = sorted[Math.floor(n * 0.97)];
    const ramp = this.opts.ramp.map(hexToRgb);
    const last = ramp.length - 1;
    this.tone = Array.from(lum, (l) => {
      const t = Math.min(1, Math.max(0, (l - lo) / Math.max(0.001, hi - lo)));
      const f = t * last;
      const a = Math.min(last - 1, Math.floor(f));
      const u = f - a;
      const ca = ramp[a];
      const cb = ramp[a + 1];
      return css([ca[0] + (cb[0] - ca[0]) * u, ca[1] + (cb[1] - ca[1]) * u, ca[2] + (cb[2] - ca[2]) * u]);
    });
    this.glintTone = Array.from(lum, (l) => {
      const t = Math.min(1, Math.max(0, (l - lo) / Math.max(0.001, hi - lo)));
      return this.opts.ramp[Math.min(last, Math.round(t * last) + 1)];
    });

    // Stato per tessera (conservato se la griglia non cambia).
    if (this.res.length !== n) {
      this.res = new Float32Array(n);
      this.boot = new Float32Array(n).fill(this.bootStart < 0 ? 0 : 1);
      this.glint = new Float32Array(n);
      // Comparsa: diagonale dal basso-sinistra con rumore → si "accende".
      this.bootAt = Float32Array.from({ length: n }, (_, k) => {
        const i = k % this.cols;
        const j = (k / this.cols) | 0;
        const diag = (i / this.cols) * 0.35 + (1 - j / this.rows) * 0.65;
        return diag * 0.85 + Math.random() * 0.45;
      });
    }
    this.target.r = this.lens.r = Math.max(this.w, this.h) * 0.3;
  }

  // ---- API ----

  /** Accende le tessere (hero). */
  start() {
    this.bootStart = performance.now();
    this.kick();
  }

  /** Lente sul punto (px CSS locali). `null` → torna al percorso automatico. */
  point(x: number | null, y = 0) {
    if (x === null) {
      this.auto = true;
    } else {
      this.auto = false;
      this.target.x = x;
      this.target.y = y;
      this.target.s = 1;
    }
    this.kick();
  }

  /** Allontana la lente (cursore sopra l'altro ritratto). */
  dim() {
    this.auto = false;
    this.target.s = 0;
    this.kick();
  }

  /** Modalità reveal: avanzamento dell'ondata 0..1 (pilotata da GSAP). */
  setWave(v: number) {
    this.wave = v;
    this.kick();
  }

  /** Disegno statico nitido (reduced motion). */
  sharp() {
    this.frozen = true;
    this.ready.then(() => {
      this.res.fill(3);
      this.boot.fill(1);
      this.draw();
    });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.io?.disconnect();
  }

  // ---- Loop ----

  private kick() {
    if (this.running || this.frozen || !this.visible || !this.photo) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    const busy = this.step(now, dt);
    this.draw();
    if (busy && this.visible) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.running = false;
    }
  };

  // Aggiorna lo stato; ritorna true se serve un altro frame.
  private step(now: number, dt: number): boolean {
    const lens = this.opts.mode === "lens";
    let busy = false;

    if (lens) {
      if (this.auto && this.bootStart >= 0) {
        // Percorso automatico: un otto lento sopra il volto.
        const t = this.t * 0.55 + this.phase;
        this.target.x = this.w * (0.5 + Math.sin(t) * 0.24);
        this.target.y = this.h * (0.38 + Math.sin(t * 1.37) * 0.16);
        this.target.s = now - this.bootStart > 1400 ? 0.82 : 0;
      }
      const k = 1 - Math.pow(0.0006, dt); // lerp indipendente dal frame rate
      this.lens.x += (this.target.x - this.lens.x) * k;
      this.lens.y += (this.target.y - this.lens.y) * k;
      this.lens.s += (this.target.s - this.lens.s) * k * 0.6;
      busy = true; // la lente automatica è sempre in moto
    }

    const bootT = this.bootStart < 0 ? -1 : (now - this.bootStart) / 1000;
    const B = this.opts.block;
    const { x: lx, y: ly, r: lr, s: ls } = this.lens;
    const up = 1 - Math.pow(0.0001, dt);
    const down = 1 - Math.pow(0.12, dt);

    for (let j = 0, k = 0; j < this.rows; j++)
      for (let i = 0; i < this.cols; i++, k++) {
        // Comparsa
        if (this.boot[k] < 1 && bootT >= 0) {
          this.boot[k] = Math.min(1, Math.max(0, (bootT - this.bootAt[k]) / 0.35));
          busy = true;
        }
        // Risoluzione bersaglio
        let target = 0;
        if (lens) {
          const dx = (i + 0.5) * B - lx;
          const dy = (j + 0.5) * B - ly;
          const f = 1 - Math.sqrt(dx * dx + dy * dy) / lr;
          if (f > 0) target = Math.min(3, f * 4.2 * ls);
        } else {
          // Ondata dall'alto: ogni riga parte un po' dopo la precedente.
          const rowAt = (j / this.rows) * 0.6 + ((i * 7 + j * 3) % 5) * 0.02;
          target = Math.min(3, Math.max(0, (this.wave - rowAt) / 0.4) * 3);
        }
        const cur = this.res[k];
        if (Math.abs(target - cur) > 0.01) {
          this.res[k] = cur + (target - cur) * (target > cur ? up : down);
          busy = true;
        } else this.res[k] = target;

        // Scintillio: qualche tessera ogni tanto si accende di un tono.
        if (lens) {
          if (this.glint[k] > 0) this.glint[k] = Math.max(0, this.glint[k] - dt * 2.2);
          else if (Math.random() < dt * 0.05) this.glint[k] = 1;
        }
      }
    return busy;
  }

  private draw() {
    const { ctx, b, cols, rows, photo } = this;
    if (!photo) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const gap = Math.max(1, b * 0.09);
    // Nelle card il canvas copre la foto: le fughe fra le tessere prendono il
    // tono più chiaro della rampa, non la foto che c'è sotto.
    if (this.opts.mode === "reveal") {
      ctx.fillStyle = this.opts.ramp[this.opts.ramp.length - 1];
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    for (let j = 0, k = 0; j < rows; j++)
      for (let i = 0; i < cols; i++, k++) {
        const bo = this.boot[k];
        if (bo <= 0) continue;
        const x = i * b;
        const y = j * b;
        const lvl = this.res[k];

        if (lvl >= 2.5) {
          ctx.drawImage(photo, x, y, b, b, x, y, b, b);
        } else if (lvl >= 1.5) {
          const s = b / 4;
          const g = gap * 0.35;
          for (let q = 0; q < 16; q++) {
            ctx.fillStyle = this.sub4[k * 16 + q];
            ctx.fillRect(x + (q % 4) * s + g / 2, y + (q >> 2) * s + g / 2, s - g, s - g);
          }
        } else if (lvl >= 0.5) {
          const s = b / 2;
          const g = gap * 0.6;
          for (let q = 0; q < 4; q++) {
            ctx.fillStyle = this.sub2[k * 4 + q];
            ctx.fillRect(x + (q % 2) * s + g / 2, y + (q >> 1) * s + g / 2, s - g, s - g);
          }
        } else {
          ctx.fillStyle = this.glint[k] > 0.5 ? this.glintTone[k] : this.tone[k];
          // In comparsa la tessera cresce dal centro.
          const e = bo < 1 ? 1 - Math.pow(1 - bo, 3) : 1;
          const size = (b - gap) * e;
          const off = (b - size) / 2;
          ctx.fillRect(x + off, y + off, size, size);
        }
      }
  }
}

export const RAMPS = {
  ember: ["#1A120C", "#6E2405", "#D84002", "#F2913F", "#F6D3A6", "#FBF3DA"],
  shadow: ["#111B3B", "#2748A5", "#5175DB", "#84A2F5", "#CEDAF3", "#F3F4EC"],
} satisfies Record<string, string[]>;
