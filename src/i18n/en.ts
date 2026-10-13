// EN — English translation. Same shape as it.ts (checked via `satisfies`).
// The region "Alto Adige" is localized as "South Tyrol".
const en = {
  meta: {
    home: {
      title: "AuralpDigital | Websites, social media and software in South Tyrol",
      description:
        "Digital studio in South Tyrol. Websites, social media and ad campaigns, custom software and automation for professionals and businesses that want more clients.",
    },
    about: {
      title: "About us | AuralpDigital",
      description:
        "The founders of AuralpDigital, an independent digital studio in South Tyrol. Strategy, design and development handled by the same people, from the first call to launch.",
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
            a: "Showcase sites, landing pages, lightweight e-commerce and custom platforms. Every project is built on clean, fast code designed to convert, with no generic templates.",
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
            a: "Yes. After launch we stay available for updates, changes and improvements to the site.",
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
      l2: "that *bring*",
      l3: "clients.",
      sub: "Websites, social media and software designed to turn visits into clients.",
      cta: "See our projects",
      scroll: "Scroll",
    },
    services: {
      // Three services (vedi it.ts).
      link: "Let's talk",
      items: [
        {
          name: "Websites",
          nameEm: "that convert.",
          desc: "Fast websites that rank well on Google and in AI search, built to guide visitors through to an enquiry or a booking.",
          short: "Websites",
          tags: ["SEO & AI search", "Online bookings", "Fast on mobile"],
          fix: { title: "Google", body: "The top result is you" },
        },
        {
          name: "Social & Ads",
          nameEm: "that sell.",
          desc: "Content that fits your brand and campaigns aimed at the right people, with results measured every month. Enquiries reach you already organised.",
          short: "Social & Ads",
          tags: ["Content", "Ad campaigns", "Ready-to-buy clients"],
          fix: { title: "Direct message", body: "Booking confirmed" },
        },
        {
          name: "Management systems",
          nameEm: "built to fit.",
          desc: "Bookings, contacts and clients in a single tool, with automatic replies when you can't answer yourself. Less manual work and no missed enquiries.",
          short: "Systems",
          tags: ["Calendar & clients", "Automatic replies", "All in one place"],
          fix: { title: "Call at 10:47 PM", body: "Automatic reply sent" },
        },
      ],
    },
    projects: {
      title: "Projects online",
      sub: "Some of our work",
      soon: "Coming soon",
      soonSub: "The next one is in the works",
      create: "Let's talk about your project",
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
      turnSub: "Even when you're busy with your own work.",
      pings: [
        { title: "Direct message", body: "Hi! Any slots on Saturday?" },
        { title: "Missed call", body: "Today, 10:47 PM" },
        { title: "Google", body: "The top result isn't you" },
      ],
      ok: { title: "New booking", body: "Confirmed automatically" },
    },
    contact: {
      kicker: "Let's start",
      headline: "Tell us about *your project.*",
      sub: "Three quick questions so we understand what you need. Then you choose whether to book a free 30-minute call or write to us directly.",
    },
  },

  contactForm: {
    card: {
      title: "Project brief",
      meta: "3 questions · 1 minute",
      steps: ["Service", "Profile", "Contact"],
      reply: "We reply personally within 24 hours",
      perks: ["Free", "No commitment"],
    },
    steps: {
      service: { title: "What do you want to create?", hint: "Pick as many as you like" },
      profile: { title: "Who is the project for?", hint: "So we can prepare the right proposal" },
      channel: { title: "How would you like to talk?", hint: "Either way, we reply personally" },
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
      write: { label: "Message us now", desc: "Via WhatsApp or email" },
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
      addMessage: "Message",
      messagePh: "A few lines about the project (optional)",
    },
    nav: { back: "Back", next: "Next" },
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
    tagline: "Websites, social media and software,\ndesigned in South Tyrol.",
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
      title: "The people\nbehind *the studio.*",
      sub: "An independent digital studio in South Tyrol, founded by two people. We handle strategy, design and development ourselves.",
      cta: "Contact us",
      meet: "Meet us",
      hint: "Hover over the photos",
      hintTouch: "Tap the photos",
    },
    manifesto: {
      kicker: "The manifesto",
      statement: "Few projects at a time, *followed all the way.*",
      facts: [
        { n: 0, label: "middlemen", text: "You talk directly to the people who plan and build. Decisions are quick and nothing gets lost." },
        { n: 1, label: "team", text: "The same team follows the project from analysis to launch, and beyond." },
        { n: 2, label: "founders", text: "We both work on every project and check it before it goes live." },
      ],
    },
    duo: {
      kicker: "The founders",
      title: "Who looks after *your project.*",
      lead: "We are two co-founders with complementary skills: strategy and development on one side, design and content on the other. We work on every project together and never pass it on.",
    },
    people: [
      {
        title: "Co-founder",
        area: "Strategy & Development",
        bio: "Julian looks after strategy and development. He defines the structure of every project, from positioning to launch, and builds websites and software with modern technology and AI tools.",
        quote: "A website is worth the clients *it brings you.*",
        focus: ["Digital strategy", "Web development", "SEO + GEO", "AI & automation"],
      },
      {
        title: "Co-founder",
        area: "Design & Content",
        bio: "Alice looks after design and content. She shapes each brand's visual identity, interfaces, photography and copy, so every project speaks clearly to the right audience.",
        quote: "A business's image *is built in the details.*",
        focus: ["Art direction", "UI & visual design", "Content & social", "Photography"],
      },
    ],
    journey: {
      kicker: "The journey",
      lead: "Four stops that tell how we got here.",
      start: "Scroll to begin",
      stops: "The stops",
      outro: { kicker: "The next step", title: "Let's build it *together.*", cta: "Start a project" },
      title: "How the studio *began.*",
      steps: [
        {
          year: "The basics",
          kicker: "The training",
          title: "University.",
          text: "Our method comes from our university studies: analysis, research and critical thinking. We apply it to every project and keep learning.",
        },
        {
          year: "The start",
          kicker: "The first projects",
          title: "The first clients.",
          text: "Our first websites for local businesses in South Tyrol showed us what professionals really need: a website that brings real enquiries and new clients.",
        },
        {
          year: "Today",
          kicker: "The studio",
          title: "AuralpDigital.",
          text: "Today AuralpDigital is an independent studio for strategy, design and development. We use artificial intelligence to work faster without lowering our standards.",
        },
        {
          year: "Tomorrow",
          kicker: "The direction",
          title: "Always up to date.",
          text: "We study and test new technologies before we offer them. Only what has proven to work makes it into our clients' projects.",
        },
      ],
    },
    flow: {
      kicker: "How we work",
      title: "A method *in four phases.*",
      lead: "From the first call to launch you always know where we are, what we're working on and what you'll receive.",
      card: { phase: "Phase", get: "What you get" },
      // Sito di esempio che si costruisce fase per fase (MethodRoom).
      demo: {
        tag: "Sample site",
        hint: "Hover over the site: see how it's built inside",
        brand: "Your Lodge",
        url: "yourlodge.com",
        nav: ["Rooms", "Kitchen", "Experiences"],
        book: "Book",
        heroTitle: "Slow holidays, up high.",
        heroSub: "Three rooms, real food, silence.",
        heroCta: "Book your stay",
        notes: ["Customers: families and couples", "Goal: more direct bookings", "12 local competitors, analysed"],
        palette: "Try it: pick the colour",
        comment: "Make the title a bit bigger?",
        reply: "Done!",
        scores: ["Speed", "SEO", "Accessibility"],
        devices: "Tested on phone, tablet and desktop",
        live: "Live",
        visits: "This month",
        growth: "more enquiries",
        toast: "New booking request",
        now: "just now",
      },
      items: [
        {
          title: "Listening",
          titleEm: "and analysis.",
          text: "Before we plan anything, we listen: who your customers are, what they look for, how you work today. Then we analyse the competitors in your area.",
          tag: "Starting point",
          deliverable: "A tailored plan with clear timing and costs",
        },
        {
          title: "Design",
          titleEm: "made to fit.",
          text: "We show you the website before we build it: pages, copy and visuals. We refine it together until you are fully convinced.",
          tag: "Full preview",
          deliverable: "A complete preview of the website",
        },
        {
          title: "Build",
          titleEm: "and testing.",
          text: "We build a website that is fast, secure and easy to use. Before it goes live we test it page by page on real phones and computers.",
          tag: "Quality control",
          deliverable: "The finished website, checked in every detail",
        },
        {
          title: "Launch",
          titleEm: "and growth.",
          text: "We publish the website and keep looking after it: every month we analyse visits and enquiries and improve what brings in the most customers.",
          tag: "Ongoing support",
          deliverable: "A clear, readable monthly report",
        },
      ],
    },
    outro: {
      names: "One team, *from start to finish.*",
      cta: "Let's talk about your project",
    },
    cta: {
      kicker: "Let's start",
      title: "Now that you know us, *let's talk about your project.*",
      sub: "A free, no-commitment 30-minute consultation to define goals, timing and budget together.",
      btn: "Fill in the form",
      mail: "or write to us at hello@auralpdigital.com",
      foot: ["Reply within 24 hours", "No commitment", "Clear budget from the start"],
    },
  },
};

export default en;
