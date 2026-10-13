import { useState, useId, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/**
 * FAQ "da una schermata" — isola interattiva. A sinistra titolo, sottotitolo
 * e l'indice delle categorie (tab numerate con il conteggio); a destra le
 * domande della categoria scelta, a fisarmonica con UNA voce aperta per volta
 * (la prima di default). Così su desktop tutta la pagina sta in 100svh senza
 * scroll interno: si cambia categoria invece di scorrere. Su mobile le tab
 * diventano una fila di chip scorrevole e il resto va in colonna.
 * Rispetta prefers-reduced-motion (transizioni istantanee).
 */
export default function FaqExplorer({ categories = [], kicker, title, subtitle, cta }) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [cat, setCat] = useState(0);
  const [open, setOpen] = useState(0); // indice della domanda aperta (-1 = nessuna)
  const tabsRef = useRef([]);

  const ease = [0.22, 1, 0.36, 1];
  const dur = reduce ? 0 : 0.42;
  const current = categories[cat] ?? { name: '', items: [] };

  const pick = (i) => {
    if (i === cat) return;
    setCat(i);
    setOpen(0);
  };
  // Frecce su/giù (e sinistra/destra su mobile) tra le tab, come da pattern ARIA.
  const onKey = (e) => {
    const k = e.key;
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(k)) return;
    e.preventDefault();
    const n = categories.length;
    const next =
      k === 'Home' ? 0 : k === 'End' ? n - 1 : (cat + (k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1) + n) % n;
    pick(next);
    tabsRef.current[next]?.focus();
  };

  return (
    <div className="faqx">
      <div className="faqx-side">
        <header className="faqx-head">
          <span className="works-kicker">{kicker}</span>
          <h1 className="faqx-title">{title}</h1>
          <p className="faqx-sub">{subtitle}</p>
        </header>

        <div className="faqx-tabs" role="tablist" aria-orientation="vertical" aria-label={title} onKeyDown={onKey}>
          {categories.map((c, i) => {
            const on = i === cat;
            return (
              <button
                key={c.name + i}
                ref={(el) => (tabsRef.current[i] = el)}
                type="button"
                role="tab"
                id={`${uid}-tab-${i}`}
                aria-selected={on}
                aria-controls={`${uid}-panel`}
                tabIndex={on ? 0 : -1}
                className={'faqx-tab' + (on ? ' is-on' : '')}
                onClick={() => pick(i)}
              >
                {on && (
                  <motion.span
                    layoutId={`${uid}-pill`}
                    className="faqx-tab-pill"
                    transition={{ duration: reduce ? 0 : 0.5, ease }}
                  />
                )}
                <span className="faqx-tab-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="faqx-tab-name">{c.name}</span>
                <span className="faqx-tab-count">{c.items.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="faqx-main">
        <div
          className="faqx-panel"
          role="tabpanel"
          id={`${uid}-panel`}
          aria-labelledby={`${uid}-tab-${cat}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: reduce ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -10 }}
              transition={{ duration: reduce ? 0 : 0.32, ease }}
            >
              <div className="faqx-panel-head">
                <span className="faqx-panel-n">{String(cat + 1).padStart(2, '0')}</span>
                <h2 className="faqx-panel-name">{current.name}</h2>
              </div>
              <ul className="faqx-items" role="list">
                {current.items.map((item, ii) => {
                  const isOpen = open === ii;
                  const panelId = `${uid}-a-${cat}-${ii}`;
                  return (
                    <li className={'faqx-item' + (isOpen ? ' is-open' : '')} key={ii}>
                      <button
                        type="button"
                        className="faqx-q"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpen(isOpen ? -1 : ii)}
                      >
                        <span className="faqx-q-text">{item.q}</span>
                        <span className="faq-icon" aria-hidden="true">
                          <span className="faq-icon-bar" />
                          <span className="faq-icon-bar faq-icon-bar--v" />
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={panelId}
                            className="faq-a-wrap"
                            role="region"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ height: { duration: dur, ease }, opacity: { duration: dur * 0.8, ease } }}
                          >
                            <p className="faqx-a">{item.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Domanda non in lista → form di contatto in fondo alla homepage. */}
        <div className="faqx-cta">
          <p className="faqx-cta-text">{cta.text}</p>
          <a className="faq-cta-btn" href={cta.href}>
            <span>{cta.button}</span>
            <span className="faq-cta-arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}
