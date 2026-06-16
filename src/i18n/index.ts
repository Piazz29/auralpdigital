// i18n — utilità condivise. L'italiano è la lingua base (sorgente di verità);
// tedesco e inglese seguono la stessa identica forma del dizionario.
import it from "./it";
import de from "./de";
import en from "./en";

export const languages = ["it", "de", "en"] as const;
export type Lang = (typeof languages)[number];
export const defaultLang: Lang = "it";

// Etichette mostrate nello switcher di lingua.
export const langLabels: Record<Lang, string> = {
  it: "IT",
  de: "DE",
  en: "EN",
};
export const langNames: Record<Lang, string> = {
  it: "Italiano",
  de: "Deutsch",
  en: "English",
};

// `satisfies` verifica a compile-time che de/en abbiano ESATTAMENTE la stessa
// forma del dizionario italiano: se una chiave manca o è di troppo, build rompe.
const dictionaries = { it, de, en } satisfies Record<Lang, typeof it>;

export type Dict = typeof it;

export function getDict(lang: Lang): Dict {
  return dictionaries[lang];
}

// Ricava la lingua dall'URL corrente (/de/..., /en/... → de/en; altrimenti it).
export function getLangFromUrl(url: URL): Lang {
  const seg = url.pathname.split("/").filter(Boolean)[0];
  if (seg === "de" || seg === "en") return seg;
  return defaultLang;
}

// Costruisce il path localizzato di una rotta "base" (path italiano: '/',
// '/chi-siamo', '/#projects', ...). Per it restituisce il path invariato; per
// de/en antepone il prefisso lingua gestendo correttamente root e ancore.
export function localePath(lang: Lang, path: string): string {
  if (lang === defaultLang) return path;
  const prefix = `/${lang}`;
  if (path === "/") return `${prefix}/`;
  if (path.startsWith("/#")) return `${prefix}/${path.slice(1)}`; // /#x → /de/#x
  return `${prefix}${path}`;
}

// Le due rotte canoniche del sito, in forma "base" (italiana). Servono allo
// switcher per costruire l'equivalente nelle altre lingue mantenendo la pagina.
export const routes = {
  home: "/",
  about: "/chi-siamo",
} as const;
export type RouteKey = keyof typeof routes;
