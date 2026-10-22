// Lettere "a onda" per i cambi di Servizi e Come lavoriamo: il testo di un
// titolo viene diviso in parole (ognuna fa da maschera, .cr-w) e lettere
// (.cr-c, con il loro indice in --i). Le animazioni sono CSS (global.css,
// "LETTERE A ONDA"): qui solo la divisione, una volta.
export function splitChars(el: HTMLElement): HTMLElement[] {
  const chars: HTMLElement[] = [];
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((c) => {
      if (c.nodeType !== Node.TEXT_NODE) return walk(c);
      const frag = document.createDocumentFragment();
      (c.textContent ?? "").split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.append(part);
        const w = document.createElement("span");
        w.className = "cr-w";
        for (const ch of part) {
          const s = document.createElement("span");
          s.className = "cr-c";
          s.textContent = ch;
          s.style.setProperty("--i", String(chars.length));
          chars.push(s);
          w.append(s);
        }
        frag.append(w);
      });
      c.replaceWith(frag);
    });
  };
  walk(el);
  return chars;
}
