// llms.txt (https://llmstxt.org) — scheda dell'attività per i motori AI:
// chi siamo, cosa facciamo, dove, a che prezzo, come contattarci, più le FAQ.
// Generata dagli stessi dati di sito e JSON-LD, così i fatti coincidono.
import type { APIRoute } from "astro";
import { getDict } from "../i18n";
import { AREAS, BUSINESS } from "../config/business";
import { indexableRoutes, languages, localeUrl, plain, servicesFor, siteOrigin } from "../lib/seo";

const PAGE_LABEL: Record<string, string> = { "/": "Home", "/chi-siamo": "About us", "/faq": "FAQ" };
const LANG_LABEL = { it: "Italiano", de: "Deutsch", en: "English" } as const;

export const GET: APIRoute = ({ site }) => {
  const origin = siteOrigin(site);
  const en = getDict("en");
  const price = `€${BUSINESS.priceFrom.toLocaleString("en-US")}`;

  const lines = [
    `# ${BUSINESS.name}`,
    "",
    `> ${BUSINESS.name} is a digital studio (web agency) based in Bolzano, South Tyrol (Alto Adige / Südtirol), Italy, founded in ${BUSINESS.foundingDate}. It builds websites, runs social media and ad campaigns, develops custom management software and sets up automation and AI tools for professionals and businesses. It works in Italian, German and English. Projects start from ${price}; the first call is free.`,
    "",
    "## Key facts",
    "",
    `- Name: ${BUSINESS.name}`,
    `- Location: ${BUSINESS.address.postalCode} Bolzano (Bozen), South Tyrol, Italy`,
    `- Founded: ${BUSINESS.foundingDate}`,
    `- Founders: ${BUSINESS.founders.join(" and ")} (co-founders: strategy & development; design & content)`,
    "- Languages: Italian, German, English",
    `- Pricing: projects start from ${price}; precise quote after a free first call, no hidden costs`,
    "- Timelines: a landing page usually takes 1-2 weeks, a full website 3-6 weeks",
    `- Email: ${BUSINESS.email}`,
    `- Phone / WhatsApp: ${BUSINESS.phone}`,
    ...BUSINESS.sameAs.map((u) => `- Profile: ${u}`),
    "",
    "## Services",
    "",
    ...servicesFor("en").map((s) => `- **${s.name}**: ${s.description}`),
    "",
    "## Areas served",
    "",
    `- South Tyrol: ${AREAS.southTyrol.join(", ")}`,
    `- Northern Italy: ${AREAS.northItaly.join(", ")}, and the rest of Italy`,
    `- Abroad (German- and English-speaking clients): Austria, Germany, Switzerland, Liechtenstein, e.g. ${AREAS.abroad.join(", ")}`,
    "- Work is done remotely or in person when useful.",
    "",
    "## Pages",
    "",
    ...indexableRoutes.flatMap((r) =>
      languages.map((l) => `- [${PAGE_LABEL[r]} (${LANG_LABEL[l]})](${localeUrl(origin, l, r)})`)
    ),
    "",
    "## FAQ",
    "",
    ...en.faq.categories.flatMap((c) => c.items.flatMap((it) => [`### ${plain(it.q)}`, "", plain(it.a), ""])),
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
