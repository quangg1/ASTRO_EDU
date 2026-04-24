function extractFirstJsonArray(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  const attempts = [];
  if (start >= 0 && end > start) attempts.push(candidate.slice(start, end + 1));
  attempts.push(candidate);
  for (const attemptRaw of attempts) {
    const attempt = attemptRaw
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
    try {
      const parsed = JSON.parse(attempt);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // try next attempt
    }
  }
  return null;
}

function extractFirstJsonObject(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const objStart = candidate.indexOf('{');
  const objEnd = candidate.lastIndexOf('}');
  const attempts = [];
  if (objStart >= 0 && objEnd > objStart) attempts.push(candidate.slice(objStart, objEnd + 1));
  attempts.push(candidate);
  for (const attemptRaw of attempts) {
    const attempt = attemptRaw
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // try next attempt
    }
  }
  return null;
}

module.exports = {
  extractFirstJsonArray,
  extractFirstJsonObject,
};
