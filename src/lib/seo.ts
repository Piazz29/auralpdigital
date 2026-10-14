// SEO + GEO — URL canonici, alternative di lingua e dati strutturati (JSON-LD).
// Tutto deriva da BUSINESS/AREAS (config/business.ts) e dai dizionari, così
// i fatti restano identici fra testo visibile, meta, schema e llms.txt.
import type { Lang } from "../i18n";
import { defaultLang, getDict, languages, localePath } from "../i18n";
import { AREAS, BUSINESS } from "../config/business";

// Origine del sito (astro.config.mjs → `site`).
export const siteOrigin = (site: URL | undefined) => (site ?? new URL("https://auralpdigital.vercel.app")).origin;

// Path canonico: niente slash finale (vercel.json → trailingSlash: false),
// tranne la root.
export const cleanPath = (path: string) => (path === "/" ? "/" : path.replace(/\/+$/, "")) || "/";

// Dal path corrente ricava la rotta "base" (italiana): /de/faq → /faq.
export function baseRoute(pathname: string): string {
  const p = cleanPath(pathname);
  const m = p.match(/^\/(de|en)(\/.*)?$/);
  return m ? m[2] || "/" : p;
}

// URL assoluto di una rotta base in una lingua.
export const localeUrl = (origin: string, lang: Lang, route: string) =>
  origin + cleanPath(localePath(lang, route));

export const ogLocale: Record<Lang, string> = { it: "it_IT", de: "de_DE", en: "en_US" };

// "*corsivo*", "**grassetto**", "\n" dei dizionari → testo semplice.
export const plain = (s: string) => s.replace(/\*+/g, "").replace(/\s*\n\s*/g, " ").trim();

const SERVICES: Record<Lang, { name: string; description: string }[]> = {
  it: [
    { name: "Siti web", description: "Siti vetrina, landing page, e-commerce leggeri e piattaforme su misura, veloci e ottimizzati per SEO." },
    { name: "Social media e campagne ads", description: "Gestione dei social, contenuti e campagne pubblicitarie su Meta e Google." },
    { name: "Gestionali su misura", description: "Software e gestionali web costruiti sui processi dell'azienda." },
    { name: "Automazioni e AI", description: "Integrazioni con CRM, prenotazioni e pagamenti, automazioni e strumenti di intelligenza artificiale." },
    { name: "Brand e contenuti", description: "Identità visiva, fotografia e testi." },
  ],
  de: [
    { name: "Websites", description: "Unternehmenswebsites, Landing Pages, schlanke Onlineshops und maßgeschneiderte Plattformen, schnell und SEO-optimiert." },
    { name: "Social Media und Werbekampagnen", description: "Betreuung der Social-Media-Kanäle, Inhalte und Werbekampagnen auf Meta und Google." },
    { name: "Software nach Maß", description: "Webanwendungen und Verwaltungssoftware, gebaut auf die Abläufe des Unternehmens." },
    { name: "Automatisierung und KI", description: "Anbindung von CRM, Buchungs- und Zahlungssystemen, Automatisierungen und KI-Werkzeuge." },
    { name: "Marke und Inhalte", description: "Visuelle Identität, Fotografie und Texte." },
  ],
  en: [
    { name: "Websites", description: "Business websites, landing pages, lightweight e-commerce and custom platforms, fast and SEO-optimised." },
    { name: "Social media and ad campaigns", description: "Social media management, content and ad campaigns on Meta and Google." },
    { name: "Custom software", description: "Web applications and management software built around the company's processes." },
    { name: "Automation and AI", description: "CRM, booking and payment integrations, automation and AI tools." },
    { name: "Brand and content", description: "Visual identity, photography and copywriting." },
  ],
};
export const servicesFor = (lang: Lang) => SERVICES[lang];

const PAGE_NAMES: Record<Lang, Record<string, string>> = {
  it: { "/": "Home", "/chi-siamo": "Chi siamo", "/faq": "Domande frequenti" },
  de: { "/": "Startseite", "/chi-siamo": "Über uns", "/faq": "Häufige Fragen" },
  en: { "/": "Home", "/chi-siamo": "About us", "/faq": "FAQ" },
};

interface PageInput {
  origin: string;
  lang: Lang;
  route: string; // rotta base: "/", "/chi-siamo", "/faq"
  title: string;
  description: string;
}

export function jsonLd({ origin, lang, route, title, description }: PageInput) {
  const t = getDict(lang);
  const orgId = `${origin}/#organization`;
  const siteId = `${origin}/#website`;
  const url = localeUrl(origin, lang, route);
  const homeUrl = localeUrl(origin, lang, "/");

  const areaServed = [
    ...AREAS.southTyrol.map((name) => ({ "@type": "Place", name })),
    ...AREAS.northItaly.map((name) => ({ "@type": "City", name })),
    ...AREAS.abroad.map((name) => ({ "@type": "City", name })),
    ...AREAS.regions.map((name) => ({ "@type": "AdministrativeArea", name })),
    ...AREAS.countries.map((name) => ({ "@type": "Country", name })),
  ];

  const organization = {
    "@type": ["Organization", "ProfessionalService"],
    "@id": orgId,
    name: BUSINESS.name,
    url: origin + "/",
    logo: { "@type": "ImageObject", url: `${origin}/logo/wordmark.svg`, width: 556, height: 119 },
    image: `${origin}/og/og-${lang}.png`,
    description: plain(t.meta.home.description),
    email: BUSINESS.email,
    telephone: BUSINESS.phone,
    foundingDate: BUSINESS.foundingDate,
    founder: BUSINESS.founders.map((name) => ({ "@type": "Person", name })),
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.address.locality,
      addressRegion: BUSINESS.address.region,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: BUSINESS.geo.lat, longitude: BUSINESS.geo.lng },
    areaServed,
    knowsLanguage: ["it", "de", "en"],
    priceRange: `€${BUSINESS.priceFrom.toLocaleString("de-DE")}+`,
    sameAs: BUSINESS.sameAs,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: BUSINESS.email,
      telephone: BUSINESS.phone,
      availableLanguage: ["Italian", "German", "English"],
      areaServed: ["IT", "AT", "DE", "CH", "LI", "SM"],
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: { it: "Servizi", de: "Leistungen", en: "Services" }[lang],
      itemListElement: SERVICES[lang].map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name, description: s.description, provider: { "@id": orgId } },
      })),
    },
    makesOffer: {
      "@type": "Offer",
      name: SERVICES[lang][0].name,
      priceSpecification: { "@type": "PriceSpecification", minPrice: BUSINESS.priceFrom, priceCurrency: "EUR" },
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": siteId,
    url: origin + "/",
    name: BUSINESS.name,
    publisher: { "@id": orgId },
    inLanguage: [...languages],
  };

  const pageType = route === "/chi-siamo" ? "AboutPage" : route === "/faq" ? "FAQPage" : "WebPage";
  const page: Record<string, unknown> = {
    "@type": pageType,
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: lang,
    isPartOf: { "@id": siteId },
    about: { "@id": orgId },
    primaryImageOfPage: `${origin}/og/og-${lang}.png`,
  };

  if (route !== "/") {
    page.breadcrumb = {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: PAGE_NAMES[lang]["/"], item: homeUrl },
        { "@type": "ListItem", position: 2, name: PAGE_NAMES[lang][route] ?? title, item: url },
      ],
    };
  }

  // FAQ: le stesse domande e risposte visibili nella pagina.
  if (route === "/faq") {
    page.mainEntity = t.faq.categories.flatMap((c) =>
      c.items.map((it) => ({
        "@type": "Question",
        name: plain(it.q),
        acceptedAnswer: { "@type": "Answer", text: plain(it.a) },
      }))
    );
  }

  return { "@context": "https://schema.org", "@graph": [organization, website, page] };
}

// Elenco delle pagine indicizzabili (sitemap, llms.txt).
export const indexableRoutes = ["/", "/chi-siamo", "/faq"] as const;
export { defaultLang, languages };
