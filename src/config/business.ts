// DATI DELL'ATTIVITÀ: unica fonte di verità per SEO e GEO.
// Li usano i dati strutturati (JSON-LD in BaseLayout), sitemap, robots e
// llms.txt. Devono restare COERENTI con i testi visibili del sito: Google e i
// motori AI premiano (e citano) solo i fatti che trovano uguali ovunque.
// Quando arrivano P.IVA, LinkedIn, Google Business Profile ecc. si aggiungono
// qui (vedi i campi commentati) e tutto il resto si aggiorna da solo.
import { EMAIL, PHONE } from "./contact";

export const BUSINESS = {
  name: "AuralpDigital",
  // legalName: "",
  // vatID: "",
  foundingDate: "2026",
  email: EMAIL,
  phone: PHONE,
  priceFrom: 1500, // EUR, i progetti partono da qui (coerente con le FAQ "Prezzi")
  address: {
    locality: "Bolzano",
    region: "Trentino-Alto Adige",
    postalCode: "39100",
    country: "IT",
  },
  // Centro di Bolzano: niente indirizzo civico, solo la città.
  geo: { lat: 46.4983, lng: 11.3548 },
  sameAs: [
    "https://www.instagram.com/auralpdigital/",
    // "https://www.linkedin.com/company/…",
    // "https://g.page/…" (Google Business Profile)
  ],
  founders: ["Julian", "Alice"],
  languages: ["it", "de", "en"],
} as const;

// Aree servite, dalla più vicina alla più lontana. Nomi nella forma ufficiale
// locale (Bozen/Bolzano: in JSON-LD va il nome italiano, l'alternativo nelle
// descrizioni in tedesco).
export const AREAS = {
  southTyrol: [
    "Bolzano", "Merano", "Bressanone", "Brunico", "Laives", "Appiano sulla Strada del Vino",
    "Lana", "Caldaro sulla Strada del Vino", "Vipiteno", "Silandro", "Egna", "Ortisei",
    "Val Gardena", "Val Badia", "Val Pusteria", "Val Venosta",
  ],
  northItaly: [
    "Trento", "Rovereto", "Riva del Garda", "Verona", "Vicenza", "Padova", "Venezia",
    "Treviso", "Belluno", "Udine", "Trieste", "Brescia", "Bergamo", "Milano",
  ],
  abroad: ["Innsbruck", "Lienz", "Salzburg", "Wien", "München", "Zürich"],
  regions: ["Alto Adige", "Trentino", "Veneto", "Friuli-Venezia Giulia", "Lombardia", "Tirol"],
  countries: ["Italy", "Austria", "Germany", "Switzerland", "Liechtenstein", "San Marino"],
} as const;
