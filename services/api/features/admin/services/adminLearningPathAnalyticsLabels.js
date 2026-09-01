const DEPTH_LABEL_VI = {
  beginner: 'Cơ bản',
  explorer: 'Cơ chế',
  researcher: 'Chuyên sâu',
};

function humanizeSlug(raw) {
  const s = String(raw || '').trim();
  if (!s) return '—';
  if (s.includes(' ')) return s;
  return s
    .replace(/__/g, ' · ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function depthLabelVi(depth) {
  return DEPTH_LABEL_VI[String(depth || '').trim()] || null;
}

function parseLessonIdParts(lessonId) {
  const parts = String(lessonId || '')
    .split('__')
    .map((p) => p.trim())
    .filter(Boolean);
  const depth = parts.find((p) => DEPTH_LABEL_VI[p]) || null;
  const depthIdx = depth ? parts.indexOf(depth) : -1;
  return {
    parts,
    moduleId: parts[0] || null,
    nodeId: parts[1] || null,
    altNodeId: depthIdx > 2 ? parts[depthIdx - 1] : null,
    depth,
  };
}

/**
 * Resolve admin-friendly labels for a lesson row (fallback when lessonMap miss).
 */
function resolveLessonDisplay(lessonId, eventModuleId, eventNodeId, lookup) {
  const id = String(lessonId || '').trim();
  const meta = lookup.lessonMap.get(id);
  const parsed = parseLessonIdParts(id);

  const moduleId = String(eventModuleId || meta?.moduleId || parsed.moduleId || '').trim() || null;
  let nodeId = String(eventNodeId || meta?.nodeId || parsed.nodeId || '').trim() || null;

  const moduleInfo = moduleId ? lookup.moduleMap.get(moduleId) : null;
  let nodeInfo = nodeId ? lookup.nodeMap.get(nodeId) : null;
  if (!nodeInfo && parsed.altNodeId) {
    nodeId = parsed.altNodeId;
    nodeInfo = lookup.nodeMap.get(nodeId);
  }

  const depth = meta?.depth || parsed.depth || null;
  const depthVi = depthLabelVi(depth);

  let lessonTitle = meta?.lessonTitle || '';
  if (!lessonTitle || lessonTitle === id) {
    if (nodeInfo?.nodeTitle && depthVi) {
      lessonTitle = `${nodeInfo.nodeTitle} · ${depthVi}`;
    } else if (nodeInfo?.nodeTitle) {
      lessonTitle = nodeInfo.nodeTitle;
    } else if (moduleInfo?.moduleTitle && depthVi) {
      lessonTitle = `${moduleInfo.moduleTitle} · ${depthVi}`;
    } else {
      lessonTitle = humanizeSlug(parsed.nodeId || parsed.moduleId || id);
    }
  }

  const moduleTitle = moduleInfo?.moduleTitle || (moduleId ? humanizeSlug(moduleId) : '—');
  const nodeTitle = nodeInfo?.nodeTitle || (nodeId ? humanizeSlug(nodeId) : '—');
  const locationLabel = [moduleTitle, nodeTitle, depthVi].filter(Boolean).join(' · ');

  return {
    lessonTitle,
    moduleTitle,
    nodeTitle,
    depth,
    depthLabel: depthVi,
    locationLabel,
  };
}

const DEPTHS = Object.keys(DEPTH_LABEL_VI);

/**
 * Indexes the learning-path document so analytics rows (which only carry ids)
 * can be labelled without an extra query per row.
 */
function buildLearningPathLookup(doc) {
  const modules = Array.isArray(doc?.modules) ? doc.modules : [];
  const moduleMap = new Map();
  const nodeMap = new Map();
  const lessonMap = new Map();
  const conceptMap = new Map();

  for (const concept of Array.isArray(doc?.concepts) ? doc.concepts : []) {
    const id = String(concept?.id || '').trim();
    if (!id) continue;
    const label = String(
      concept.labelVi || concept.label || concept.title || concept.short_description || id,
    ).trim();
    conceptMap.set(id, label || id);
  }

  for (const module of modules) {
    const moduleId = String(module.id);
    const moduleTitle = module.titleVi || module.title || moduleId;
    moduleMap.set(moduleId, { moduleId, moduleTitle, moduleOrder: Number(module.order) || null });

    for (const node of module.nodes || []) {
      const nodeId = String(node.id);
      const nodeTitle = node.titleVi || node.title || nodeId;
      nodeMap.set(nodeId, { moduleId, nodeId, nodeTitle });

      for (const depth of DEPTHS) {
        for (const lesson of node?.depths?.[depth] || []) {
          const lessonId = String(lesson.id);
          lessonMap.set(lessonId, {
            moduleId,
            nodeId,
            lessonId,
            moduleTitle,
            nodeTitle,
            lessonTitle: lesson.titleVi || lesson.title || lessonId,
            depth,
          });
        }
      }
    }
  }

  return { modules, moduleMap, nodeMap, lessonMap, conceptMap };
}

function resolveConceptTitle(conceptId, lookup) {
  const id = String(conceptId || '').trim();
  if (!id) return '—';
  const fromMap = lookup.conceptMap.get(id);
  if (fromMap && fromMap !== id) return fromMap;
  return humanizeSlug(id);
}

module.exports = {
  DEPTH_LABEL_VI,
  DEPTHS,
  humanizeSlug,
  depthLabelVi,
  parseLessonIdParts,
  buildLearningPathLookup,
  resolveLessonDisplay,
  resolveConceptTitle,
};
