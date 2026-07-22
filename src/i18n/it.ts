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
      faq: "FAQ",
    },
    aria: {
      projects: "Vai ai progetti",
      services: "Scopri cosa facciamo",
      about: "Scopri chi siamo",
      faq: "Domande frequenti",
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

  faq: {
    title: "Frequently Asked Questions",
    subtitle:
      "Tutto quello che ti serve sapere prima di iniziare un progetto digitale con AuralpDigital.",
    categories: [
      {
        name: "Progetti",
        items: [
          {
            q: "Che tipo di siti realizzate?",
            a: "Siti vetrina, landing page, e-commerce leggeri e piattaforme su misura. Ogni progetto nasce su codice pulito e veloce, pensato per convertire — non su template generici.",
          },
          {
            q: "Lavorate solo con aziende o anche con professionisti?",
            a: "Entrambi. Seguiamo aziende strutturate, attività locali e singoli professionisti. Quello che conta è avere un obiettivo chiaro da raggiungere online.",
          },
          {
            q: "Posso richiedere solo una landing page?",
            a: "Sì. Una landing page singola e ben costruita è spesso il modo migliore per lanciare un servizio o una campagna, e la trattiamo con la stessa cura di un sito completo.",
          },
          {
            q: "Realizzate anche redesign di siti esistenti?",
            a: "Sì. Analizziamo il sito attuale, capiamo cosa funziona e cosa frena i risultati, poi lo ricostruiamo: teniamo ciò che ha valore e miglioriamo struttura, velocità e design.",
          },
        ],
      },
      {
        name: "Servizi",
        items: [
          {
            q: "Vi occupate solo del sito o anche della strategia?",
            a: "Partiamo sempre dalla strategia. Prima definiamo a chi ti rivolgi e quale azione deve compiere chi arriva sul sito, poi progettiamo di conseguenza. Il sito è lo strumento, non il punto di partenza.",
          },
          {
            q: "Potete integrare sistemi di prenotazione, CRM o automazioni?",
            a: "Sì. Colleghiamo prenotazioni, CRM, pagamenti e automazioni per far parlare il sito con gli strumenti che usi già, riducendo il lavoro manuale.",
          },
          {
            q: "Gestite anche contenuti, copy e visual?",
            a: "Sì. Possiamo occuparci di testi, immagini e identità visiva, così il messaggio resta coerente in ogni parte del sito. Se hai già del materiale, lo valorizziamo.",
          },
          {
            q: "Offrite supporto dopo la pubblicazione?",
            a: "Sì. Dopo il lancio restiamo a disposizione per aggiornamenti, modifiche ed evoluzioni. Non spariamo alla consegna.",
          },
        ],
      },
      {
        name: "Processo",
        items: [
          {
            q: "Come funziona l'inizio di un progetto?",
            a: "Si parte da una call gratuita per capire obiettivi, contesto e tempi. Da lì prepariamo una proposta chiara con scope, tempistiche e costi, prima di scrivere una riga di codice.",
          },
          {
            q: "Quanto tempo serve per realizzare un sito?",
            a: "Una landing page richiede in genere 1-2 settimane, un sito completo dalle 3 alle 6. La tempistica esatta dipende da contenuti e funzionalità, e te la diciamo prima di iniziare.",
          },
          {
            q: "Cosa vi serve da parte del cliente?",
            a: "Obiettivi chiari, l'eventuale materiale che hai già (testi, logo, immagini) e qualche momento per i feedback. Al resto pensiamo noi, guidandoti passo dopo passo.",
          },
          {
            q: "Posso vedere una demo prima di decidere?",
            a: "Sì. Durante il progetto lavoriamo su un'anteprima live che puoi visitare in ogni momento: vedi il sito prendere forma e non ci sono sorprese alla fine.",
          },
        ],
      },
      {
        name: "Prezzi",
        items: [
          {
            q: "Quanto costa un sito?",
            a: "Una landing page parte da poche centinaia di euro, un sito completo cresce in base a pagine e funzionalità. Dopo la prima call ricevi un preventivo preciso, senza costi nascosti.",
          },
          {
            q: "Perché non avete un prezzo fisso uguale per tutti?",
            a: "Perché ogni progetto ha esigenze diverse. Un prezzo unico ti farebbe pagare per cose che non ti servono: costruiamo il preventivo su ciò che serve davvero a te.",
          },
          {
            q: "È possibile partire con una versione più semplice e poi ampliarla?",
            a: "Assolutamente. Molti clienti partono con una base solida e la fanno crescere nel tempo. Progettiamo il sito perché possa espandersi senza rifarlo da zero.",
          },
          {
            q: "Come funziona il pagamento?",
            a: "In genere un acconto all'avvio e il saldo alla consegna, con rate per i progetti più grandi. Concordiamo tutto in modo trasparente prima di partire.",
          },
        ],
      },
      {
        name: "Collaborazione",
        items: [
          {
            q: "Lavorate anche da remoto?",
            a: "Sì, lavoriamo da remoto con clienti in tutta Italia. Per chi è in Alto Adige possiamo anche incontrarci di persona quando serve.",
          },
          {
            q: "Come vengono gestite revisioni e feedback?",
            a: "A ogni fase ti mostriamo il lavoro e raccogliamo i feedback in modo ordinato, con momenti di revisione definiti. Niente scambi infiniti: passaggi chiari e tempi rispettati.",
          },
          {
            q: "Posso modificare il sito in autonomia dopo la consegna?",
            a: "Sì, se vuoi. Possiamo costruirlo su un sistema che ti permette di aggiornare testi e contenuti da solo, e ti mostriamo come farlo.",
          },
          {
            q: "Cosa succede dopo il lancio?",
            a: "Ti consegniamo un sito pronto e documentato. Da lì puoi proseguire in autonomia o affidarti a noi per manutenzione, evoluzioni e nuove campagne.",
          },
        ],
      },
    ],
    cta: {
      text: "Hai una domanda che non trovi tra queste?",
      button: "Scrivici direttamente",
    },
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
      // "Il punto" (logo bloom): il testo si rivela lettera per lettera sopra al
      // logo sfocato. Diviso in due parti: `textInk` (scura) nomina il problema,
      // `textAccent` (blu + corsivo) lo ribalta nella promessa.
      textInk:
        "Un sito che non porta clienti è un costo, non un investimento.",
      textAccent:
        "Costruiamo sistemi che trasformano chi cerca in chi prenota.",
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
      cta: "Scopri il nostro approccio",
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
      status: "Disponibili per nuovi progetti",
      title: "Le persone\ndietro *i pixel.*",
      sub: "Uno studio indipendente di due persone, dall'Alto Adige. Niente intermediari: chi ti risponde è chi progetta e costruisce.",
      cta: "Parla con noi",
      robotAlt: "Robot 3D interattivo — muovi il cursore per interagire",
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
        role: "Founder — Strategia & Sviluppo",
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
      hint: "Scorri le schede",
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
