// PAGE WIPE — transizione tra pagine: la fascia Shadow #2748A5 e la navy
// #1C2B5F (col logo in negativo al centro) coprono la pagina vecchia; la pagina
// nuova nasce identica (navy + logo) e, appena pronta, si sposta lei sullo
// schermo. Verso la Home tutto al contrario.
//
// Solo animazioni CSS (global.css, .pt-leave / .pt-arrive / .pt-go / .pt-rev),
// niente View Transition del browser. La regia sta nello script inline in
// <head> di BaseLayout (click sui link interni, sessionStorage['apd:wipe'],
// prefetch).

/** true se `href` porta a un'ALTRA pagina del sito (non un'ancora di questa). */
export function isCrossPage(href: string) {
  const url = new URL(href, window.location.href);
  return url.origin === window.location.origin && url.pathname !== window.location.pathname;
}
