// DE — traduzione tedesca. Stessa forma di it.ts (verificata via `satisfies`).
// La regione "Alto Adige" è localizzata come "Südtirol".
const de = {
  meta: {
    home: {
      title: "AuralpDigital — Digitale Systeme, die Kunden bringen",
      description:
        "Digital-Growth-Studio in Südtirol. Premium-Websites, Lead-Generierung, Ad-Kampagnen, Brand & Social, Automatisierung, KI-Integration.",
    },
    about: {
      title: "Über uns — AuralpDigital",
      description:
        "Die Menschen hinter AuralpDigital: ein unabhängiges Team in Südtirol mit universitärer Ausbildung, Werkzeugen der neuen Generation und einem KI-gestützten Workflow.",
    },
  },

  nav: {
    items: {
      projects: "Projekte",
      services: "Was wir tun",
      about: "Über uns",
      info: "Info",
    },
    aria: {
      projects: "Zu den Projekten",
      services: "Entdecke, was wir tun",
      about: "Erfahre, wer wir sind",
      info: "Informationen und Kontakt",
    },
    socialsLabel: "Social",
    write: "Schreib uns",
    place: "Südtirol\nItalien, 39100",
    toggleOpen: "Menü",
    toggleClose: "Schließen",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
    langLabel: "Sprache",
  },

  home: {
    hero: {
      badge: "Digital Growth Studio · Südtirol",
      l1: "Digitale Systeme",
      l2: "der *nächsten*",
      l3: "Generation.",
      sub: "Websites, Management-Systeme und Social Media, die Besucher zu Kunden machen.",
      cta: "Unsere Arbeit entdecken",
      scroll: "Scrollen",
    },
    problem: {
      kicker: "Der Punkt",
      line1: "Eine Website, die keine Kunden bringt, ist ein Kostenfaktor, keine Investition.",
      line2: "Wir bauen Systeme, die aus Suchenden Buchende machen.",
    },
    services: {
      kicker: "Was wir tun",
      title: "Leistungen, die wachsen lassen.",
      link: "Sprechen wir darüber",
      scroll: "Scrollen",
      items: [
        {
          name: "Websites,",
          nameEm: "die konvertieren.",
          desc: "Ultramodern, schnell und tadellos auf dem Smartphone. Optimiert für Google und für KI-Suchen (SEO + GEO), mit integrierter künstlicher Intelligenz und jedem Detail darauf ausgelegt, Besucher zu Kunden zu machen.",
          points: [
            "Erster Eindruck in unter 3 Sekunden",
            "Gefunden bei Google und bei KI",
            "Jeder Abschnitt führt zur Aktion",
          ],
        },
        {
          name: "Management-Systeme",
          nameEm: "nach Maß.",
          desc: "Systeme, die um deine Abläufe herum gebaut sind: zentrale Daten, jederzeit unter Kontrolle, jeder Lead bis zum Ende verfolgt. Von KI verstärkt, um mehr Arbeit in weniger Zeit zu schaffen.",
          points: [
            "Alle Daten an einem Ort",
            "Kein Lead bleibt liegen",
            "Stunden weniger Handarbeit",
          ],
        },
        {
          name: "Social Media,",
          nameEm: "das verkauft.",
          desc: "Strategie und Inhalte für mehr organischen Traffic, gezielte Ad-Kampagnen, um ihn in Kunden zu verwandeln: deine Marke vor den richtigen Menschen, zur richtigen Zeit.",
          points: [
            "Inhalte, die den Scroll stoppen",
            "Ads, gezielt auf Käufer",
            "Klare Zahlen, jeden Monat",
          ],
        },
      ],
    },
    projects: {
      kicker: "Echte Ergebnisse",
      title: "Was wir geschaffen haben.",
      link: "Das nächste ist deins",
      previewLabel: "Vorschau",
      items: [
        {
          type: "Beauty · Permanent Make-up",
          desc: "Redaktionelle, fotografie-orientierte Website für ein Permanent-Make-up-Studio.",
          cta: "Website öffnen",
        },
        {
          type: "Tattoo-Studio",
          desc: "Dark-Luxe-Identität mit scrollgebundener Motion für ein Tattoo-Studio.",
          cta: "Website öffnen",
        },
        {
          title: "Das",
          titleEm: "nächste.",
          type: "Freier Platz",
          desc: "Dieser Platz ist frei: die nächste Fallstudie könnte deine sein.",
          cta: "Hier beginnen",
        },
      ],
    },
    aboutTeaser: {
      kicker: "Über uns",
      statement:
        "Ein unabhängiges Studio, das *universitäre Strenge* mit Werkzeugen der neuen Generation verbindet: jedes Projekt aus *einer Hand*, vom ersten Sketch bis zum Launch",
    },
    contact: {
      kicker: "Los geht's",
      headline: "Wir bauen dein *Wachstumssystem.*",
      sub: "Eine kostenlose 30-Minuten-Beratung: keine Verpflichtung, nur klare Ideen, wie du dein Geschäft wachsen lässt.",
    },
  },

  contactForm: {
    asideLabel: "Die Beratung",
    asideTitle: "Hier *beginnt alles.*",
    steps: [
      "Du schreibst uns ein paar Zeilen zum Projekt",
      "Wir antworten innerhalb von 24 Stunden",
      "Kostenloser 30-Min-Call, ganz unverbindlich",
    ],
    asideNote: "Klare Budgets von Anfang an · Unverbindlich",
    fields: {
      name: "Name",
      email: "E-Mail",
      business: "Dein Business",
      project: "Das Projekt",
    },
    placeholders: {
      name: "Wie heißt du",
      email: "Wohin wir antworten",
      business: "Studio, Marke, Branche…",
      project: "Zwei Zeilen zu deiner Idee.",
    },
    budgetLegend: "Ungefähres Budget",
    budgetOptional: "— optional, in €",
    budgets: ["< 1.5k", "1.5–3k", "3–6k", "6k+", "Weiß ich noch nicht"],
    submit: "Beratung buchen",
    submitNote: "Antwort innerhalb von 24 Stunden",
    statusOpening:
      "Wir öffnen deine E-Mail… falls nichts passiert, schreib uns an hello@auralpdigital.com",
    mail: {
      subject: "Neue Beratungsanfrage",
      name: "Name",
      email: "E-Mail",
      business: "Business",
      budget: "Ungefähres Budget",
      projectHeading: "Projekt:",
      empty: "—",
    },
  },

  footer: {
    tagline: "Digitale Systeme der nächsten Generation,\nentworfen in Südtirol.",
    menuLabel: "Menü",
    links: {
      projects: "Projekte",
      services: "Was wir tun",
      about: "Über uns",
      contact: "Kontakt",
    },
    contactLabel: "Kontakt",
    muted: "Südtirol, Italien · 39100",
    location: "Südtirol, Italien",
    madeWith: "Mit Sorgfalt gemacht",
  },

  about: {
    hero: {
      badge: "Über uns",
      title: "Die Menschen hinter *den Pixeln.*",
      sub: "Ein unabhängiges Zwei-Personen-Studio aus Südtirol. Keine Zwischenhändler: Wer dir antwortet, ist der, der entwirft und baut.",
      meta: [
        { label: "Sitz", value: "Südtirol" },
        { label: "Team", value: "Zwei Gründer" },
        { label: "Methode", value: "AI-augmented" },
      ],
    },
    manifesto: {
      kicker: "Das Manifest",
      statement: "Ein kleines Team mit den richtigen Werkzeugen schlägt eine ganze Agentur.",
      notes: [
        "**Weniger Übergaben.** Eine Stimme, vom Sketch bis zum Launch.",
        "**Mehr Sorgfalt.** Jedes Detail prüfen wir zweimal.",
        "*Spitzentechnologie* in jeder Zeile, nie aus Mode — nur wenn sie für dich arbeitet.",
      ],
    },
    duo: {
      kicker: "Das Duo",
      title: "Julian *&* Alice.",
    },
    people: [
      {
        role: "Co-Founder — Strategie & Entwicklung",
        bio: "Strategie, Code und Systeme. Julian entwirft die Architektur jedes Projekts — von der Positionierung bis zum Deploy — und baut Websites und Management-Systeme mit modernem Stack und einem KI-gestützten Workflow. Was sich messen lässt, misst er.",
        focus: ["Digitale Strategie", "Webentwicklung", "SEO + GEO", "KI & Automatisierung"],
      },
      {
        role: "Co-Founder — Design & Inhalte",
        bio: "Design, Inhalte und visuelle Leitung. Alice formt die Identität der Marken: klare Interfaces, kuratierte Fotografie und Inhalte, die die richtigen Menschen im richtigen Ton ansprechen. Wenn ein Detail nicht stimmt, sieht sie es.",
        focus: ["Art Direction", "UI & Visual Design", "Inhalte & Social", "Fotografie"],
      },
    ],
    journey: {
      kicker: "Der Weg",
      title: "Von Studenten *zum Studio.*",
      steps: [
        {
          year: "Die Basis",
          kicker: "Die Ausbildung",
          title: "Universität.",
          text: "Hier entsteht die Methode: Analyse, Recherche und kritisches Denken. Das Studium hat uns die Strenge gegeben, die wir heute auf jedes Projekt anwenden — und wir haben nie aufgehört zu lernen.",
        },
        {
          year: "Der Funke",
          kicker: "Die ersten Projekte",
          title: "Die erste Zeile Code.",
          text: "Die ersten Websites für lokale Betriebe in Südtirol. Dort begreifen wir etwas Einfaches: Profis brauchen kein Schaufenster, sondern ein System, das Kunden bringt.",
        },
        {
          year: "Heute",
          kicker: "Das Studio",
          title: "AuralpDigital.",
          text: "Ein unabhängiges Digitalstudio: Strategie, Design und Technologie unter einem Dach, ein KI-gestützter Workflow und ein einziger Standard — gut gemacht oder neu gemacht.",
        },
        {
          year: "Morgen",
          kicker: "Die Richtung",
          title: "Immer einen Schritt voraus.",
          text: "Jede neue Technologiewelle wird geprüft, getestet und — nur wenn sie funktioniert — in die Projekte unserer Kunden gebracht. Vor den anderen, nie auf Kosten der Qualität.",
        },
      ],
    },
    flow: {
      kicker: "Wie wir arbeiten",
      title: "Menschen am Steuer, *KI im Maschinenraum.*",
      lead: "Von der ersten Recherche bis zum Launch geht jede Phase durch unsere Hände: die KI beschleunigt, die Entscheidungen treffen wir. Vier Schritte, ein Standard.",
      items: [
        {
          title: "Zuhören",
          titleEm: "und Analyse.",
          text: "Bevor wir irgendetwas entwerfen, verstehen wir deinen Markt: wer sucht, was gesucht wird, wer die Konkurrenten sind. Die KI beschleunigt Recherche und Datenanalyse — die Schlüsse ziehen wir, gemeinsam mit dir.",
          tag: "Recherche",
        },
        {
          title: "Design",
          titleEm: "mit Absicht.",
          text: "Jede visuelle Entscheidung hat einen Zweck: den Besucher zu einer Aktion zu führen. Mit generativen Werkzeugen erkunden wir mehrere Richtungen in kürzerer Zeit, dann verfeinern wir die richtige von Hand.",
          tag: "Art Direction",
        },
        {
          title: "Entwicklung",
          titleEm: "ohne Kompromisse.",
          text: "Moderner, schneller, barrierefreier Code. Die KI schreibt mit uns und prüft jede Zeile — aber nichts geht online, ohne von menschlichen Augen auf echten Geräten geprüft worden zu sein.",
          tag: "Build",
        },
        {
          title: "Wachstum",
          titleEm: "messbar.",
          text: "Der Launch ist der Anfang, nicht das Ende: Daten, Tests und laufende Optimierung. Jeden Monat weißt du, was sich geändert hat, warum, und was Kunden bringt.",
          tag: "Optimierung",
        },
      ],
    },
    outro: {
      names: "Menschen, *keine* Agenturen.",
      cta: "Dieselben Hände, vom Sketch bis zum Launch",
    },
    cta: {
      kicker: "Los geht's",
      title: "Jetzt, wo du uns kennst, *sprechen wir über dich.*",
      sub: "Eine kostenlose 30-Minuten-Beratung: keine Verpflichtung, nur klare Ideen, um dein Geschäft wachsen zu lassen.",
      btn: "Formular ausfüllen",
      mail: "oder schreib uns an hello@auralpdigital.com",
      foot: ["Antwort innerhalb von 24 Stunden", "Unverbindlich", "Klare Budgets von Anfang an"],
    },
  },
};

export default de;
