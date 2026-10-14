// CONTROLLO CSP — gira dopo `astro build` (vedi package.json).
//
// La Content-Security-Policy in vercel.json ammette gli script inline solo per
// hash (sha256 del contenuto esatto). Se uno script inline cambia — si ritocca
// uno <script is:inline> di BaseLayout, o un aggiornamento di Astro cambia il
// bootstrap delle isole — il suo hash non è più nella policy e in produzione
// il browser lo bloccherebbe: loader che non sparisce, isole non idratate.
// Questo controllo fa fallire la build (e quindi il deploy) PRIMA, e stampa
// gli hash da mettere in vercel.json.
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const DIST = "dist";

const csp = JSON.parse(readFileSync("vercel.json", "utf8"))
  .headers.flatMap((h) => h.headers)
  .find((h) => h.key.toLowerCase() === "content-security-policy")?.value;
if (!csp) {
  console.error("check-csp: nessuna Content-Security-Policy in vercel.json");
  process.exit(1);
}
// Un header HTTP non può contenere a-capo o caratteri di controllo: Vercel
// rifiuterebbe la config o il browser scarterebbe l'header.
if (/[\x00-\x1f\x7f]/.test(csp)) {
  console.error("check-csp: la Content-Security-Policy contiene a-capo o caratteri di controllo");
  process.exit(1);
}
const scriptSrc = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src ")) ?? "";
const allowed = new Set(scriptSrc.match(/'sha256-[^']+'/g) ?? []);

const htmlFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith(".html") ? [join(dir, e.name)] : []
  );

const found = new Map(); // hash → pagine
for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, "utf8");
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']?application\/(ld\+)?json/.test(attrs)) continue;
    const hash = `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
    if (!found.has(hash)) found.set(hash, []);
    found.get(hash).push(file);
  }
  if (/\son[a-z]+\s*=/i.test(html.replace(/<script\b[\s\S]*?<\/script>/g, ""))) {
    console.error(`check-csp: handler inline (onclick=…) in ${file}: la CSP lo blocca`);
    process.exitCode = 1;
  }
}

// BOOKING_ENDPOINT (src/config/contact.ts): se punta a un altro dominio, il
// form ci fa una fetch → quel dominio dev'essere in connect-src, o il browser
// blocca la prenotazione (e si ripiega sempre sulla mail).
const endpoint = readFileSync("src/config/contact.ts", "utf8").match(/BOOKING_ENDPOINT\s*=\s*["'`]([^"'`]*)["'`]/)?.[1];
if (endpoint && /^https?:/.test(endpoint)) {
  const origin = new URL(endpoint).origin;
  const connectSrc = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("connect-src ")) ?? "";
  if (!connectSrc.split(/\s+/).includes(origin)) {
    console.error(`check-csp: BOOKING_ENDPOINT punta a ${origin}, che manca in connect-src di vercel.json`);
    process.exitCode = 1;
  }
}

const missing = [...found].filter(([h]) => !allowed.has(h));
const unused = [...allowed].filter((h) => !found.has(h));
for (const [h, pages] of missing) console.error(`check-csp: script inline non ammesso ${h} (${pages[0]}${pages.length > 1 ? ` +${pages.length - 1}` : ""})`);
for (const h of unused) console.warn(`check-csp: hash in vercel.json non più usato ${h}`);

if (missing.length) {
  console.error(`\nSostituire in vercel.json la direttiva con:\n  script-src 'self' 'wasm-unsafe-eval' ${[...found.keys()].join(" ")}`);
  process.exit(1);
}
if (!process.exitCode) console.log(`check-csp: ok — ${found.size} script inline, tutti ammessi dalla CSP`);
