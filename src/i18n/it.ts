// IT — dizionario base (sorgente di verità). de.ts ed en.ts ne rispecchiano
// ESATTAMENTE la forma. Micro-sintassi nelle stringhe: *corsivo*, **grassetto**,
// \n = a capo (resa via <Rich />).
const it = {
  meta: {
    home: {
      title: "Web agency a Bolzano · Siti web e gestionali | AuralpDigital",
      description:
        "Studio digitale a Bolzano, Alto Adige: siti web, social e ads, gestionali su misura e automazioni per professionisti e aziende. In italiano, tedesco e inglese.",
    },
    about: {
      title: "Chi siamo | AuralpDigital, web agency a Bolzano",
      description:
        "I fondatori di AuralpDigital, studio digitale indipendente a Bolzano, Alto Adige. Strategia, design e sviluppo seguiti dalle stesse persone, dalla prima call al lancio.",
    },
    faq: {
      title: "Domande frequenti: prezzi, tempi e servizi | AuralpDigital",
      description:
        "Quanto costa un sito, quanto tempo serve, dove lavoriamo: le risposte di AuralpDigital, web agency a Bolzano. Progetti da 1.500 €, call iniziale gratuita.",
    },
  },

  nav: {
    items: {
      projects: "Progetti",
      services: "Cosa Facciamo",
      method: "Come Lavoriamo",
      about: "Chi Siamo",
      faq: "FAQ",
    },
    aria: {
      projects: "Vai ai progetti",
      services: "Scopri cosa facciamo",
      method: "Scopri come lavoriamo",
      about: "Scopri chi siamo",
      faq: "Domande frequenti",
    },
    socialsLabel: "Social",
    write: "Scrivici",
    place: "Bolzano, Alto Adige\nItalia, 39100",
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
    title: "Domande frequenti",
    subtitle:
      "Tutto quello che ti serve sapere prima di iniziare un progetto digitale con AuralpDigital.",
    categories: [
      {
        name: "Progetti",
        items: [
          {
            q: "Che tipo di siti realizzate?",
            a: "Siti vetrina, landing page, e-commerce leggeri e piattaforme su misura. Ogni progetto nasce su codice pulito e veloce, pensato per convertire, senza template generici.",
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
            a: "Sì. Dopo il lancio restiamo a disposizione per aggiornamenti, modifiche ed evoluzioni del sito.",
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
            a: "I nostri progetti partono da 1.500 €. Il prezzo finale dipende da pagine, contenuti e funzionalità: dopo la prima call, che è gratuita, ricevi un preventivo preciso, senza costi nascosti.",
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
            q: "Lavorate solo in Alto Adige?",
            a: "No. Siamo a Bolzano e seguiamo clienti in tutto l'Alto Adige, da Merano a Bressanone, da Brunico alla Val Gardena, ma anche in Trentino, Veneto, Lombardia e nel resto d'Italia. Parliamo italiano, tedesco e inglese, quindi lavoriamo anche con clienti in Austria, Germania e Svizzera. Da remoto, oppure di persona quando serve.",
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
      l2: "che *portano*",
      l3: "clienti.",
      enter: "Scorri ed entra nella valle",
      // IL VIAGGIO — la camera vola da Bolzano allo Sciliar (lo stesso che fa
      // da fondale a "Il punto", subito dopo): le tappe sono luoghi veri, non
      // servizi, così la hero non anticipa nulla delle sezioni successive.
      // Nomi propri: restano come sui cartelli (it/de).
      stops: [
        { name: "Fiè allo Sciliar", alt: "880 m" },
        { name: "Castelrotto", alt: "1.060 m" },
        { name: "Alpe di Siusi", alt: "1.850 m" },
      ],
      summit: { name: "Sciliar", alt: "2.563 m" },
    },
    services: {
      // COSA FACCIAMO — tre servizi, uno per ogni dolore nominato in "Il
      // punto" (Google → siti, DM → social, a qualsiasi ora → gestionali).
      // Descrizioni di lunghezza simile: il palco non cambia altezza tra una
      // scena e l'altra. `name` tondo + `nameEm` corsivo blu.
      // `short` = etichetta nella barra di navigazione; `tags` = tre
      // etichette sotto la descrizione; `fix` = la notifica di "Il punto"
      // RISOLTA, che compare sull'angolo della card (decorativa).
      kicker: "Servizi",
      link: "Parliamone",
      items: [
        {
          name: "Siti web",
          nameEm: "che convertono.",
          desc: "Siti veloci e ben posizionati su Google e nelle ricerche AI, costruiti per accompagnare chi arriva fino alla richiesta di contatto o alla prenotazione.",
          short: "Siti web",
          tags: ["SEO e ricerca AI", "Prenotazioni online", "Veloci su mobile"],
          fix: { title: "Google", body: "Il primo risultato sei tu" },
        },
        {
          name: "Social & Ads",
          nameEm: "che vendono.",
          desc: "Contenuti coerenti con il tuo brand e campagne rivolte alle persone giuste, con risultati misurati ogni mese. Le richieste arrivano già in ordine.",
          short: "Social & Ads",
          tags: ["Contenuti", "Campagne Ads", "Clienti pronti a comprare"],
          fix: { title: "Messaggio diretto", body: "Prenotazione confermata" },
        },
        {
          name: "Gestionali",
          nameEm: "su misura.",
          desc: "Prenotazioni, contatti e clienti in un unico strumento, con risposte automatiche quando non puoi rispondere tu. Meno lavoro manuale e nessuna richiesta persa.",
          short: "Gestionali",
          tags: ["Agenda e clienti", "Risposte automatiche", "Tutto in un posto"],
          fix: { title: "Chiamata delle 22:47", body: "Risposta automatica inviata" },
        },
      ],
    },
    projects: {
      title: "Progetti online",
      sub: "Alcuni dei nostri lavori",
      soon: "In arrivo",
      soonSub: "Il prossimo è in cantiere",
      create: "Parliamo del tuo progetto",
      visit: "Apri il sito",
    },
    flow: {
      kicker: "Come lavoriamo",
      title: "Un metodo *in quattro fasi.*",
      lead: "Dalla prima call alla messa online sai sempre a che punto siamo, su cosa stiamo lavorando e cosa riceverai.",
      card: { phase: "Fase", get: "Cosa ricevi" },
      // Sito di esempio che si costruisce fase per fase (MethodRoom).
      demo: {
        tag: "Sito di esempio",
        hint: "Passa il mouse sul sito: guarda com'è fatto dentro",
        brand: "La tua baita",
        url: "latuabaita.it",
        nav: ["Camere", "Cucina", "Esperienze"],
        book: "Prenota",
        heroTitle: "Vacanze lente, in alta quota.",
        heroSub: "Tre camere, una cucina vera, il silenzio.",
        heroCta: "Prenota il soggiorno",
        notes: ["Clienti: famiglie e coppie", "Obiettivo: più prenotazioni dirette", "12 concorrenti in zona, analizzati"],
        palette: "Prova tu: scegli il colore",
        comment: "Il titolo un po' più grande?",
        reply: "Fatto!",
        scores: ["Velocità", "SEO", "Accessibilità"],
        devices: "Provato su telefono, tablet e computer",
        live: "Online",
        visits: "Questo mese",
        growth: "richieste in più",
        toast: "Nuova richiesta di prenotazione",
        now: "adesso",
      },
      items: [
        {
          title: "Ascolto",
          titleEm: "e analisi.",
          text: "Prima di progettare ti ascoltiamo: chi sono i tuoi clienti, cosa cercano, come lavori oggi. Poi analizziamo i concorrenti nella tua zona.",
          tag: "Punto di partenza",
          deliverable: "Un piano su misura, con tempi e costi chiari",
        },
        {
          title: "Design",
          titleEm: "su misura.",
          text: "Ti mostriamo come sarà il sito prima di costruirlo: pagine, testi e grafica. Lo perfezioniamo insieme finché non ti convince del tutto.",
          tag: "Anteprima completa",
          deliverable: "L'anteprima completa del sito",
        },
        {
          title: "Sviluppo",
          titleEm: "e test.",
          text: "Sviluppiamo un sito veloce, sicuro e facile da usare. Prima della pubblicazione lo testiamo pagina per pagina su telefoni e computer reali.",
          tag: "Controllo qualità",
          deliverable: "Il sito pronto, controllato in ogni dettaglio",
        },
        {
          title: "Lancio",
          titleEm: "e crescita.",
          text: "Pubblichiamo il sito e continuiamo a seguirlo: ogni mese analizziamo visite e contatti e miglioriamo ciò che porta più clienti.",
          tag: "Supporto continuo",
          deliverable: "Un report mensile chiaro e leggibile",
        },
      ],
    },
    point: {
      // IL PUNTO — subito dopo la hero, racconto in tre tempi dentro un pin
      // (regia in main.ts): il LAVORO (lead), il CAOS (but + pains, con le
      // notifiche che si accumulano ai lati), la SVOLTA (turn + turnSub, con
      // la notifica "ok" che chiude il caos).
      // **Parole chiave**: evidenziatore nel problema, blu nella svolta.
      lead: "Fai un lavoro eccellente.",
      but: "Ma i clienti…",
      pains: [
        "ti scrivono **in DM**,",
        "ti chiamano **a qualsiasi ora**",
        "e alla fine prenotano da chi trovano **prima su Google**.",
      ],
      turn: "Costruiamo **il sistema** che li porta da te.",
      turnSub: "Anche quando sei impegnato con il tuo lavoro.",
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
      headline: "Raccontaci *il tuo progetto.*",
      sub: "Tre domande veloci per capire di cosa hai bisogno. Poi scegli tu se prenotare una call gratuita di 30 minuti o scriverci direttamente.",
    },
  },

  contactForm: {
    // FORM A PASSI — le domande si aprono una dopo l'altra: servizio →
    // profilo → canale (call con calendario, oppure WhatsApp/email).
    // `value` resta fisso in tutte le lingue: è ciò che arriva nel messaggio.
    card: {
      title: "Brief di progetto",
      meta: "3 domande · 1 minuto",
      steps: ["Servizio", "Profilo", "Contatto"],
      reply: "Ti rispondiamo personalmente entro 24 ore",
      perks: ["Gratis", "Senza impegno"],
    },
    steps: {
      service: { title: "Cosa vuoi creare?", hint: "Anche più di una risposta" },
      profile: { title: "Per chi è il progetto?", hint: "Così prepariamo la proposta giusta" },
      channel: { title: "Come preferisci sentirci?", hint: "In entrambi i casi ti rispondiamo personalmente" },
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
      write: { label: "Scrivici subito", desc: "Su WhatsApp o via email" },
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
      addMessage: "Messaggio",
      messagePh: "Due righe sul progetto (facoltativo)",
    },
    nav: { back: "Indietro", next: "Avanti" },
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
    tagline: "Siti web, social e gestionali\nprogettati in Alto Adige.",
    menuLabel: "Menu",
    links: {
      projects: "Progetti",
      services: "Cosa facciamo",
      method: "Come lavoriamo",
      about: "Chi siamo",
      contact: "Contatti",
    },
    contactLabel: "Contatti",
    muted: "39100 Bolzano · Alto Adige, Italia",
    location: "Bolzano, Alto Adige",
    madeWith: "Fatto con cura",
    whatsapp: "WhatsApp",
    email: "Email",
    backToTop: "Torna su",
  },

  about: {
    hero: {
      badge: "Chi siamo",
      status: "Disponibili per nuovi progetti",
      title: "Le persone\ndietro *lo studio.*",
      sub: "Uno studio digitale indipendente in Alto Adige, fondato da due persone. Strategia, design e sviluppo li seguiamo direttamente noi.",
      cta: "Contattaci",
      meet: "Conoscici",
      hint: "Passa il cursore sulle foto",
      hintTouch: "Tocca le foto",
    },
    manifesto: {
      kicker: "La differenza",
      chain: {
        before: "Di solito",
        after: "Con noi",
        beforeNote: "Ogni richiesta passa di mano in mano.",
        afterNote: "Parli direttamente con chi progetta e sviluppa.",
        you: "Tu",
        us: "Alice & Julian",
        usShort: "Noi",
        hops: ["Account", "PM", "Freelance"],
      },
      statement: "Pochi progetti alla volta, *seguiti per intero.*",
      facts: [
        { n: 0, label: "intermediari", text: "Parli direttamente con chi progetta e sviluppa. Le decisioni sono rapide e niente va perso." },
        { n: 1, label: "squadra", text: "Lo stesso team segue il progetto dall'analisi al lancio, e anche dopo." },
        { n: 2, label: "fondatori", text: "Lavoriamo entrambi su ogni progetto e lo controlliamo prima che vada online." },
      ],
    },
    duo: {
      kicker: "I fondatori",
      title: "Chi segue *il tuo progetto.*",
      lead: "Siamo due co-founder con competenze complementari: strategia e sviluppo da una parte, design e contenuti dall'altra. Seguiamo ogni progetto insieme, senza affidarlo ad altri.",
    },
    people: [
      {
        title: "Co-founder",
        area: "Strategia & Sviluppo",
        bio: "Julian si occupa di strategia e sviluppo. Definisce la struttura di ogni progetto, dal posizionamento al lancio, e realizza siti e gestionali con tecnologie moderne e strumenti di AI.",
        quote: "Un sito vale quanto i clienti *che ti porta.*",
        focus: ["Strategia digitale", "Sviluppo web", "SEO + GEO", "AI & automazioni"],
      },
      {
        title: "Co-founder",
        area: "Design & Contenuti",
        bio: "Alice si occupa di design e contenuti. Cura identità visiva, interfacce, fotografia e testi, perché ogni progetto parli in modo chiaro al pubblico giusto.",
        quote: "L'immagine di un brand *nasce dai dettagli.*",
        focus: ["Art direction", "UI & visual design", "Contenuti & social", "Fotografia"],
      },
    ],
    journey: {
      kicker: "Il percorso",
      lead: "Quattro tappe che raccontano come siamo arrivati fin qui.",
      start: "Scorri per iniziare",
      stops: "Le tappe",
      outro: { kicker: "Il prossimo passo", title: "Costruiamolo *insieme.*", cta: "Inizia un progetto" },
      title: "Come è nato *lo studio.*",
      steps: [
        {
          year: "Le basi",
          kicker: "La formazione",
          title: "Università.",
          text: "Il nostro metodo nasce dagli studi universitari: analisi, ricerca e spirito critico. Lo applichiamo a ogni progetto e continuiamo ad aggiornarci.",
        },
        {
          year: "L'inizio",
          kicker: "I primi progetti",
          title: "I primi clienti.",
          text: "I primi siti per attività locali in Alto Adige ci hanno mostrato cosa serve davvero a un professionista: un sito che porti richieste concrete e clienti nuovi.",
        },
        {
          year: "Oggi",
          kicker: "Lo studio",
          title: "AuralpDigital.",
          text: "Oggi AuralpDigital è uno studio indipendente che unisce strategia, design e sviluppo. Usiamo l'intelligenza artificiale per lavorare più velocemente, senza abbassare la qualità.",
        },
        {
          year: "Domani",
          kicker: "La direzione",
          title: "Sempre aggiornati.",
          text: "Studiamo e testiamo le nuove tecnologie prima di proporle. Nei progetti dei clienti entra solo ciò che ha dimostrato di funzionare.",
        },
      ],
    },
    outro: {
      names: "Un unico team, *dall'inizio alla fine.*",
      cta: "Parliamo del tuo progetto",
    },
    cta: {
      kicker: "Iniziamo",
      title: "Ora che ci conosci, *parliamo del tuo progetto.*",
      sub: "Una consulenza gratuita di 30 minuti, senza impegno, per capire insieme obiettivi, tempi e budget.",
      btn: "Compila il form",
      mail: "oppure scrivici a hello@auralpdigital.com",
      foot: ["Risposta entro 24 ore", "Senza impegno", "Budget chiaro fin da subito"],
    },
  },
};

export default it;
