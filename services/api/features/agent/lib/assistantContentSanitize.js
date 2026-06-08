const ASSISTANT_LEAK_RE = /<\/?\s*assistant\s*>|<\|[^|>]{1,40}\|>/gi;

function unfoldCollapsedMarkdownTables(text) {
  const s = String(text || '');
  if (!s.includes('|')) return s;
  return s
    .split('\n')
    .map((line) => {
      if (!line.includes('|')) return line;
      const pipeCount = (line.match(/\|/g) || []).length;
      const looksLikeTable =
        line.includes('---') || line.includes(':---') || line.includes('---:') || pipeCount >= 4;
      if (!looksLikeTable) return line;
      return line.replace(/\|\s+\|/g, '|\n|');
    })
    .join('\n');
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
