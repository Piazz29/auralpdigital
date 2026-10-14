// robots.txt — tutto indicizzabile, motori AI compresi (GEO): essere letti da
// GPTBot, ClaudeBot, PerplexityBot & co. è ciò che permette di essere citati
// nelle loro risposte. I bot sono elencati esplicitamente perché alcuni
// rispettano solo regole col proprio nome.
import type { APIRoute } from "astro";
import { siteOrigin } from "../lib/seo";

const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot-Extended", "Bingbot",
  "CCBot", "Meta-ExternalAgent", "Amazonbot", "DuckAssistBot", "MistralAI-User",
];

export const GET: APIRoute = ({ site }) => {
  const origin = siteOrigin(site);
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    ...AI_BOTS.flatMap((b) => [`User-agent: ${b}`, "Allow: /", ""]),
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
