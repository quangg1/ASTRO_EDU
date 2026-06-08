const ASSISTANT_LEAK_RE = /<\/?\s*assistant\s*>|<\|[^|>]{1,40}\|>/gi;

function lineLooksLikeMarkdownTable(line) {
  if (!line.includes('|')) return false;
  const pipeCount = (line.match(/\|/g) || []).length;
  return line.includes('---') || line.includes(':---') || line.includes('---:') || pipeCount >= 4;
}

function peelTitleBeforeMarkdownTable(line) {
  const trimmedStart = line.trimStart();
  if (trimmedStart.startsWith('|') || !lineLooksLikeMarkdownTable(line)) return line;
  const firstPipe = line.indexOf('|');
  if (firstPipe <= 0) return line;
  const title = line.slice(0, firstPipe).trim();
  const tablePart = line.slice(firstPipe).trim();
  if (!title || !tablePart) return line;
  return `${title}\n\n${tablePart}`;
}

function unfoldCollapsedMarkdownTables(text) {
  const s = String(text || '');
  if (!s.includes('|')) return s;
  const out = [];
  for (const line of s.split('\n')) {
    if (!line.includes('|')) {
      out.push(line);
      continue;
    }
    if (!lineLooksLikeMarkdownTable(line)) {
      out.push(line);
      continue;
    }
    let row = peelTitleBeforeMarkdownTable(line);
    if (row.includes('\n\n')) {
      out.push(...row.split('\n'));
      continue;
    }
    row = row.replace(/\|{2,}/g, '|\n|');
    row = row.replace(/\|\s+\|/g, '|\n|');
    out.push(...row.split('\n'));
  }
  return out.join('\n');
}

function sanitizeAssistantContent(text) {
  return unfoldCollapsedMarkdownTables(
    String(text || '')
      .replace(ASSISTANT_LEAK_RE, '')
      .trim(),
  );
}

module.exports = {
  unfoldCollapsedMarkdownTables,
  sanitizeAssistantContent,
};
