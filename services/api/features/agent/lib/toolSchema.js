const path = require('path');
const fs = require('fs');

let cached;

function loadToolSchema() {
  if (cached) return cached;
  const schemaPath = path.join(__dirname, '../../../../../shared/agent/agentToolSchema.json');
  const raw = fs.readFileSync(schemaPath, 'utf8');
  cached = JSON.parse(raw);
  return cached;
}

function resolveToolName(name) {
  const schema = loadToolSchema();
  const n = String(name || '').trim();
  for (const t of schema.tools) {
    if (t.name === n) return t.name;
    if ((t.aliases || []).includes(n)) return t.name;
  }
  return n;
}

function toolsForTier(tier) {
  const schema = loadToolSchema();
  const names = new Set();
  for (const t of schema.tools) {
    if ((t.tierAllow || []).includes(tier)) {
      names.add(t.name);
      for (const a of t.aliases || []) names.add(a);
    }
  }
  return [...names];
}

function isToolAllowedForTier(toolName, tier) {
  const canonical = resolveToolName(toolName);
  const allowed = toolsForTier(tier);
  return allowed.includes(canonical) || allowed.includes(toolName);
}

module.exports = { loadToolSchema, toolsForTier, isToolAllowedForTier, resolveToolName };
