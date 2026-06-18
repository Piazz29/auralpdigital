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
      info: "Info",
    },
    aria: {
      projects: "Go to projects",
      services: "Discover what we do",
      about: "Find out who we are",
      info: "Information and contact",
    },
    socialsLabel: "Social",
    write: "Write to us",
    place: "South Tyrol\nItaly, 39100",
    toggleOpen: "Menu",
    toggleClose: "Close",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    langLabel: "Language",
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
    problem: {
      kicker: "The point",
      // Type-cloud: vedi it.ts per la forma. tone = colore, size = scala.
      cloud: [
        { text: "A site", tone: "ink", size: "m" },
        { text: "that doesn't bring clients", tone: "ink", size: "xl" },
        { text: "is a cost,", tone: "ink", size: "l" },
        { text: "not an investment.", tone: "ink", size: "m" },
        { text: "We build systems", tone: "accent", size: "xl" },
        { text: "that turn", tone: "accent", size: "m" },
        { text: "searchers", tone: "accent", size: "l" },
        { text: "into bookers.", tone: "accent", size: "xl" },
      ],
    },
    services: {
      kicker: "What we do",
      title: "Services that make you grow.",
      link: "Let's talk",
      scroll: "Scroll",
      items: [
        {
          name: "Websites",
          nameEm: "that convert.",
          desc: "Ultra-modern, fast and flawless on mobile. Optimized for Google and for AI search (SEO + GEO), with built-in artificial intelligence and every detail designed to turn visitors into clients.",
          points: [
            "First impression in under 3 seconds",
            "Found on Google and on AI",
            "Every section drives action",
          ],
        },
        {
          name: "Management systems",
          nameEm: "built to fit.",
          desc: "Systems built around your processes: centralized data, always under control, every lead followed to the end. AI-powered, to get more done in less time.",
          points: [
            "One place for all your data",
            "No lead left half-done",
            "Hours less manual work",
          ],
        },
        {
          name: "Social",
          nameEm: "that sells.",
          desc: "Strategy and content to grow organic traffic, targeted ad campaigns to turn it into clients: your brand in front of the right people, at the right time.",
          points: [
            "Content that stops the scroll",
            "Ads aimed at buyers",
            "Clear numbers, every month",
          ],
        },
      ],
    },
    projects: {
      kicker: "Real results",
      title: "What we've created.",
      link: "The next one is yours",
      previewLabel: "Preview",
      items: [
        {
          type: "Beauty · Permanent Make-up",
          desc: "Photography-first editorial site for a permanent make-up studio.",
          cta: "Open the site",
        },
        {
          type: "Tattoo Studio",
          desc: "Dark-luxe identity with scroll-driven motion for a tattoo studio.",
          cta: "Open the site",
        },
        {
          title: "The",
          titleEm: "next one.",
          type: "Open spot",
          desc: "This spot is open: the next case study could be yours.",
          cta: "Start here",
        },
      ],
    },
    aboutTeaser: {
      kicker: "About us",
      statement:
        "An independent studio that blends *academic rigor* with next-generation tools: every project handled by *the same hands*, from first sketch to launch",
    },
    contact: {
      kicker: "Let's start",
      headline: "Let's build your *growth system.*",
      sub: "A free 30-minute consultation: no commitment, just clear ideas on how to grow your business.",
    },
  },

  contactForm: {
    asideLabel: "The consultation",
    asideTitle: "It all *starts here.*",
    steps: [
      "You write us a few lines about the project",
      "We reply within 24 hours",
      "Free 30-min call, zero commitment",
    ],
    asideNote: "Clear budgets from the start · No commitment",
    fields: {
      name: "Name",
      email: "Email",
      business: "Your business",
      project: "The project",
    },
    placeholders: {
      name: "What's your name",
      email: "Where we reply to you",
      business: "Studio, brand, industry…",
      project: "A couple of lines on what you have in mind.",
    },
    budgetLegend: "Indicative budget",
    budgetOptional: "— optional, in €",
    budgets: ["< 1.5k", "1.5–3k", "3–6k", "6k+", "Not sure yet"],
    submit: "Book the consultation",
    submitNote: "Reply within 24 hours",
    statusOpening:
      "Opening your email… if nothing happens, write to us at hello@auralpdigital.com",
    mail: {
      subject: "New consultation request",
      name: "Name",
      email: "Email",
      business: "Business",
      budget: "Indicative budget",
      projectHeading: "Project:",
      empty: "—",
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
  },

  about: {
    hero: {
      badge: "About us",
      title: "The people behind *the pixels.*",
      sub: "An independent two-person studio from South Tyrol. No middlemen: whoever replies to you is the one who designs and builds.",
      meta: [
        { label: "Base", value: "South Tyrol" },
        { label: "Team", value: "Two founders" },
        { label: "Method", value: "AI-augmented" },
      ],
    },
    manifesto: {
      kicker: "The manifesto",
      statement: "A small team with the right tools beats a whole agency.",
      notes: [
        "**Fewer hand-offs.** One voice, from sketch to launch.",
        "**More care.** Every detail passes under our eyes twice.",
        "*Frontier technology* in every line, never for show — only when it works for you.",
      ],
    },
    duo: {
      kicker: "The duo",
      title: "Julian *&* Alice.",
    },
    people: [
      {
        role: "Co-founder — Strategy & Development",
        bio: "Strategy, code and systems. Julian designs the architecture of every project — from positioning to deploy — and builds sites and management systems with a modern stack and an AI-powered workflow. If something can be measured, he measures it.",
        focus: ["Digital strategy", "Web development", "SEO + GEO", "AI & automation"],
      },
      {
        role: "Co-founder — Design & Content",
        bio: "Design, content and visual direction. Alice shapes brand identity: clean interfaces, curated photography and content that speaks to the right people in the right tone. If a detail is off, she sees it.",
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
