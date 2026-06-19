'use client';

// VariableProximity (React Bits) — ogni lettera reagisce alla vicinanza del
// cursore variando l'asse 'wght' del font (font-variation-settings). Qui NON
// forziamo Roboto Flex: il testo eredita il font display del sito (Space Grotesk,
// caricato come variabile 300..700) così l'effetto resta nel linguaggio del brand.
// Dipendenza: motion.

import { forwardRef, useMemo, useRef, useState, useEffect, Fragment } from 'react';
import { motion } from 'motion/react';
import './VariableProximity.css';

// Il loop gira SOLO quando `active`. Senza questo gate il rAF restava acceso per
// sempre: su touch/mobile (nessun mouse → effetto inutile) e anche con l'hero
// fuori schermo, sprecando frame e batteria. `active` = pointer fine + in vista.
function useAnimationFrame(callback, active) {
  useEffect(() => {
    if (!active) return undefined;
    let frameId;
    const loop = () => {
      callback();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [callback, active]);
}

function useMousePositionRef(containerRef) {
  const positionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = (x, y) => {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        positionRef.current = { x: x - rect.left, y: y - rect.top };
      } else {
        positionRef.current = { x, y };
      }
    };

    const handleMouseMove = ev => updatePosition(ev.clientX, ev.clientY);
    const handleTouchMove = ev => {
      const touch = ev.touches[0];
      updatePosition(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [containerRef]);

  return positionRef;
}

const VariableProximity = forwardRef((props, ref) => {
  const {
    label,
    fromFontVariationSettings,
    toFontVariationSettings,
    containerRef,
    radius = 50,
    falloff = 'linear',
    className = '',
    onClick,
    style,
    ...restProps
  } = props;

  const letterRefs = useRef([]);
  const interpolatedSettingsRef = useRef([]);
  const mousePositionRef = useMousePositionRef(containerRef);
  const lastPositionRef = useRef({ x: null, y: null });

  // Attivazione condizionata: l'effetto di prossimità ha senso solo con un
  // puntatore fine (mouse) e mentre l'hero è in vista. Su touch o fuori schermo
  // il loop resta spento e le lettere mantengono il peso "from" (statico).
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const fine = window.matchMedia('(pointer: fine)');
    let inView = true;
    const update = () => setActive(fine.matches && inView);
    let io;
    const el = containerRef?.current;
    if (el && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          update();
        },
        { rootMargin: '120px' }
      );
      io.observe(el);
    }
    fine.addEventListener('change', update);
    update();
    return () => {
      fine.removeEventListener('change', update);
      io?.disconnect();
    };
  }, [containerRef]);

  // Al cambio di stato: se si disattiva, riporta le lettere al peso "from"
  // (evita che restino "congelate" pesanti); se si riattiva, azzera l'ultima
  // posizione così il loop ricalcola anche a mouse fermo.
  useEffect(() => {
    if (active) {
      lastPositionRef.current = { x: null, y: null };
      return;
    }
    letterRefs.current.forEach((l) => {
      if (l) l.style.fontVariationSettings = fromFontVariationSettings;
    });
  }, [active, fromFontVariationSettings]);

  const parsedSettings = useMemo(() => {
    const parseSettings = settingsStr =>
      new Map(
        settingsStr
          .split(',')
          .map(s => s.trim())
          .map(s => {
            const [name, value] = s.split(' ');
            return [name.replace(/['"]/g, ''), parseFloat(value)];
          })
      );

    const fromSettings = parseSettings(fromFontVariationSettings);
    const toSettings = parseSettings(toFontVariationSettings);

    return Array.from(fromSettings.entries()).map(([axis, fromValue]) => ({
      axis,
      fromValue,
      toValue: toSettings.get(axis) ?? fromValue
    }));
  }, [fromFontVariationSettings, toFontVariationSettings]);

  const calculateDistance = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  const calculateFalloff = distance => {
    const norm = Math.min(Math.max(1 - distance / radius, 0), 1);
    switch (falloff) {
      case 'exponential':
        return norm ** 2;
      case 'gaussian':
        return Math.exp(-((distance / (radius / 2)) ** 2) / 2);
      case 'linear':
      default:
        return norm;
    }
  };

  useAnimationFrame(() => {
    if (!containerRef?.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const { x, y } = mousePositionRef.current;
    if (lastPositionRef.current.x === x && lastPositionRef.current.y === y) {
      return;
    }
    lastPositionRef.current = { x, y };

    letterRefs.current.forEach((letterRef, index) => {
      if (!letterRef) return;

      const rect = letterRef.getBoundingClientRect();
      const letterCenterX = rect.left + rect.width / 2 - containerRect.left;
      const letterCenterY = rect.top + rect.height / 2 - containerRect.top;

      const distance = calculateDistance(
        mousePositionRef.current.x,
        mousePositionRef.current.y,
        letterCenterX,
        letterCenterY
      );

      if (distance >= radius) {
        letterRef.style.fontVariationSettings = fromFontVariationSettings;
        return;
      }

      const falloffValue = calculateFalloff(distance);
      const newSettings = parsedSettings
        .map(({ axis, fromValue, toValue }) => {
          const interpolatedValue = fromValue + (toValue - fromValue) * falloffValue;
          return `'${axis}' ${interpolatedValue}`;
        })
        .join(', ');

      interpolatedSettingsRef.current[index] = newSettings;
      letterRef.style.fontVariationSettings = newSettings;
    });
  }, active);

  const words = label.split(' ');
  let letterIndex = 0;

  return (
    <span
      ref={ref}
      className={`${className} variable-proximity`}
      onClick={onClick}
      style={{ display: 'inline', ...style }}
      {...restProps}
    >
      {words.map((word, wordIndex) => (
        // Lo spazio è un text node SIBLING tra i wrapper di parola (non in coda
        // dentro l'inline-block, dove verrebbe collassato): così resta visibile ed
        // è interrompibile → il titolo della hero può andare a capo, ma le lettere
        // di una parola restano unite (white-space:nowrap sul wrapper).
        <Fragment key={wordIndex}>
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {word.split('').map(letter => {
              const currentLetterIndex = letterIndex++;
              return (
                <motion.span
                  key={currentLetterIndex}
                  ref={el => {
                    letterRefs.current[currentLetterIndex] = el;
                  }}
                  style={{
                    display: 'inline-block',
                    fontVariationSettings: interpolatedSettingsRef.current[currentLetterIndex]
                  }}
                  aria-hidden="true"
                >
                  {letter}
                </motion.span>
              );
            })}
          </span>
          {wordIndex < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
});

VariableProximity.displayName = 'VariableProximity';
export default VariableProximity;
