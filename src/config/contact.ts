// CONTATTI — unica fonte di verità per email e WhatsApp dello studio.
// Li usano la navbar (PillNav), il form a passi della home e il footer.

export const EMAIL = "auralpdigital@outlook.com";

// Telefono in formato internazionale (E.164): lo usano i dati strutturati.
export const PHONE = "+393483165843";

// Numero WhatsApp (formato internazionale, solo cifre): lo stesso di PHONE.
export const WHATSAPP_NUMBER = PHONE.replace(/\D/g, "");

export const INSTAGRAM_URL = "https://www.instagram.com/auralpdigital/";

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
