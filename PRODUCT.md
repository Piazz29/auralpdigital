# Design Context — AuralpDigital

- **Target audience**: professionisti e piccole attività locali (beauty, tattoo, servizi) in Alto Adige che vogliono un sistema digitale che porti clienti, non solo un sito vetrina.
- **Use cases**: valutare lo studio in pochi secondi, vedere i lavori, capire i servizi, prenotare una consulenza gratuita via email.
- **Brand personality**: premium editoriale, calmo ma vivo — base **bianco carta** (#FCFAF6) con bande sabbia e pannelli navy scuri; ogni sezione è un'esperienza guidata dal motion (GSAP + Lenis), mai chiassosa.
- **Palette**: tre famiglie con ruoli fissi (definite in `@theme` in `src/styles/global.css`, unica fonte).
  - *Carta*: `#FCFAF6` base → `#F6F2EA` box → `#F2EEE5` bande → bordi `#E8E3D9`. Testi caldi: `#171310` / `#544C40` / `#9C9384`.
  - *Blu (struttura e tecnologia)*: `#3B5BDB`, periwinkle `#8AA0FF` sullo scuro, navy `#1A2340`. Link, focus, form, torre servizi, card progetti.
  - *Arancio (calore e azione)*: `#E2632F`, `#B8461C` per il testo su carta, ambra `#F0A24B` sullo scuro. Hairline dei kicker, numerali, hover dei bottoni primari, corsivi delle sezioni calde.
- **Ritmo cromatico**: le sezioni alternano caldo e freddo — Hero (arancio) → Il punto (blu) → Cosa facciamo (blu) → Progetti (arancio) → Chi siamo (blu) → CTA (ambra su scuro) → Footer (blu). Ogni sezione ha un dominante e un solo accento dell'altra famiglia.
- **Tipografia**: Space Grotesk (display) + Inter (body); i corsivi portano il colore dominante della sezione.
- **Vincoli**: Astro statico, animazioni solo transform/opacity, sempre gated da `prefers-reduced-motion`; la CTA scura resta il climax della pagina.
