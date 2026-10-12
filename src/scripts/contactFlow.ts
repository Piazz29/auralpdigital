// FORM A PASSI della sezione finale (markup in components/ContactForm.astro).
//
//   01 servizio  → alla prima scelta si apre il 02
//   02 profilo   → scelto, si apre il 03
//   03 canale    → "call": calendario + orari + recapiti → richiesta
//                  "scrivici": WhatsApp / email con il messaggio già composto
//
// Le aperture sono CSS (grid-template-rows 0fr → 1fr su .cflow-collapse): qui
// si cambiano solo classi e `inert`. Il sito è statico: la richiesta di call
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
  // Porta in vista un passo appena aperto (scroll morbido di Lenis).
  reveal?: (el: HTMLElement) => void;
  // L'altezza della pagina è cambiata (per riallineare i trigger sotto).
  onResize?: () => void;
};

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
  const collapse = (name: string) => $(`[data-collapse="${name}"]`);

  // ---------- Aperture ----------
  const setOpen = (name: string, open: boolean, reveal = false) => {
    const el = collapse(name);
    if (el.classList.contains("is-open") === open) return;
    el.classList.toggle("is-open", open);
    el.toggleAttribute("inert", !open);
    if (open && reveal) opts.reveal?.(el);
  };
  // A transizione finita la pagina ha la nuova altezza.
  form.addEventListener("transitionend", (e) => {
    if ((e.target as HTMLElement).classList?.contains("cflow-collapse")) opts.onResize?.();
  });

  const markDone = (step: string, done: boolean) =>
    $(`[data-step="${step}"]`).classList.toggle("is-done", done);

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
      if (any) setOpen("profile", true, true);
      refreshDirectLinks();
    });
  });

  // ---------- 02 profilo ----------
  form.querySelectorAll<HTMLInputElement>('input[name="profile"]').forEach((input) => {
    input.addEventListener("change", () => {
      markDone("profile", true);
      setOpen("channel", true, true);
      refreshDirectLinks();
    });
  });

  // ---------- 03 canale ----------
  form.querySelectorAll<HTMLInputElement>('input[name="channel"]').forEach((input) => {
    input.addEventListener("change", () => {
      markDone("channel", true);
      const isCall = input.value === "call";
      setOpen("call", isCall, true);
      setOpen("write", !isCall, true);
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
    let html = "<span></span>".repeat(lead);
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const on = selected && keyOf(selected) === keyOf(date);
      html += `<button type="button" class="cflow-day" data-day="${keyOf(date)}"${
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

  // ---------- Messaggio facoltativo ----------
  const addMsg = $<HTMLButtonElement>("[data-addmsg]");
  addMsg.addEventListener("click", () => {
    const open = addMsg.getAttribute("aria-expanded") !== "true";
    addMsg.setAttribute("aria-expanded", String(open));
    setOpen("message", open);
    if (open) setTimeout(() => $<HTMLTextAreaElement>('textarea[name="message"]').focus(), 300);
  });

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

    const message = $<HTMLTextAreaElement>('textarea[name="message"]').value.trim();
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
    opts.onResize?.();
  });

  $("[data-done-edit]").addEventListener("click", () => {
    done.hidden = true;
    callForm.hidden = false;
    opts.onResize?.();
  });

  refreshDirectLinks();
}
