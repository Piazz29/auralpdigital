// EN — English translation. Same shape as it.ts (checked via `satisfies`).
// The region "Alto Adige" is localized as "South Tyrol".
const en = {
  meta: {
    home: {
      title: "AuralpDigital — Digital systems that bring clients",
      description:
        "Digital growth studio in South Tyrol. Premium websites, lead generation, ad campaigns, brand & social, automation, AI integration.",
    },
    about: {
      title: "About us — AuralpDigital",
      description:
        "The people behind AuralpDigital: an independent team in South Tyrol with a university background, next-generation tools and an AI-augmented workflow.",
    },
  },

  nav: {
    items: {
      projects: "Projects",
      services: "What We Do",
      about: "About Us",
      faq: "FAQ",
    },
    aria: {
      projects: "Go to projects",
      services: "Discover what we do",
      about: "Find out who we are",
      faq: "Frequently asked questions",
    },
    socialsLabel: "Social",
    write: "Write to us",
    place: "South Tyrol\nItaly, 39100",
    toggleOpen: "Menu",
    toggleClose: "Close",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    langLabel: "Language",
    mainLabel: "Main navigation",
    whatsapp: "WhatsApp",
    email: "Email",
    bookCall: "Book a call",
  },

  faq: {
    title: "Frequently Asked Questions",
    subtitle:
      "Everything you need to know before starting a digital project with AuralpDigital.",
    categories: [
      {
        name: "Projects",
        items: [
          {
            q: "What kind of websites do you build?",
            a: "Showcase sites, landing pages, lightweight e-commerce and custom platforms. Every project is built on clean, fast code designed to convert — not on generic templates.",
          },
          {
            q: "Do you only work with companies, or with professionals too?",
            a: "Both. We work with established companies, local businesses and individual professionals. What matters is having a clear goal to reach online.",
          },
          {
            q: "Can I request just a landing page?",
            a: "Yes. A single, well-built landing page is often the best way to launch a service or a campaign, and we treat it with the same care as a full website.",
          },
          {
            q: "Do you also redesign existing websites?",
            a: "Yes. We analyse the current site, understand what works and what holds results back, then rebuild it: we keep what has value and improve structure, speed and design.",
          },
        ],
      },
      {
        name: "Services",
        items: [
          {
            q: "Do you only handle the website, or the strategy too?",
            a: "We always start with strategy. First we define who you're speaking to and what action visitors should take, then we design accordingly. The website is the tool, not the starting point.",
          },
          {
            q: "Can you integrate booking systems, CRM or automations?",
            a: "Yes. We connect bookings, CRM, payments and automations so the site talks to the tools you already use, cutting down manual work.",
          },
          {
            q: "Do you also handle content, copy and visuals?",
            a: "Yes. We can take care of text, images and visual identity, so the message stays consistent across the whole site. If you already have material, we make the most of it.",
          },
          {
            q: "Do you offer support after launch?",
            a: "Yes. After launch we stay available for updates, changes and improvements. We don't disappear once the site is delivered.",
          },
        ],
      },
      {
        name: "Process",
        items: [
          {
            q: "How does a project start?",
            a: "With a free call to understand goals, context and timing. From there we prepare a clear proposal with scope, timeline and costs, before writing a single line of code.",
          },
          {
            q: "How long does it take to build a site?",
            a: "A landing page usually takes 1-2 weeks, a full website 3 to 6. The exact timeline depends on content and features, and we tell you before we start.",
          },
          {
            q: "What do you need from the client?",
            a: "Clear goals, any material you already have (text, logo, images) and a little time for feedback. We handle the rest and guide you step by step.",
          },
          {
            q: "Can I see a demo before deciding?",
            a: "Yes. During the project we work on a live preview you can visit at any time: you see the site take shape and there are no surprises at the end.",
          },
        ],
      },
      {
        name: "Pricing",
        items: [
          {
            q: "How much does a website cost?",
            a: "A landing page starts from a few hundred euros, a full website grows with pages and features. After the first call you get a precise quote, with no hidden costs.",
          },
          {
            q: "Why don't you have one fixed price for everyone?",
            a: "Because every project has different needs. A single price would make you pay for things you don't need: we build the quote around what you actually require.",
          },
          {
            q: "Can I start with a simpler version and expand it later?",
            a: "Absolutely. Many clients start with a solid base and grow it over time. We design the site so it can expand without rebuilding it from scratch.",
          },
          {
            q: "How does payment work?",
            a: "Usually a deposit upfront and the balance on delivery, with instalments for larger projects. We agree everything transparently before we begin.",
          },
        ],
      },
      {
        name: "Collaboration",
        items: [
          {
            q: "Do you also work remotely?",
            a: "Yes, we work remotely with clients across Italy. For those in South Tyrol we can also meet in person when it helps.",
          },
          {
            q: "How are revisions and feedback handled?",
            a: "At each stage we show you the work and gather your feedback in an orderly way, with defined review moments. No endless back-and-forth: clear steps and deadlines respected.",
          },
          {
            q: "Can I edit the site on my own after delivery?",
            a: "Yes, if you want. We can build it on a system that lets you update text and content yourself, and we show you how to do it.",
          },
          {
            q: "What happens after launch?",
            a: "You get a finished, documented site. From there you can continue on your own or rely on us for maintenance, improvements and new campaigns.",
          },
        ],
      },
    ],
    cta: {
      text: "Have a question that isn't listed here?",
      button: "Write to us directly",
    },
  },

  home: {
    hero: {
      badge: "Digital Growth Studio · South Tyrol",
      l1: "Digital systems",
      l2: "of the *next*",
      l3: "generation.",
      sub: "Websites, management systems and social that turn visitors into clients.",
      cta: "Explore our work",
      scroll: "Scroll",
    },
    services: {
      // Three services (vedi it.ts).
      link: "Let's talk",
      items: [
        {
          name: "Websites",
          nameEm: "that convert.",
          desc: "Found on Google and in AI search, fast to load and built to guide every visitor all the way to a booking. Your best salesperson, open 24 hours a day.",
          short: "Websites",
          tags: ["SEO & AI search", "Online bookings", "Fast on mobile"],
          fix: { title: "Google", body: "The top result is you" },
        },
        {
          name: "Social & Ads",
          nameEm: "that sell.",
          desc: "Content that stops the scroll and campaigns aimed at people ready to buy. Attention turns into bookings, not messages you have to chase one by one.",
          short: "Social & Ads",
          tags: ["Content", "Ad campaigns", "Ready-to-buy clients"],
          fix: { title: "Direct message", body: "Booked, no chasing" },
        },
        {
          name: "Management systems",
          nameEm: "built to fit.",
          desc: "Bookings, contacts and clients in one place, with automations that reply even when you can't. No request slips through, hours given back every week.",
          short: "Systems",
          tags: ["Calendar & clients", "Automatic replies", "All in one place"],
          fix: { title: "Call at 10:47 PM", body: "Automatic reply sent" },
        },
      ],
    },
    projects: {
      title: "Projects Online",
      sub: "Explore our work",
      soon: "Coming soon",
      soonSub: "The next one is in the works",
      create: "Create your project",
      visit: "Open the website",
    },
    point: {
      // Problem → turn (vedi it.ts).
      lead: "You do excellent work.",
      but: "But clients",
      pains: [
        "**DM you**,",
        "call **at all hours**",
        "and end up booking whoever they find **first on Google**.",
      ],
      turn: "We build **the system** that brings them to you.",
      turnSub: "And it works while you do.",
      pings: [
        { title: "Direct message", body: "Hi! Any slots on Saturday?" },
        { title: "Missed call", body: "Today, 10:47 PM" },
        { title: "Google", body: "The top result isn't you" },
      ],
      ok: { title: "New booking", body: "Confirmed automatically" },
    },
    contact: {
      kicker: "Let's start",
      headline: "Let's build your *growth system.*",
      sub: "Three quick questions and we already know how to help. Then it's up to you: a free 30-minute call or a direct message.",
    },
  },

  contactForm: {
    steps: {
      service: { title: "What do you want to create?", hint: "Pick as many as you like" },
      profile: { title: "Who is the project for?", hint: "So we can prepare the right proposal" },
      channel: { title: "How would you like to talk?", hint: "Your call — it's always the two of us replying" },
    },
    services: [
      { value: "web", label: "Website", desc: "Showcase, bookings, e-commerce" },
      { value: "social", label: "Social & Ads", desc: "Content and campaigns that sell" },
      { value: "gestionale", label: "Custom software", desc: "Clients, scheduling, automations" },
      { value: "unsure", label: "Not sure yet", desc: "You tell us" },
    ],
    profiles: [
      { value: "solo", label: "Just me", desc: "Freelancer or professional" },
      { value: "team", label: "Small team", desc: "2 to 10 people" },
      { value: "company", label: "Company", desc: "More than 10 people" },
      { value: "startup", label: "Just starting", desc: "New business or idea" },
    ],
    channels: {
      call: { label: "Book a call", desc: "30 free minutes, you pick day and time" },
      write: { label: "Message us now", desc: "WhatsApp or email, in one tap" },
    },
    calendar: {
      prev: "Previous month",
      next: "Next month",
      pickDay: "Pick a day to see the free slots.",
      timezone: "Italian time · 30 min",
    },
    fields: {
      name: "Name",
      email: "Email",
      namePh: "Your name",
      emailPh: "Where we send the invite",
      addMessage: "Add a message",
      messagePh: "A few lines about the project (optional)",
    },
    book: "Book the call",
    errors: {
      slot: "Pick a day and a time.",
      name: "Please enter your name.",
      email: "We need a valid email to send you the invite.",
    },
    done: {
      title: "Almost there.",
      text: "We've prepared the email with your request: hit Send and we'll confirm the invite within 24 hours.",
      addToCal: "Save it to your calendar",
      edit: "Change time",
    },
    direct: {
      whatsapp: "WhatsApp",
      whatsappNote: "We reply the same day",
      email: "Email",
      note: "The message is already written with your choices: just send it.",
    },
    msg: {
      hello: "Hi AuralpDigital!",
      interest: "I'm interested in",
      profile: "Profile",
      callSubject: "Call request",
      writeSubject: "New project",
      when: "When",
      name: "Name",
      email: "Email",
      message: "Message",
      calTitle: "Call with AuralpDigital",
    },
  },

  footer: {
    tagline: "Next-generation digital systems,\ndesigned in South Tyrol.",
    menuLabel: "Menu",
    links: {
      projects: "Projects",
      services: "What we do",
      about: "About us",
      contact: "Contact",
    },
    contactLabel: "Contact",
    muted: "South Tyrol, Italy · 39100",
    location: "South Tyrol, Italy",
    madeWith: "Made with care",
    whatsapp: "WhatsApp",
    email: "Email",
    backToTop: "Back to top",
  },

  about: {
    hero: {
      badge: "About us",
      status: "Available for new projects",
      title: "The people\nbehind *the pixels.*",
      sub: "An independent two-person studio from South Tyrol. Strategy, design and code under one roof.",
      cta: "Talk to us",
      meet: "Meet us",
      hint: "Hover and look behind the pixels",
      hintTouch: "Tap and look behind the pixels",
    },
    manifesto: {
      kicker: "The manifesto",
      statement: "A small team with the right tools beats *a whole agency.*",
      facts: [
        { n: 0, label: "middlemen", text: "Whoever replies to you is the one who designs and builds. No broken telephone." },
        { n: 1, label: "single voice", text: "From sketch to launch you always talk to the same two people." },
        { n: 2, label: "pairs of eyes", text: "Every detail passes through both of us before it goes live." },
      ],
    },
    duo: {
      kicker: "The duo",
      title: "Hello, *it's us.*",
      lead: "Two skill sets that fit together: one builds the systems, the other gives them shape. Together we cover the whole project, with no hand-offs.",
    },
    people: [
      {
        title: "Founder",
        area: "Strategy & Development",
        bio: "Strategy, code and systems. Julian designs the architecture of every project, from positioning to deploy, and builds sites and management systems with a modern stack and an AI-powered workflow.",
        quote: "If something can be measured, *I measure it.*",
        focus: ["Digital strategy", "Web development", "SEO + GEO", "AI & automation"],
      },
      {
        title: "Co-founder",
        area: "Design & Content",
        bio: "Design, content and visual direction. Alice shapes brand identity: clean interfaces, curated photography and content that speaks to the right people, in the right tone.",
        quote: "If a detail is off, *I see it.*",
        focus: ["Art direction", "UI & visual design", "Content & social", "Photography"],
      },
    ],
    journey: {
      kicker: "The journey",
      title: "From students *to studio.*",
      steps: [
        {
          year: "The basics",
          kicker: "The training",
          title: "University.",
          text: "The method is born here: analysis, research and critical thinking. University gave us the rigor we apply to every project today — and we never stopped studying.",
        },
        {
          year: "The spark",
          kicker: "The first projects",
          title: "The first line of code.",
          text: "The first sites for local businesses in South Tyrol. That's where we grasp something simple: professionals don't need a storefront, they need a system that brings clients.",
        },
        {
          year: "Today",
          kicker: "The studio",
          title: "AuralpDigital.",
          text: "An independent digital studio: strategy, design and technology under one roof, an AI-augmented workflow and a single standard — done right or done again.",
        },
        {
          year: "Tomorrow",
          kicker: "The direction",
          title: "Always one step ahead.",
          text: "Every new wave of technology is studied, tested and — only if it works — brought into our clients' projects. Ahead of the others, never at the expense of quality.",
        },
      ],
    },
    flow: {
      kicker: "How we work",
      title: "Humans at the helm, *AI in the engine room.*",
      lead: "From the first research to launch, every phase passes through our hands: AI speeds things up, the decisions are ours. Four steps, one standard.",
      hint: "Browse the cards",
      items: [
        {
          title: "Listening",
          titleEm: "and analysis.",
          text: "Before designing anything, we understand your market: who's searching, what they're searching for, who the competitors are. AI speeds up research and data analysis — we draw the conclusions, together with you.",
          tag: "Research",
        },
        {
          title: "Design",
          titleEm: "with intent.",
          text: "Every visual choice has a purpose: to guide the visitor toward an action. With generative tools we explore more directions in less time, then refine the right one by hand.",
          tag: "Art direction",
        },
        {
          title: "Development",
          titleEm: "no compromises.",
          text: "Modern, fast, accessible code. AI writes with us and reviews every line — but nothing goes live without passing under human eyes, on real devices.",
          tag: "Build",
        },
        {
          title: "Growth",
          titleEm: "you can measure.",
          text: "Launch is the beginning, not the end: data, tests and continuous optimization. Every month you know what changed, why, and what brings clients.",
          tag: "Optimization",
        },
      ],
    },
    outro: {
      names: "People, *not* agencies.",
      cta: "The same hands, from sketch to launch",
    },
    cta: {
      kicker: "Let's start",
      title: "Now that you know us, *let's talk about you.*",
      sub: "A free 30-minute consultation: no commitment, just clear ideas to grow your business.",
      btn: "Fill in the form",
      mail: "or write to us at hello@auralpdigital.com",
      foot: ["Reply within 24 hours", "No commitment", "Clear budgets from the start"],
    },
  },
};

export default en;
