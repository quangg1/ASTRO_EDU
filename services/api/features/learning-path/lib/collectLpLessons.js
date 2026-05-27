const DEPTH_KEYS = ['beginner', 'explorer', 'researcher'];

/**
 * Duyệt mọi bài trong LP document (schema: node.depths.*).
 * @param {{ modules?: unknown[] } | null | undefined} doc
 * @returns {Array<{ mod: object, node: object, lesson: object, depth: string | null }>}
 */
function collectLpLessons(doc) {
  const out = [];
  for (const mod of doc?.modules || []) {
    for (const node of mod.nodes || []) {
      const depths = node.depths || {};
      for (const depth of DEPTH_KEYS) {
        for (const lesson of depths[depth] || []) {
          if (lesson?.id) out.push({ mod, node, lesson, depth });
        }
      }
      for (const lesson of node.lessons || []) {
        if (lesson?.id) out.push({ mod, node, lesson, depth: null });
      }
    }
  }
  return out;
}

module.exports = { collectLpLessons, DEPTH_KEYS };
