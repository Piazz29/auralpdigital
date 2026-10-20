// FORM A PASSI della sezione finale (markup in components/ContactForm.astro).
//
//   01 servizio  → "Avanti" (scelta multipla)
//   02 profilo   → scelto, si passa da soli al 03
//   03 canale    → "call": calendario + orari + recapiti → richiesta
//                  "scrivici": WhatsApp / email con il messaggio già composto
//
// Ogni passo è un pannello (.cflow-pane) impilato nella stessa cella: si
// mostra uno alla volta e scorre di lato (CSS); qui si cambiano solo classi
// e `inert`. L'altezza della card non cambia mai. Il sito è statico: la richiesta di call
// parte come email precompilata, oppure in POST se BOOKING_ENDPOINT è
// valorizzato in config/contact.ts.
import { BOOKING_ENDPOINT, mailHref, whatsappHref } from "../config/contact";

type Strings = {
  lang: string;
  pickDay: string;
  book: string;
  errors: { slot: string; name: string; email: string };
  msg: {
    hello: string;
    interest: string;
    profile: string;
    callSubject: string;
    writeSubject: string;
    when: string;
    name: string;
    email: string;
    message: string;
    calTitle: string;
  };
};

type Opts = {
  // Porta in vista la card se il passo nuovo è fuori schermo (mobile, dove
  // i pannelli non hanno altezza fissa).
  reveal?: (el: HTMLElement) => void;
  // L'altezza della pagina è cambiata (per riallineare i trigger sotto).
  onResize?: () => void;
};

// Ordine dei pannelli: serve a decidere da che lato entra quello nuovo.
const ORDER: Record<string, number> = { service: 0, profile: 1, channel: 2, call: 3, write: 3 };
const SEG_PANE = ["service", "profile", "channel"];
const ADVANCE_MS = 420;

// Giorni prenotabili: da domani, lun–ven, per i prossimi 60 giorni.
const DAYS_AHEAD = 60;
const CALL_MINUTES = 30;

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

export function initContactFlow(opts: Opts = {}) {
  const form = document.querySelector<HTMLFormElement>("[data-cflow]");
  if (!form) return;
  const S: Strings = JSON.parse(form.dataset.i18n || "{}");
  const $ = <T extends Element = HTMLElement>(sel: string) => form.querySelector<T>(sel)!;
  const panes = [...form.querySelectorAll<HTMLElement>(".cflow-pane")];
  const narrow = window.matchMedia("(max-width: 960px)");

  // ---------- Pannelli ----------
  // Quelli "prima" del corrente escono a sinistra, quelli dopo aspettano a
  // destra: andando avanti il nuovo entra da destra, tornando da sinistra.
  let pane = "service";
  let reached = 0;
  let advanceTimer = 0;
  const go = (name: string) => {
    window.clearTimeout(advanceTimer);
    if (!name || name === pane) return;
    pane = name;
    form.classList.add("was-moved");
    reached = Math.max(reached, Math.min(ORDER[name], 2));
    form.dataset.pane = name;
    panes.forEach((el) => {
      const k = el.dataset.pane!;
      const cur = k === name;
      el.classList.toggle("is-current", cur);
      el.classList.toggle("is-before", !cur && ORDER[k] < ORDER[name]);
      el.toggleAttribute("inert", !cur);
    });
    segs.forEach((el, i) => {
      el.disabled = i > reached || segTarget(i) === name;
      el.classList.toggle("is-here", i === Math.min(ORDER[name], 2));
    });
    if (narrow.matches) {
      opts.onResize?.();
      opts.reveal?.(form);
    }
  };
  const advance = (name: string) => {
    window.clearTimeout(advanceTimer);
    advanceTimer = window.setTimeout(() => go(name), ADVANCE_MS);
  };
  const paneNext = (from: string) => $<HTMLButtonElement>(`[data-pane="${from}"] [data-next]`);
  form.querySelectorAll<HTMLButtonElement>("[data-next]").forEach((b) =>
    b.addEventListener("click", () => go(b.dataset.next!))
  );
  form.querySelectorAll<HTMLButtonElement>("[data-back]").forEach((b) =>
    b.addEventListener("click", () => go(b.dataset.back!))
  );

  // ---------- Avanzamento (testata della card) ----------
  // 3 segmenti: servizio, profilo, contatto. Il terzo è a metà con il canale
  // scelto e pieno a richiesta partita (call inviata o link diretto aperto).
  const segs = [...form.querySelectorAll<HTMLButtonElement>("[data-seg]")];
  // Il terzo segmento porta al canale scelto (call o scrivici), se c'è.
  const segTarget = (i: number) =>
    i < 2 ? SEG_PANE[i] : form.querySelector<HTMLInputElement>('input[name="channel"]:checked')?.value || "channel";
  segs.forEach((el, i) => el.addEventListener("click", () => go(segTarget(i))));
  const progN = form.querySelector<HTMLElement>("[data-prog-n]");
  let sent = false;
  let shown = 0;
  let progRaf = 0;
  const progress = () => {
    const isDone = (s: string) => $(`[data-step="${s}"]`).classList.contains("is-done");
    const f = [isDone("service") ? 1 : 0, isDone("profile") ? 1 : 0, sent ? 1 : isDone("channel") ? 0.5 : 0];
    segs.forEach((el, i) => {
      el.style.setProperty("--f", String(f[i]));
      el.classList.toggle("is-on", f[i] > 0);
    });
    const to = Math.round(((f[0] + f[1] + f[2]) / 3) * 100);
    form.dataset.prog = String(to);
    if (!progN) return;
    cancelAnimationFrame(progRaf);
    const from = shown;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min((t - t0) / 700, 1);
      shown = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      progN.textContent = String(shown);
      if (k < 1) progRaf = requestAnimationFrame(tick);
    };
    progRaf = requestAnimationFrame(tick);
  };
  const markSent = () => {
    sent = true;
    progress();
  };

  const markDone = (step: string, done: boolean) => {
    $(`[data-step="${step}"]`).classList.toggle("is-done", done);
    progress();
  };

  // Luce che segue il puntatore sulla card (solo mouse).
  if (window.matchMedia("(pointer: fine)").matches) {
    form.addEventListener("pointermove", (e) => {
      const b = form.getBoundingClientRect();
      form.style.setProperty("--mx", `${e.clientX - b.left}px`);
      form.style.setProperty("--my", `${e.clientY - b.top}px`);
    });
  }
  // Entrata: la card si "accende" la prima volta che entra in vista
  // (is-armed nasconde le opzioni solo se questo script gira).
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) form.classList.add("is-armed");
  new IntersectionObserver(
    ([e], io) => {
      if (!e.isIntersecting) return;
      form.classList.add("is-in");
      io.disconnect();
    },
    { threshold: 0.25 }
  ).observe(form);

  // ---------- Riepilogo scelte → messaggio precompilato ----------
  const checkedLabels = (name: string) =>
    [...form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map(
      (i) => i.dataset.label || i.value
    );
  const summary = () => {
    const lines = [S.msg.hello];
    const services = checkedLabels("service");
    const profile = checkedLabels("profile");
    if (services.length) lines.push(`${S.msg.interest}: ${services.join(", ")}`);
    if (profile.length) lines.push(`${S.msg.profile}: ${profile[0]}`);
    return { lines, services };
  };
  const refreshDirectLinks = () => {
    const { lines, services } = summary();
    const text = lines.join("\n");
    $<HTMLAnchorElement>("[data-wa]").href = whatsappHref(text + "\n\n");
    $<HTMLAnchorElement>("[data-mail]").href = mailHref(
      `${S.msg.writeSubject}${services.length ? ` — ${services.join(", ")}` : ""}`,
      text + "\n\n"
    );
  };

  // ---------- 01 servizio ----------
  form.querySelectorAll<HTMLInputElement>('input[name="service"]').forEach((input) => {
    input.addEventListener("change", () => {
      // "Non lo so ancora" e i servizi si escludono a vicenda.
      if (input.checked) {
        form.querySelectorAll<HTMLInputElement>('input[name="service"]').forEach((other) => {
          if (other !== input && (input.value === "unsure" || other.value === "unsure")) {
            other.checked = false;
          }
        });
      }
      const any = checkedLabels("service").length > 0;
      markDone("service", any);
      paneNext("service").disabled = !any;
      refreshDirectLinks();
    });
  });

  // ---------- 02 profilo ----------
  form.querySelectorAll<HTMLInputElement>('input[name="profile"]').forEach((input) => {
    input.addEventListener("change", () => {
      markDone("profile", true);
      paneNext("profile").disabled = false;
      refreshDirectLinks();
      advance("channel");
    });
  });

  // ---------- 03 canale ----------
  form.querySelectorAll<HTMLInputElement>('input[name="channel"]').forEach((input) => {
    input.addEventListener("change", () => {
      markDone("channel", true);
      const nb = paneNext("channel");
      nb.dataset.next = input.value;
      nb.disabled = false;
      advance(input.value);
    });
  });

  // ---------- Calendario ----------
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(S.lang, o);
  const fmtMonth = fmt({ month: "long", year: "numeric" });
  const fmtDayLong = fmt({ weekday: "long", day: "numeric", month: "long" });
  const fmtDayShort = fmt({ weekday: "short", day: "numeric", month: "short" });
  const fmtWeekday = fmt({ weekday: "short" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDay = new Date(today);
  minDay.setDate(minDay.getDate() + 1);
  const maxDay = new Date(today);
  maxDay.setDate(maxDay.getDate() + DAYS_AHEAD);
  const bookable = (d: Date) => d >= minDay && d <= maxDay && !isWeekend(d);

  // Primo giorno prenotabile → mese di partenza della vista.
  const first = new Date(minDay);
  while (!bookable(first)) first.setDate(first.getDate() + 1);
  let view = new Date(first.getFullYear(), first.getMonth(), 1);
  let selected: Date | null = null;

  const grid = $("[data-cal-grid]");
  const monthLabel = $("[data-cal-month]");
  const prevBtn = $<HTMLButtonElement>("[data-cal-prev]");
  const nextBtn = $<HTMLButtonElement>("[data-cal-next]");

  // Intestazione lun→dom (il 1° gennaio 2024 era un lunedì).
  $("[data-cal-week]").innerHTML = Array.from({ length: 7 }, (_, i) =>
    `<span>${fmtWeekday.format(new Date(2024, 0, 1 + i)).replace(".", "")}</span>`
  ).join("");

  const renderCal = () => {
    monthLabel.textContent = fmtMonth.format(view);
    const y = view.getFullYear();
    const m = view.getMonth();
    prevBtn.disabled = new Date(y, m, 0) < minDay;
    nextBtn.disabled = new Date(y, m + 1, 1) > maxDay;

    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    // Settimane già tutte passate: segnate, su telefono spariscono (righe
    // spente che allungavano la card senza servire).
    const gone = (d: number) => new Date(y, m, d + 6 - ((lead + d - 1) % 7)) < minDay;
    let html = `<span${gone(1) ? ' class="is-gone"' : ""}></span>`.repeat(lead);
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const on = selected && keyOf(selected) === keyOf(date);
      html += `<button type="button" class="cflow-day${gone(d) ? " is-gone" : ""}" data-day="${keyOf(date)}"${
        bookable(date) ? "" : " disabled"
      } aria-pressed="${on ? "true" : "false"}" aria-label="${fmtDayLong.format(date)}">${d}</button>`;
    }
    grid.innerHTML = html;
  };

  prevBtn.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    renderCal();
  });
  nextBtn.addEventListener("click", () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    renderCal();
  });

  const slotsGrid = $("[data-slots-grid]");
  const slotsEmpty = $("[data-slots-empty]");
  const slotsDate = $("[data-slots-date]");
  grid.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-day]");
    if (!btn || btn.disabled) return;
    const [y, m, d] = btn.dataset.day!.split("-").map(Number);
    selected = new Date(y, m - 1, d);
    grid.querySelectorAll("[data-day]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === btn))
    );
    slotsDate.textContent = fmtDayLong.format(selected);
    slotsEmpty.hidden = true;
    slotsGrid.hidden = false;
    updateSubmit();
  });
  renderCal();

  // ---------- Etichetta del bottone: riassume giorno e ora ----------
  const submitLabel = $("[data-submit-label]");
  const time = () => form.querySelector<HTMLInputElement>('input[name="time"]:checked')?.value;
  const whenText = () => (selected && time() ? `${fmtDayShort.format(selected)}, ${time()}` : "");
  const updateSubmit = () => {
    const when = whenText();
    submitLabel.textContent = when ? `${S.book} · ${when}` : S.book;
  };
  slotsGrid.addEventListener("change", updateSubmit);

  // ---------- Invio della richiesta di call ----------
  const errorEl = $("[data-error]");
  const nameInput = $<HTMLInputElement>('input[name="name"]');
  const emailInput = $<HTMLInputElement>('input[name="email"]');
  [nameInput, emailInput].forEach((i) =>
    i.addEventListener("input", () => i.removeAttribute("aria-invalid"))
  );

  const fail = (msg: string, field?: HTMLElement) => {
    errorEl.textContent = msg;
    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }
  };

  // Link "aggiungi a Google Calendar" (orari in ora italiana via ctz).
  const gcalHref = (date: Date, hhmm: string, details: string) => {
    const [h, min] = hhmm.split(":").map(Number);
    const start = new Date(date);
    start.setHours(h, min, 0, 0);
    const end = new Date(start.getTime() + CALL_MINUTES * 60_000);
    const stamp = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const q = new URLSearchParams({
      action: "TEMPLATE",
      text: S.msg.calTitle,
      dates: `${stamp(start)}/${stamp(end)}`,
      ctz: "Europe/Rome",
      details,
    });
    return `https://calendar.google.com/calendar/render?${q}`;
  };

  const callForm = $("[data-call-form]");
  const done = $("[data-done]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const t = time();
    if (!selected || !t) return fail(S.errors.slot);
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    if (!name) return fail(S.errors.name, nameInput);
    if (!email || !emailInput.checkValidity()) return fail(S.errors.email, emailInput);

    const message = $<HTMLInputElement>('input[name="message"]').value.trim();
    const when = `${fmtDayLong.format(selected)}, ${t}`;
    const { lines, services } = summary();
    const body = [
      ...lines,
      "",
      `${S.msg.when}: ${when}`,
      `${S.msg.name}: ${name}`,
      `${S.msg.email}: ${email}`,
      ...(message ? ["", `${S.msg.message}:`, message] : []),
    ].join("\n");

    if (BOOKING_ENDPOINT) {
      try {
        const res = await fetch(BOOKING_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            date: keyOf(selected),
            time: t,
            name,
            email,
            message,
            services,
            profile: checkedLabels("profile")[0] ?? "",
            lang: S.lang,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
      } catch {
        // Endpoint giù: si ripiega sull'email, la richiesta non va persa.
        window.location.href = mailHref(`${S.msg.callSubject} — ${when}`, body);
      }
    } else {
      window.location.href = mailHref(`${S.msg.callSubject} — ${when}`, body);
    }

    $<HTMLAnchorElement>("[data-gcal]").href = gcalHref(selected, t, body);
    $("[data-done-when]").textContent = when;
    callForm.hidden = true;
    done.hidden = false;
    markSent();
    opts.onResize?.();
  });

  $("[data-done-edit]").addEventListener("click", () => {
    done.hidden = true;
    callForm.hidden = false;
    opts.onResize?.();
  });

  form.querySelectorAll("[data-wa], [data-mail]").forEach((a) => a.addEventListener("click", markSent));

  refreshDirectLinks();
}
