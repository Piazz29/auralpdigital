import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { getDict, localePath, languages, langLabels, langNames, defaultLang } from '../../i18n';
import { isCrossPage } from '../../scripts/pageWipe';
import { EMAIL, WHATSAPP_NUMBER } from '../../config/contact';
import './PillNav.css';

// Icone inline (tratto Tabler), currentColor per seguire i colori dei bottoni.
const icon = (d) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const IconWhatsapp = () =>
  icon(
    <>
      <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
      <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
    </>
  );
const IconMail = () =>
  icon(
    <>
      <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" />
      <path d="M3 7l9 6l9 -6" />
    </>
  );
const IconArrowUpRight = () =>
  icon(
    <>
      <path d="M17 7l-10 10" />
      <path d="M8 7l9 0l0 9" />
    </>
  );

/**
 * NAVBAR A PILLOLA — barra semi-trasparente centrata (logo · sezioni · burger).
 * Al click sul burger la pillola si espande in DUE TEMPI, con un'unica
 * timeline GSAP: prima si allarga lateralmente (le voci piccole svaniscono),
 * poi scende in basso rivelando le voci grandi una sopra l'altra, lo switcher
 * di lingua e i contatti (WhatsApp, email, prenota una call). In chiusura lo
 * stesso percorso a ritroso: prima risale, poi si stringe.
 *
 * La forma è UNA sola scatola (`.pnav-shell`) con overflow nascosto: si anima
 * solo width/height di un elemento fisso e piccolo, mentre il pannello interno
 * ha già la larghezza finale — niente reflow del contenuto durante la corsa.
 * Il raggio resta costante (metà altezza della barra): da pillola diventa
 * naturalmente un rettangolo arrotondato.
 *
 * Mentre è aperta lo scroll della pagina è fermo: l'evento `pillnav:toggle`
 * su window viene ascoltato da main.ts (lenis.stop/start).
 */
export default function PillNav({ home = false, lang = defaultLang, route = '/' }) {
  const t = getDict(lang);
  const homeHref = localePath(lang, '/');
  const anchor = (id) => (home ? `#${id}` : `${homeHref}#${id}`);

  // Le tre sezioni della pillola chiusa; nel menu aperto si aggiunge la FAQ,
  // che altrimenti non sarebbe raggiungibile da nessun'altra parte.
  const sections = [
    { key: 'projects', label: t.nav.items.projects, aria: t.nav.aria.projects, href: anchor('projects') },
    { key: 'services', label: t.nav.items.services, aria: t.nav.aria.services, href: anchor('cosa-facciamo') },
    { key: 'about', label: t.nav.items.about, aria: t.nav.aria.about, href: localePath(lang, '/chi-siamo') }
  ];
  const bigItems = [
    ...sections,
    { key: 'faq', label: t.nav.items.faq, aria: t.nav.aria.faq, href: localePath(lang, '/faq') }
  ];

  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const shellRef = useRef(null);
  const barRef = useRef(null);
  const linksRef = useRef(null);
  const panelRef = useRef(null);
  const scrimRef = useRef(null);
  const burgerRef = useRef(null);
  const tlRef = useRef(null);
  // Larghezza naturale della pillola chiusa, misurata all'apertura: è il
  // punto d'arrivo della chiusura (poi si torna a width:auto).
  const closedWRef = useRef(0);

  const reduceMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Dimensioni da aperta: larghezza piena entro 16px di margine laterale,
  // altezza = barra + pannello (il pannello scorre da sé se non ci sta).
  const measureOpen = useCallback(() => {
    const shell = shellRef.current;
    const bar = barRef.current;
    const panel = panelRef.current;
    const w = Math.min(780, window.innerWidth - 32);
    shell.style.setProperty('--pnav-open-w', `${w}px`);
    const maxH = window.innerHeight - shell.getBoundingClientRect().top - 16;
    const h = Math.min(bar.offsetHeight + panel.offsetHeight, maxH);
    return { w, h };
  }, []);

  const parts = () => {
    const panel = panelRef.current;
    return {
      smallLinks: linksRef.current ? Array.from(linksRef.current.children) : [],
      bigLines: Array.from(panel.querySelectorAll('.pnav-big-link')),
      foot: Array.from(panel.querySelectorAll('[data-pnav-foot]'))
    };
  };

  // Stato iniziale del contenuto del pannello (nascosto, pronto a entrare).
  useLayoutEffect(() => {
    const { bigLines, foot } = parts();
    gsap.set(bigLines, { yPercent: 110 });
    gsap.set(foot, { autoAlpha: 0, y: 14 });
    gsap.set(scrimRef.current, { autoAlpha: 0 });
  }, []);

  const animateOpen = useCallback(() => {
    const shell = shellRef.current;
    const { smallLinks, bigLines, foot } = parts();
    const k = reduceMotion() ? 0 : 1;

    tlRef.current?.kill();
    // Partenza dalle dimensioni ATTUALI (anche a metà di una chiusura):
    // fissiamo width/height in px, così GSAP interpola da lì.
    const rect = shell.getBoundingClientRect();
    if (!shell.style.width) closedWRef.current = rect.width;
    gsap.set(shell, { width: rect.width, height: rect.height });
    const { w, h } = measureOpen();

    const tl = gsap.timeline();
    tl.to(scrimRef.current, { autoAlpha: 1, duration: 0.6 * k, ease: 'power2.out' }, 0)
      // Le voci piccole se ne vanno subito, mentre la pillola inizia ad allargarsi.
      .to(smallLinks, { autoAlpha: 0, y: -6, duration: 0.22 * k, ease: 'power2.in', stagger: 0.03 * k }, 0)
      // 1 · espansione laterale
      .to(shell, { width: w, duration: 0.55 * k, ease: 'expo.inOut' }, 0.04 * k)
      // 2 · discesa, attaccata alla coda della prima per una curva unica
      .to(shell, { height: h, duration: 0.7 * k, ease: 'expo.inOut' }, 0.42 * k)
      // Le voci grandi salgono dalla loro maschera, in cascata.
      .to(bigLines, { yPercent: 0, duration: 0.9 * k, ease: 'power4.out', stagger: 0.07 * k }, 0.72 * k)
      .to(foot, { autoAlpha: 1, y: 0, duration: 0.6 * k, ease: 'power3.out', stagger: 0.08 * k }, 0.95 * k);
    tlRef.current = tl;
  }, [measureOpen]);

  const animateClose = useCallback(() => {
    const shell = shellRef.current;
    const { smallLinks, bigLines, foot } = parts();
    const k = reduceMotion() ? 0 : 1;
    const barH = barRef.current.offsetHeight;

    tlRef.current?.kill();
    const rect = shell.getBoundingClientRect();
    gsap.set(shell, { width: rect.width, height: rect.height });

    const tl = gsap.timeline({
      onComplete: () => {
        // Di nuovo pillola "naturale": la larghezza torna a seguire il contenuto.
        gsap.set(shell, { clearProps: 'width,height' });
        gsap.set(bigLines, { yPercent: 110 });
        gsap.set(foot, { y: 14 });
      }
    });
    tl.to(foot, { autoAlpha: 0, duration: 0.2 * k, ease: 'power2.in' }, 0)
      .to(bigLines, { yPercent: -110, duration: 0.35 * k, ease: 'power3.in', stagger: { each: 0.035 * k, from: 'end' } }, 0)
      // 1 · risale
      .to(shell, { height: barH, duration: 0.6 * k, ease: 'expo.inOut' }, 0.18 * k)
      // 2 · si stringe
      .to(shell, { width: closedWRef.current || rect.width, duration: 0.55 * k, ease: 'expo.inOut' }, 0.56 * k)
      .to(smallLinks, { autoAlpha: 1, y: 0, duration: 0.4 * k, ease: 'power2.out', stagger: 0.04 * k }, 0.86 * k)
      .to(scrimRef.current, { autoAlpha: 0, duration: 0.5 * k, ease: 'power2.inOut' }, 0.5 * k);
    tlRef.current = tl;
  }, []);

  const setMenu = useCallback(
    (next, { focus } = {}) => {
      if (openRef.current === next) return;
      openRef.current = next;
      setOpen(next);
      // Sincrono: main.ts riaccende Lenis PRIMA che il click su un'ancora
      // arrivi al suo handler di scroll (delegato sul document).
      window.dispatchEvent(new CustomEvent('pillnav:toggle', { detail: { open: next } }));
      if (next) {
        animateOpen();
        if (focus) tlRef.current?.eventCallback('onComplete', () => panelRef.current?.querySelector('a')?.focus());
      } else {
        animateClose();
        if (focus) burgerRef.current?.focus();
      }
    },
    [animateOpen, animateClose]
  );

  // Esc chiude; resize da aperta ricalcola il bersaglio senza animare.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenu(false, { focus: true });
    };
    const onResize = () => {
      if (tlRef.current?.isActive()) return;
      const { w, h } = measureOpen();
      gsap.set(shellRef.current, { width: w, height: h });
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open, setMenu, measureOpen]);

  useEffect(() => () => tlRef.current?.kill(), []);

  // Ritorno con "indietro" dalla bfcache: la pagina torna com'era, menu
  // aperto compreso (era rimasto aperto sotto la transizione). Lo chiudiamo.
  useEffect(() => {
    const onShow = (e) => e.persisted && setMenu(false);
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [setMenu]);

  const close = () => setMenu(false);

  // Click su una voce: se porta a un'ALTRA pagina lascia navigare il browser
  // (il wipe e il prefetch li gestisce lo script in <head> di BaseLayout, per
  // tutti i link del sito); se è un'ancora di questa pagina chiude il menu e
  // lo scroll lo fa main.ts.
  const go = (e) => {
    const href = e.currentTarget.getAttribute('href');
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (isCrossPage(href)) return;
    close();
  };
  const linkProps = { onClick: go };

  return (
    <div className="pnav" data-open={open || undefined}>
      <div ref={scrimRef} className="pnav-scrim" aria-hidden="true" onClick={close} />

      <div className="pnav-dock">
        <nav ref={shellRef} className="pnav-shell" aria-label={t.nav.mainLabel}>
          <div ref={barRef} className="pnav-bar">
            <a href={homeHref} className="pnav-logo" aria-label="AuralpDigital — Home" {...linkProps}>
              <img src="/logo/wordmark.svg" alt="AuralpDigital" width={110} height={24} draggable={false} />
            </a>

            <ul ref={linksRef} className="pnav-links" role="list" inert={open || undefined}>
              {sections.map((s) => (
                <li key={s.key}>
                  <a href={s.href} aria-label={s.aria} className="pnav-link" {...linkProps}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>

            <button
              ref={burgerRef}
              type="button"
              className="pnav-burger"
              aria-expanded={open}
              aria-controls="pnav-panel"
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
              onClick={(e) => setMenu(!openRef.current, { focus: e.detail === 0 })}
            >
              <span className="pnav-burger-line" />
              <span className="pnav-burger-line" />
            </button>
          </div>

          <div id="pnav-panel" ref={panelRef} className="pnav-panel" inert={!open || undefined} data-lenis-prevent>
            <ul className="pnav-big" role="list">
              {bigItems.map((it) => (
                <li key={it.key} className="pnav-big-item">
                  <a href={it.href} aria-label={it.aria} className="pnav-big-link" {...linkProps}>
                    <span className="pnav-big-roll">
                      <span>{it.label}</span>
                      <span aria-hidden="true">{it.label}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="pnav-foot">
              <div className="pnav-lang" role="group" aria-label={t.nav.langLabel} data-pnav-foot>
                {languages.map((code) => (
                  <a
                    key={code}
                    href={localePath(code, route)}
                    {...linkProps}
                    hrefLang={code}
                    aria-label={langNames[code]}
                    aria-current={code === lang ? 'true' : undefined}
                    className={'pnav-lang-link' + (code === lang ? ' is-active' : '')}
                  >
                    {langLabels[code]}
                  </a>
                ))}
              </div>

              <div className="pnav-ctas" data-pnav-foot>
                <a
                  className="pnav-cta"
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconWhatsapp />
                  {t.nav.whatsapp}
                </a>
                <a className="pnav-cta" href={`mailto:${EMAIL}`}>
                  <IconMail />
                  {t.nav.email}
                </a>
                <a className="pnav-cta pnav-cta--primary" href={anchor('contatti')} {...linkProps}>
                  {t.nav.bookCall}
                  <IconArrowUpRight />
                </a>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
