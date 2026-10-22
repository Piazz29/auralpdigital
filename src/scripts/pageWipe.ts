// PAGE WIPE — transizione tra pagine nello stile del vecchio menu
// (StaggeredMenu): la fascia Shadow #2748A5, poi la navy #1C2B5F e subito
// dietro la NUOVA PAGINA entrano da destra in cascata e si posano una sopra
// l'altra sopra la pagina vecchia, che resta ferma sotto. Nessuno stacco blu:
// la pagina nuova arriva insieme alle fasce.
//
// È una View Transition tra documenti (`@view-transition` in global.css):
// il browser tiene a schermo la pagina vecchia finché la nuova è pronta, poi
// anima le istantanee. Le keyframe vivono in global.css; lo script inline in
// <head> (BaseLayout) marca OGNI click su un link interno verso un'altra
// pagina (sessionStorage['apd:wipe']), prefetcha al passaggio del mouse e
// attiva la transizione solo se il flag c'è. Browser senza supporto:
// navigazione normale, istantanea.

/** true se `href` porta a un'ALTRA pagina del sito (non un'ancora di questa). */
export function isCrossPage(href: string) {
  const url = new URL(href, window.location.href);
  return url.origin === window.location.origin && url.pathname !== window.location.pathname;
}
