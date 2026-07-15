import { useState, useId } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/**
 * Accordion FAQ — isola interattiva. Riceve le categorie già localizzate e ne
 * rende la lista a fisarmonica: separatori sottili (niente card), icona +/−,
 * apertura/chiusura fluida via motion (height auto), multi-open. Rispetta
 * prefers-reduced-motion (transizioni istantanee). I titoli/sottotitolo della
 * pagina restano statici lato Astro: qui vive solo la parte interattiva.
 */
export default function FaqAccordion({ categories = [] }) {
  const reduce = useReducedMotion();
  // Chiavi "catIdx:itemIdx" delle voci aperte. Multi-open: ognuna indipendente.
  const [open, setOpen] = useState(() => new Set());
  const uid = useId();

  const toggle = (key) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const ease = [0.22, 1, 0.36, 1]; // ease-out morbida (no bounce)
  const dur = reduce ? 0 : 0.42;

  return (
    <div className="faq-list">
      {categories.map((cat, ci) => (
        <section className="faq-cat" key={cat.name + ci}>
          <h2 className="faq-cat-name">{cat.name}</h2>

          <ul className="faq-items" role="list">
            {cat.items.map((item, ii) => {
              const key = `${ci}:${ii}`;
              const isOpen = open.has(key);
              const panelId = `${uid}-${key}`;

              return (
                <li className={'faq-item' + (isOpen ? ' is-open' : '')} key={key}>
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(key)}
                  >
                    <span className="faq-q-text">{item.q}</span>
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
                        transition={{
                          height: { duration: dur, ease },
                          opacity: { duration: dur * 0.8, ease }
                        }}
                      >
                        <p className="faq-a">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
