#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const schema = JSON.parse(
  readFileSync(join(root, 'shared/agent/agentToolSchema.json'), 'utf8'),
);
const py = readFileSync(join(root, 'services/ai/agent_tools.py'), 'utf8');

const schemaNames = new Set(schema.tools.map((t) => t.name));
const pyNames = new Set([...py.matchAll(/"name":\s*"([a-z_]+)"/g)].map((m) => m[1]));

const coreTools = [
  'open_lesson',
  'open_learning_path_lesson',
  'go_to_explore',
  'navigate_to_narrative',
  'suggest_depth_switch',
  'highlight_concept_in_map',
  'show_related_lessons',
  'start_recall_quiz',
  'open_courses',
  'open_dashboard',
  'open_my_courses',
];

const violations = [];
for (const n of coreTools) {
  if (!schemaNames.has(n)) violations.push(`schema missing: ${n}`);
  if (!pyNames.has(n)) violations.push(`agent_tools.py missing: ${n}`);
}

if (violations.length) {
  console.error('Agent tool schema drift:\n' + violations.join('\n'));
  process.exit(1);
}
console.log(`Agent tool schema OK (${schemaNames.size} tools in schema)`);
