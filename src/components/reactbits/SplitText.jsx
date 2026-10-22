import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

const SplitText = ({
  text,
  className = '',
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  repeat = false,
  onLetterAnimationComplete
}) => {
  const ref = useRef(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    if (document.fonts.status === 'loaded') {
      setFontsLoaded(true);
    } else {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    }
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;
      // Prevent re-animation if already completed
      if (animationCompletedRef.current) return;
      const el = ref.current;

      // Reduced motion: niente split né tween, il testo resta pieno e statico.
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        animationCompletedRef.current = true;
        onCompleteRef.current?.();
        return;
      }

      if (el._rbsplitInstance) {
        try {
          el._rbsplitInstance.revert();
        } catch (_) {
          /* noop */
        }
        el._rbsplitInstance = null;
      }

      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
      const sign =
        marginValue === 0
          ? ''
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;

      let targets;
      const assignTargets = self => {
        if (splitType.includes('chars') && self.chars.length) targets = self.chars;
        if (!targets && splitType.includes('words') && self.words.length) targets = self.words;
        if (!targets && splitType.includes('lines') && self.lines.length) targets = self.lines;
        if (!targets) targets = self.chars || self.words || self.lines;
      };

      const splitInstance = new GSAPSplitText(el, {
        type: splitType,
        smartWrap: true,
        autoSplit: splitType === 'lines',
        linesClass: 'split-line',
        wordsClass: 'split-word',
        charsClass: 'split-char',
        reduceWhiteSpace: false,
        onSplit: self => {
          assignTargets(self);
          const tween = gsap.fromTo(
            targets,
            { ...from },
            {
              ...to,
              duration,
              ease,
              stagger: delay / 1000,
              // In repeat mode il tween è pilotato dallo ScrollTrigger qui sotto
              // (restart a ogni ingresso), quindi parte in pausa e senza trigger
              // proprio. Altrimenti: comportamento classico one-shot.
              paused: repeat,
              scrollTrigger: repeat
                ? undefined
                : {
                    trigger: el,
                    start,
                    once: true,
                    fastScrollEnd: true,
                    anticipatePin: 0.4
                  },
              onComplete: () => {
                if (!repeat) {
                  animationCompletedRef.current = true;
                  // Rilascia i layer GPU: tenere will-change su decine di
                  // caratteri dopo l'animazione tiene vivi tanti layer compositor
                  // (memoria + jank). A reveal finito non serve più.
                  gsap.set(targets, { willChange: 'auto' });
                }
                onCompleteRef.current?.();
              },
              willChange: 'transform, opacity',
              force3D: true
            }
          );

          if (repeat) {
            // Ripetibile, con due trigger distinti:
            // 1) PLAY — riparte quando la sezione entra "in vista" (stesso start
            //    one-shot), sia scrollando in giù sia risalendo dal basso.
            ScrollTrigger.create({
              trigger: el,
              start,
              fastScrollEnd: true,
              onEnter: () => tween.restart(),
              onEnterBack: () => tween.restart()
            });
            // 2) RESET — riporta le lettere allo stato nascosto SOLO quando la
            //    sezione è completamente fuori dal viewport. Senza questo secondo
            //    trigger il reset cadrebbe sulla linea di start (top 70%), facendo
            //    sparire di colpo il testo ancora visibile mentre si risale.
            ScrollTrigger.create({
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              onLeave: () => tween.pause(0),
              onLeaveBack: () => tween.pause(0)
            });
          }

          return tween;
        }
      });

      el._rbsplitInstance = splitInstance;

      return () => {
        ScrollTrigger.getAll().forEach(st => {
          if (st.trigger === el) st.kill();
        });
        try {
          splitInstance.revert();
        } catch (_) {
          /* noop */
        }
        el._rbsplitInstance = null;
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        fontsLoaded
      ],
      scope: ref
    }
  );

  const renderTag = () => {
    const style = {
      textAlign,
      overflow: 'hidden',
      display: 'inline-block',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      willChange: 'transform, opacity'
    };
    const classes = `split-parent ${className}`;
    const Tag = tag || 'p';

    return (
      <Tag ref={ref} style={style} className={classes}>
        {text}
      </Tag>
    );
  };
  return renderTag();
};

export default SplitText;
