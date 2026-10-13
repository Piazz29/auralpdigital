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
    mainLabel: "Navigazione principale",
    whatsapp: "WhatsApp",
    email: "Email",
    bookCall: "Prenota una call",
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
    services: {
      // COSA FACCIAMO — tre servizi, uno per ogni dolore nominato in "Il
      // punto" (Google → siti, DM → social, a qualsiasi ora → gestionali).
      // Descrizioni di lunghezza simile: il palco non cambia altezza tra una
      // scena e l'altra. `name` tondo + `nameEm` corsivo blu.
      // `short` = etichetta nella barra di navigazione; `tags` = tre
      // etichette sotto la descrizione; `fix` = la notifica di "Il punto"
      // RISOLTA, che compare sull'angolo della card (decorativa).
      link: "Parliamone",
      items: [
        {
          name: "Siti web",
          nameEm: "che convertono.",
          desc: "Ti trovano su Google e nelle ricerche AI, si aprono in un attimo e accompagnano chi arriva fino alla prenotazione. Il tuo miglior venditore, aperto 24 ore su 24.",
          short: "Siti web",
          tags: ["SEO e ricerca AI", "Prenotazioni online", "Veloci su mobile"],
          fix: { title: "Google", body: "Il primo risultato sei tu" },
        },
        {
          name: "Social & Ads",
          nameEm: "che vendono.",
          desc: "Contenuti che fermano lo scroll e campagne mirate su chi è pronto a comprare. L'attenzione diventa prenotazioni, non messaggi da rincorrere uno per uno.",
          short: "Social & Ads",
          tags: ["Contenuti", "Campagne Ads", "Clienti pronti a comprare"],
          fix: { title: "Messaggio diretto", body: "Prenotato, senza rincorrere" },
        },
        {
          name: "Gestionali",
          nameEm: "su misura.",
          desc: "Prenotazioni, contatti e clienti in un unico posto, con automazioni che rispondono anche quando tu non puoi. Nessuna richiesta persa, ore restituite ogni settimana.",
          short: "Gestionali",
          tags: ["Agenda e clienti", "Risposte automatiche", "Tutto in un posto"],
          fix: { title: "Chiamata delle 22:47", body: "Risposta automatica inviata" },
        },
      ],
    },
    projects: {
      title: "Progetti Online",
      sub: "Esplora i nostri lavori",
      soon: "Coming soon",
      soonSub: "Il prossimo è in cantiere",
      create: "Crea il tuo progetto",
      visit: "Apri il sito",
    },
    point: {
      // IL PUNTO — subito dopo la hero, racconto in tre tempi dentro un pin
      // (regia in main.ts): il LAVORO (lead), il CAOS (but + pains, con le
      // notifiche che si accumulano ai lati), la SVOLTA (turn + turnSub, con
      // la notifica "ok" che chiude il caos).
      // **Parole chiave**: evidenziatore nel problema, blu nella svolta.
      lead: "Fai un lavoro eccellente.",
      but: "Ma i clienti",
      pains: [
        "ti scrivono **in DM**,",
        "ti chiamano **a qualsiasi ora**",
        "e alla fine prenotano da chi trovano **prima su Google**.",
      ],
      turn: "Costruiamo **il sistema** che li porta da te.",
      turnSub: "E lavora mentre tu lavori.",
      // Notifiche decorative (aria-hidden): una per ogni riga del problema,
      // più quella della svolta.
      pings: [
        { title: "Messaggio diretto", body: "Ciao! Avete posto sabato?" },
        { title: "Chiamata persa", body: "Oggi, 22:47" },
        { title: "Google", body: "Il primo risultato non sei tu" },
      ],
      ok: { title: "Nuova prenotazione", body: "Confermata in automatico" },
    },
    contact: {
      kicker: "Iniziamo",
      headline: "Costruiamo il tuo *sistema di crescita.*",
      sub: "Tre domande veloci e sappiamo già come aiutarti. Poi scegli tu: una call gratuita di 30 minuti o un messaggio diretto.",
    },
  },

  contactForm: {
    // FORM A PASSI — le domande si aprono una dopo l'altra: servizio →
    // profilo → canale (call con calendario, oppure WhatsApp/email).
    // `value` resta fisso in tutte le lingue: è ciò che arriva nel messaggio.
    steps: {
      service: { title: "Cosa vuoi creare?", hint: "Anche più di una risposta" },
      profile: { title: "Per chi è il progetto?", hint: "Così prepariamo la proposta giusta" },
      channel: { title: "Come preferisci sentirci?", hint: "Scegli tu, rispondiamo sempre noi due" },
    },
    services: [
      { value: "web", label: "Sito web", desc: "Vetrina, prenotazioni, e-commerce" },
      { value: "social", label: "Social & Ads", desc: "Contenuti e campagne che vendono" },
      { value: "gestionale", label: "Gestionale su misura", desc: "Clienti, agenda, automazioni" },
      { value: "unsure", label: "Non lo so ancora", desc: "Ci consigliate voi" },
    ],
    profiles: [
      { value: "solo", label: "Solo io", desc: "Freelance o professionista" },
      { value: "team", label: "Piccolo team", desc: "Da 2 a 10 persone" },
      { value: "company", label: "Azienda", desc: "Oltre 10 persone" },
      { value: "startup", label: "Sto partendo", desc: "Nuova attività o idea" },
    ],
    channels: {
      call: { label: "Prenota una call", desc: "30 minuti gratuiti, scegli giorno e ora" },
      write: { label: "Scrivici subito", desc: "WhatsApp o email, in un tap" },
    },
    calendar: {
      prev: "Mese precedente",
      next: "Mese successivo",
      pickDay: "Scegli un giorno per vedere gli orari liberi.",
      timezone: "Ora italiana · 30 min",
    },
    fields: {
      name: "Nome",
      email: "Email",
      namePh: "Come ti chiami",
      emailPh: "Dove ti mandiamo l'invito",
      addMessage: "Aggiungi un messaggio",
      messagePh: "Due righe sul progetto (facoltativo)",
    },
    book: "Prenota la call",
    errors: {
      slot: "Scegli giorno e orario.",
      name: "Scrivi il tuo nome.",
      email: "Serve un'email valida per mandarti l'invito.",
    },
    done: {
      title: "Ci siamo quasi.",
      text: "Abbiamo preparato l'email con la tua richiesta: premi Invia e ti confermiamo l'invito entro 24 ore.",
      addToCal: "Segna nel tuo calendario",
      edit: "Cambia orario",
    },
    direct: {
      whatsapp: "WhatsApp",
      whatsappNote: "Rispondiamo in giornata",
      email: "Email",
      note: "Il messaggio è già scritto con le tue scelte: devi solo inviarlo.",
    },
    msg: {
      hello: "Ciao AuralpDigital!",
      interest: "Mi interessa",
      profile: "Profilo",
      callSubject: "Richiesta call",
      writeSubject: "Nuovo progetto",
      when: "Quando",
      name: "Nome",
      email: "Email",
      message: "Messaggio",
      calTitle: "Call con AuralpDigital",
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
    whatsapp: "WhatsApp",
    email: "Email",
    backToTop: "Torna su",
  },

  about: {
    hero: {
      badge: "Chi siamo",
      status: "Disponibili per nuovi progetti",
      title: "Le persone\ndietro *i pixel.*",
      sub: "Uno studio indipendente di due persone, dall'Alto Adige. Strategia, design e codice sotto lo stesso tetto.",
      cta: "Parla con noi",
      meet: "Conoscici",
      hint: "Passa il cursore e guarda dietro i pixel",
      hintTouch: "Tocca e guarda dietro i pixel",
    },
    manifesto: {
      kicker: "Il manifesto",
      statement: "Un piccolo team con gli strumenti giusti batte *un'agenzia intera.*",
      facts: [
        { n: 0, label: "intermediari", text: "Chi ti risponde è chi progetta e costruisce. Niente telefono senza fili." },
        { n: 1, label: "sola voce", text: "Dallo sketch al lancio parli sempre con le stesse due persone." },
        { n: 2, label: "paia d'occhi", text: "Ogni dettaglio passa da entrambi prima di andare online." },
      ],
    },
    duo: {
      kicker: "Il duo",
      title: "Piacere, *siamo noi.*",
      lead: "Due competenze che si incastrano: uno costruisce i sistemi, l'altra dà loro una forma. Insieme copriamo tutto il progetto, senza passaggi di mano.",
    },
    people: [
      {
        title: "Founder",
        area: "Strategia & Sviluppo",
        bio: "Strategia, codice e sistemi. Julian progetta l'architettura di ogni progetto, dal posizionamento al deploy, e costruisce siti e gestionali con uno stack moderno e un workflow potenziato dall'AI.",
        quote: "Se una cosa si può misurare, *la misuro.*",
        focus: ["Strategia digitale", "Sviluppo web", "SEO + GEO", "AI & automazioni"],
      },
      {
        title: "Co-founder",
        area: "Design & Contenuti",
        bio: "Design, contenuti e direzione visiva. Alice dà forma all'identità dei brand: interfacce pulite, fotografia curata e contenuti che parlano alle persone giuste, con il tono giusto.",
        quote: "Se un dettaglio stona, *lo vedo.*",
        focus: ["Art direction", "UI & visual design", "Contenuti & social", "Fotografia"],
      },
    ],
    journey: {
      kicker: "Il percorso",
      lead: "Quattro tappe, un solo cursore. Scorri: è lui a raccontarti come siamo arrivati fin qui.",
      start: "Scorri per partire",
      stops: "Le tappe",
      outro: { kicker: "Il prossimo capitolo", title: "Lo scriviamo *insieme.*", cta: "Iniziamo un progetto" },
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
      console: { title: "sala-macchine", live: "in funzione", ai: "AI · accelera", human: "Umani · decidono", handoff: "passa al timone", approved: "Approvato", signed: "Alice & Julian, al timone", phase: "Fase" },
      items: [
        {
          title: "Ascolto",
          titleEm: "e analisi.",
          text: "Prima di disegnare qualsiasi cosa, capiamo il tuo mercato: chi cerca, cosa cerca, chi sono i concorrenti. L'AI accelera la ricerca e l'analisi dei dati — le conclusioni le tiriamo noi, insieme a te.",
          tag: "Ricerca",
          ai: ["scansione di 1.240 ricerche locali", "mappatura di 12 concorrenti in zona", "intenti trovati: «vicino a me», «prezzi», «orari»"],
          metric: { value: 1240, label: "ricerche analizzate" },
          decision: "Puntiamo su chi cerca «vicino a me»: è lì che nasce il contatto.",
        },
        {
          title: "Design",
          titleEm: "con intenzione.",
          text: "Ogni scelta visiva ha uno scopo: guidare il visitatore verso un'azione. Con gli strumenti generativi esploriamo più direzioni in meno tempo, poi rifiniamo a mano quella giusta.",
          tag: "Art direction",
          ai: ["generazione di 38 direzioni visive", "test di contrasto e leggibilità", "varianti di layout per mobile"],
          metric: { value: 38, label: "direzioni esplorate" },
          decision: "Ne teniamo una sola. La rifiniamo a mano, pixel per pixel.",
        },
        {
          title: "Sviluppo",
          titleEm: "senza compromessi.",
          text: "Codice moderno, veloce, accessibile. L'AI scrive con noi e rivede ogni riga — ma niente va online senza essere passato sotto occhi umani, su dispositivi reali.",
          tag: "Build",
          ai: ["revisione automatica di ogni commit", "esecuzione di 312 test", "audit di accessibilità e velocità"],
          metric: { value: 312, label: "test superati" },
          decision: "Online solo dopo la prova su telefoni veri. Di entrambi.",
        },
        {
          title: "Crescita",
          titleEm: "misurabile.",
          text: "Il lancio è l'inizio, non la fine: dati, test e ottimizzazioni continue. Ogni mese sai cosa è cambiato, perché, e cosa porta clienti.",
          tag: "Ottimizzazione",
          ai: ["monitoraggio di traffico e contatti", "A/B test su titoli e pulsanti", "report del mese pronto"],
          metric: { value: 12, label: "report all’anno" },
          decision: "Teniamo quello che porta clienti. Il resto, lo cambiamo.",
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
