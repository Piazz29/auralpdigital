// IT — dizionario base (sorgente di verità). de.ts ed en.ts ne rispecchiano
// ESATTAMENTE la forma. Micro-sintassi nelle stringhe: *corsivo*, **grassetto**,
// \n = a capo (resa via <Rich />).
const it = {
  meta: {
    home: {
      title: "AuralpDigital — Sistemi digitali che generano clienti",
      description:
        "Studio di crescita digitale in Alto Adige. Siti web premium, lead generation, campagne ads, brand & social, automazioni, AI integration.",
    },
    about: {
      title: "Chi siamo — AuralpDigital",
      description:
        "Le persone dietro AuralpDigital: un team indipendente in Alto Adige con formazione universitaria, strumenti di nuova generazione e un workflow potenziato dall'AI.",
    },
  },

  nav: {
    items: {
      projects: "Progetti",
      services: "Cosa Facciamo",
      about: "Chi Siamo",
      info: "Info",
    },
    aria: {
      projects: "Vai ai progetti",
      services: "Scopri cosa facciamo",
      about: "Scopri chi siamo",
      info: "Informazioni e contatti",
    },
    socialsLabel: "Social",
    write: "Scrivici",
    place: "Alto Adige\nItalia, 39100",
    toggleOpen: "Menu",
    toggleClose: "Chiudi",
    openMenu: "Apri il menu",
    closeMenu: "Chiudi il menu",
    langLabel: "Lingua",
  },

  home: {
    hero: {
      badge: "Digital Growth Studio · Alto Adige",
      l1: "Sistemi digitali",
      l2: "di *prossima*",
      l3: "generazione.",
      sub: "Siti web, gestionali e social che trasformano visitatori in clienti.",
      cta: "Esplora il nostro lavoro",
      scroll: "Scorri",
    },
    problem: {
      kicker: "Il punto",
      line1: "Un sito che non porta clienti è un costo, non un investimento.",
      line2: "Costruiamo sistemi che trasformano chi cerca in chi prenota.",
    },
    services: {
      kicker: "Cosa facciamo",
      title: "Servizi che fanno crescere.",
      link: "Parliamone",
      scroll: "Scorri",
      items: [
        {
          name: "Siti web",
          nameEm: "che convertono.",
          desc: "Ultra-moderni, veloci e impeccabili su mobile. Ottimizzati per Google e per le ricerche AI (SEO + GEO), con intelligenza artificiale integrata e ogni dettaglio progettato per trasformare i visitatori in clienti.",
          points: [
            "Primo contatto in meno di 3 secondi",
            "Trovato su Google e sulle AI",
            "Ogni sezione spinge all'azione",
          ],
        },
        {
          name: "Gestionali",
          nameEm: "su misura.",
          desc: "Sistemi costruiti attorno ai tuoi processi: dati centralizzati e sempre sotto controllo, ogni lead seguito fino in fondo. Potenziati dall'AI, per completare più lavoro in meno tempo.",
          points: [
            "Un solo posto per tutti i dati",
            "Nessun lead lasciato a metà",
            "Ore di lavoro manuale in meno",
          ],
        },
        {
          name: "Social",
          nameEm: "che vendono.",
          desc: "Strategia e contenuti per far crescere il traffico organico, campagne ads mirate per trasformarlo in clienti: il tuo brand davanti alle persone giuste, al momento giusto.",
          points: [
            "Contenuti che fermano lo scroll",
            "Ads puntate su chi compra",
            "Numeri chiari, ogni mese",
          ],
        },
      ],
    },
    projects: {
      kicker: "Risultati reali",
      title: "Cosa abbiamo creato.",
      link: "Il prossimo è il tuo",
      previewLabel: "Anteprima",
      items: [
        {
          type: "Beauty · Permanent Make-up",
          desc: "Sito editoriale fotografia-first per studio di trucco permanente.",
          cta: "Apri il sito",
        },
        {
          type: "Tattoo Studio",
          desc: "Identità dark-luxe con motion legato allo scroll per studio tattoo.",
          cta: "Apri il sito",
        },
        {
          title: "Il",
          titleEm: "prossimo.",
          type: "Spazio libero",
          desc: "Questo spazio è libero: il prossimo caso studio potrebbe essere il tuo.",
          cta: "Inizia da qui",
        },
      ],
    },
    aboutTeaser: {
      kicker: "Chi siamo",
      statement:
        "Uno studio indipendente che unisce *rigore universitario* e strumenti di nuova generazione: ogni progetto seguito *dalle stesse mani*, dal primo sketch al lancio",
    },
    contact: {
      kicker: "Iniziamo",
      headline: "Costruiamo il tuo *sistema di crescita.*",
      sub: "Una consulenza gratuita di 30 minuti: nessun impegno, solo idee chiare su come far crescere la tua attività.",
    },
  },

  contactForm: {
    asideLabel: "La consulenza",
    asideTitle: "Da qui *parte tutto.*",
    steps: [
      "Ci scrivi due righe sul progetto",
      "Ti rispondiamo entro 24 ore",
      "Call gratuita di 30 min, zero impegno",
    ],
    asideNote: "Budget chiari da subito · Nessun impegno",
    fields: {
      name: "Nome",
      email: "Email",
      business: "La tua attività",
      project: "Il progetto",
    },
    placeholders: {
      name: "Come ti chiami",
      email: "Dove ti rispondiamo",
      business: "Studio, brand, settore…",
      project: "Due righe su cosa hai in mente.",
    },
    budgetLegend: "Budget indicativo",
    budgetOptional: "— opzionale, in €",
    budgets: ["< 1.5k", "1.5–3k", "3–6k", "6k+", "Non so ancora"],
    submit: "Prenota la consulenza",
    submitNote: "Risposta entro 24 ore",
    statusOpening:
      "Apriamo la tua email… se non parte, scrivici a hello@auralpdigital.com",
    mail: {
      subject: "Nuova richiesta di consulenza",
      name: "Nome",
      email: "Email",
      business: "Attività",
      budget: "Budget indicativo",
      projectHeading: "Progetto:",
      empty: "—",
    },
  },

  footer: {
    tagline: "Sistemi digitali di prossima generazione,\nprogettati in Alto Adige.",
    menuLabel: "Menu",
    links: {
      projects: "Progetti",
      services: "Cosa facciamo",
      about: "Chi siamo",
      contact: "Contatti",
    },
    contactLabel: "Contatti",
    muted: "Alto Adige, Italia · 39100",
    location: "Alto Adige, Italia",
    madeWith: "Fatto con cura",
  },

  about: {
    hero: {
      badge: "Chi siamo",
      title: "Le persone dietro *i pixel.*",
      sub: "Uno studio indipendente di due persone, dall'Alto Adige. Niente intermediari: chi ti risponde è chi progetta e costruisce.",
      meta: [
        { label: "Base", value: "Alto Adige" },
        { label: "Team", value: "Due fondatori" },
        { label: "Metodo", value: "AI-augmented" },
      ],
    },
    manifesto: {
      kicker: "Il manifesto",
      statement: "Un piccolo team con gli strumenti giusti batte un'agenzia intera.",
      notes: [
        "**Meno passaggi.** Una sola voce, dallo sketch al lancio.",
        "**Più cura.** Ogni dettaglio passa due volte sotto i nostri occhi.",
        "*Tecnologia di frontiera* in ogni riga, mai per moda — solo quando lavora per te.",
      ],
    },
    duo: {
      kicker: "Il duo",
      title: "Julian *&* Alice.",
    },
    people: [
      {
        role: "Co-founder — Strategia & Sviluppo",
        bio: "Strategia, codice e sistemi. Julian progetta l'architettura di ogni progetto — dal posizionamento al deploy — e costruisce siti e gestionali con uno stack moderno e un workflow potenziato dall'AI. Se una cosa si può misurare, lui la misura.",
        focus: ["Strategia digitale", "Sviluppo web", "SEO + GEO", "AI & automazioni"],
      },
      {
        role: "Co-founder — Design & Contenuti",
        bio: "Design, contenuti e direzione visiva. Alice dà forma all'identità dei brand: interfacce pulite, fotografia curata e contenuti che parlano alle persone giuste con il tono giusto. Se un dettaglio stona, lei lo vede.",
        focus: ["Art direction", "UI & visual design", "Contenuti & social", "Fotografia"],
      },
    ],
    journey: {
      kicker: "Il percorso",
      title: "Da studenti *a studio.*",
      steps: [
        {
          year: "Le basi",
          kicker: "La formazione",
          title: "Università.",
          text: "Il metodo nasce qui: analisi, ricerca e pensiero critico. Il percorso universitario ci ha dato il rigore che oggi applichiamo a ogni progetto — e non abbiamo mai smesso di studiare.",
        },
        {
          year: "La scintilla",
          kicker: "I primi progetti",
          title: "La prima riga di codice.",
          text: "I primi siti per attività locali dell'Alto Adige. È lì che capiamo una cosa semplice: ai professionisti non serve una vetrina, serve un sistema che porti clienti.",
        },
        {
          year: "Oggi",
          kicker: "Lo studio",
          title: "AuralpDigital.",
          text: "Uno studio digitale indipendente: strategia, design e tecnologia sotto lo stesso tetto, un workflow AI-augmented e un unico standard — fatto bene o rifatto.",
        },
        {
          year: "Domani",
          kicker: "La direzione",
          title: "Sempre un passo avanti.",
          text: "Ogni nuova ondata tecnologica viene studiata, testata e — solo se funziona — portata nei progetti dei nostri clienti. Prima degli altri, mai a scapito della qualità.",
        },
      ],
    },
    flow: {
      kicker: "Come lavoriamo",
      title: "Umani al timone, *AI in sala macchine.*",
      lead: "Dalla prima ricerca fino al lancio, ogni fase passa dalle nostre mani: l'AI accelera, le decisioni le prendiamo noi. Quattro passi, un solo standard.",
      items: [
        {
          title: "Ascolto",
          titleEm: "e analisi.",
          text: "Prima di disegnare qualsiasi cosa, capiamo il tuo mercato: chi cerca, cosa cerca, chi sono i concorrenti. L'AI accelera la ricerca e l'analisi dei dati — le conclusioni le tiriamo noi, insieme a te.",
          tag: "Ricerca",
        },
        {
          title: "Design",
          titleEm: "con intenzione.",
          text: "Ogni scelta visiva ha uno scopo: guidare il visitatore verso un'azione. Con gli strumenti generativi esploriamo più direzioni in meno tempo, poi rifiniamo a mano quella giusta.",
          tag: "Art direction",
        },
        {
          title: "Sviluppo",
          titleEm: "senza compromessi.",
          text: "Codice moderno, veloce, accessibile. L'AI scrive con noi e rivede ogni riga — ma niente va online senza essere passato sotto occhi umani, su dispositivi reali.",
          tag: "Build",
        },
        {
          title: "Crescita",
          titleEm: "misurabile.",
          text: "Il lancio è l'inizio, non la fine: dati, test e ottimizzazioni continue. Ogni mese sai cosa è cambiato, perché, e cosa porta clienti.",
          tag: "Ottimizzazione",
        },
      ],
    },
    outro: {
      names: "Persone, *non* agenzie.",
      cta: "Le stesse mani, dallo sketch al lancio",
    },
    cta: {
      kicker: "Iniziamo",
      title: "Ora che ci conosci, *parliamo di te.*",
      sub: "Una consulenza gratuita di 30 minuti: nessun impegno, solo idee chiare per far crescere la tua attività.",
      btn: "Compila il form",
      mail: "oppure scrivici a hello@auralpdigital.com",
      foot: ["Risposta entro 24 ore", "Nessun impegno", "Budget chiari da subito"],
    },
  },
};

export default it;
