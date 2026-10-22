// sitemap.xml — ogni pagina in ogni lingua, con le alternative hreflang
// (così Google lega le tre versioni invece di trattarle come duplicati).
import type { APIRoute } from "astro";
import { indexableRoutes, languages, defaultLang, localeUrl, siteOrigin } from "../lib/seo";

export const GET: APIRoute = ({ site }) => {
  const origin = siteOrigin(site);
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = indexableRoutes.flatMap((route) =>
    languages.map((lang) => {
      const alts = [
        ...languages.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${localeUrl(origin, l, route)}"/>`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${localeUrl(origin, defaultLang, route)}"/>`,
      ].join("\n");
      return `  <url>\n    <loc>${localeUrl(origin, lang, route)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alts}\n  </url>`;
    })
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
