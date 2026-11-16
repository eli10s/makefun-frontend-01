// A small, safe Markdown renderer for bounty descriptions and rules.
// Supports headings, bold, italic, inline code, fenced code, links, lists,
// quotes and rules. Everything else stays plain text.
//
// Safety first: the input is HTML-escaped before anything else runs, so no
// markup from the API can ever become a tag. Links survive only when they
// point at http(s), a path on this site, or an anchor.

import { esc } from './text.js';

function safeLink(raw) {
  const href = String(raw || '').trim();
  if (/^(https?:\/\/|\/[^/]|#)/i.test(href)) return href;
  return null;
}

function inlineMd(text) {
  // Code spans first, parked under placeholders so nothing inside them
  // is reinterpreted as bold, italic or a link.
  const parked = [];
  let out = text.replace(/`([^`\n]+)`/g, (_, code) => {
    parked.push(code);
    return `@@CODE${parked.length - 1}@@`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const safe = safeLink(href);
    return safe ? `<a href="${esc(safe)}" rel="noopener">${label}</a>` : label;
  });
  out = out.replace(/@@CODE(\d+)@@/g, (_, i) => `<code>${parked[Number(i)]}</code>`);
  return out;
}

/** Render Markdown text to HTML. Empty input renders as an empty string. */
export function renderMd(input) {
  const src = String(input ?? '');
  if (!src.trim()) return '';
  const lines = esc(src).split('\n');
  const html = [];
  let listKind = null; // 'ul' | 'ol' | null
  let para = [];
  let fenced = false;

  const closeList = () => {
    if (listKind) { html.push(`</${listKind}>`); listKind = null; }
  };
  const flushPara = () => {
    if (para.length) { html.push(`<p>${inlineMd(para.join(' '))}</p>`); para = []; }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (fenced) {
        html.push('</code></pre>');
        fenced = false;
      } else {
        flushPara(); closeList();
        html.push('<pre><code>');
        fenced = true;
      }
      continue;
    }
    if (fenced) { html.push(`${line}\n`); continue; }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara(); closeList();
      const level = heading[1].length + 1; // page owns h1, so # becomes h2
      html.push(`<h${level}>${inlineMd(heading[2].trim())}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      flushPara();
      const kind = bullet ? 'ul' : 'ol';
      if (listKind !== kind) { closeList(); html.push(`<${kind}>`); listKind = kind; }
      html.push(`<li>${inlineMd((bullet || ordered)[1])}</li>`);
      continue;
    }
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      flushPara(); closeList();
      html.push(`<blockquote><p>${inlineMd(quote[1])}</p></blockquote>`);
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) { flushPara(); closeList(); html.push('<hr>'); continue; }
    if (!line.trim()) { flushPara(); closeList(); continue; }
    para.push(line.trim());
  }
  if (fenced) html.push('</code></pre>');
  flushPara(); closeList();
  return html.join('\n');
}
