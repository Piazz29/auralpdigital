// CONTATTI — unica fonte di verità per email e WhatsApp dello studio.
// Li usano la navbar (PillNav), il form a passi della home e il footer.

export const EMAIL = "hello@auralpdigital.com";

// TODO: numero WhatsApp reale (formato internazionale, solo cifre).
export const WHATSAPP_NUMBER = "390000000000";

// Endpoint per le prenotazioni della call (es. Formspree, Cal.com, una
// funzione serverless). Vuoto = il sito è statico e la richiesta parte come
// email precompilata (mailto). Valorizzato = POST JSON, niente client email.
export const BOOKING_ENDPOINT = "";

export const whatsappHref = (text = "") =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const mailHref = (subject = "", body = "") => {
  const q = [
    subject && `subject=${encodeURIComponent(subject)}`,
    body && `body=${encodeURIComponent(body)}`,
  ].filter(Boolean);
  return `mailto:${EMAIL}${q.length ? `?${q.join("&")}` : ""}`;
};
