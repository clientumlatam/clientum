function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>');
}

export function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCode = false;
  let inList = false;
  let tableRows: string[] = [];

  const flushList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  const flushTable = () => {
    if (tableRows.length) {
      out.push('<div class="md-table-wrap"><table class="md-table">');
      tableRows.forEach((r, i) => {
        const cells = r.split("|").map(c => c.trim()).filter((_, ci) => ci > 0 && ci < r.split("|").length - 1);
        if (i === 0) {
          out.push("<thead><tr>" + cells.map(c => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>");
        } else if (i === 1 && cells.every(c => /^[-:]+$/.test(c))) {
          // separator row — skip
        } else {
          out.push("<tr>" + cells.map(c => `<td>${inline(c)}</td>`).join("") + "</tr>");
        }
      });
      out.push("</tbody></table></div>");
      tableRows = [];
    }
  };

  for (const raw of lines) {
    const line = raw;

    // code fence
    if (line.startsWith("```")) {
      flushList(); flushTable();
      if (inCode) { out.push("</code></pre>"); inCode = false; }
      else { const lang = line.slice(3).trim(); out.push(`<pre class="md-code"><code${lang ? ` class="lang-${lang}"` : ""}>`); inCode = true; }
      continue;
    }
    if (inCode) { out.push(esc(line)); continue; }

    // table
    if (line.startsWith("|")) {
      flushList();
      tableRows.push(line);
      continue;
    } else {
      flushTable();
    }

    // hr
    if (/^---+$/.test(line.trim())) { flushList(); out.push('<hr class="md-hr" />'); continue; }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      flushList();
      const level = h[1].length;
      out.push(`<h${level} class="md-h${level}">${inline(h[2])}</h${level}>`);
      continue;
    }

    // blockquote
    if (line.startsWith("> ")) {
      flushList();
      out.push(`<blockquote class="md-blockquote">${inline(line.slice(2))}</blockquote>`);
      continue;
    }

    // checkbox list item
    const cb = line.match(/^(\s*)-\s+\[([ xX])\]\s+(.*)/);
    if (cb) {
      if (!inList) { out.push('<ul class="md-list md-checklist">'); inList = true; }
      const checked = cb[2].toLowerCase() === "x";
      const indent = cb[1].length > 0 ? " style=\"margin-left:1.5rem\"" : "";
      const priorityMatch = cb[3].match(/^(🔴|🟠|🟡|🟢)/);
      const pClass = priorityMatch
        ? { "🔴": "pri-red", "🟠": "pri-orange", "🟡": "pri-yellow", "🟢": "pri-green" }[priorityMatch[1]] ?? ""
        : "";
      out.push(
        `<li class="md-check-item ${checked ? "checked" : "unchecked"} ${pClass}"${indent}>` +
        `<span class="check-box">${checked ? "✓" : ""}</span>` +
        `<span class="check-text">${inline(cb[3])}</span></li>`
      );
      continue;
    }

    // regular list item
    const li = line.match(/^(\s*)-\s+(.*)/);
    if (li) {
      if (!inList) { out.push('<ul class="md-list">'); inList = true; }
      const indent = li[1].length > 0 ? " style=\"margin-left:1.5rem\"" : "";
      out.push(`<li class="md-li"${indent}>${inline(li[2])}</li>`);
      continue;
    }

    flushList();

    // blank line
    if (!line.trim()) { out.push('<div class="md-spacer"></div>'); continue; }

    // paragraph
    out.push(`<p class="md-p">${inline(line)}</p>`);
  }

  flushList();
  flushTable();
  if (inCode) out.push("</code></pre>");

  return out.join("\n");
}
