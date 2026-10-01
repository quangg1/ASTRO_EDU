/**
 * Cầu nối Edu ↔ 3D (Layer 4): entity trong cảnh 3D ↔ concept ↔ bài học.
 *
 * Hàm thuần — không đọc DB — để service, agent và test dùng chung một luật.
 * Thứ tự nguồn (mạnh → yếu):
 *   1. `cms`   — Studio gắn tường minh trên entity (panelConfig.conceptTagIds / lessonIds)
 *   2. `scene` — bài học tự khai báo entity (lesson.sceneContext.primaryEntityId / entityIds)
 *   3. `concept` — bài học có concept trùng với concept của entity
 *   4. `hint`  — khớp từ khóa (chỉ dùng khi entity chưa có concept tường minh)
 */

const DEPTHS = ['beginner', 'explorer', 'researcher'];
const MAX_IDS = 64;

function cleanIds(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const raw of list) {
    const id = String(raw || '').trim();
    if (id && !out.includes(id)) out.push(id);
    if (out.length >= MAX_IDS) break;
  }
  return out;
}

/** Duyệt toàn bộ bài trong lộ trình thành danh sách phẳng có vị trí module/node/depth. */
function flattenLessons(modules) {
  const rows = [];
  const seen = new Set();
  for (const mod of Array.isArray(modules) ? modules : []) {
    for (const node of Array.isArray(mod?.nodes) ? mod.nodes : []) {
      for (const depth of DEPTHS) {
        for (const lesson of node?.depths?.[depth] || []) {
          const lessonId = String(lesson?.id || '').trim();
          if (!lessonId || seen.has(lessonId)) continue;
          seen.add(lessonId);
          const sc = lesson.sceneContext || {};
          const anchorIds = (lesson.conceptAnchors || []).map((a) => a?.conceptId);
          rows.push({
            lessonId,
            titleVi: String(lesson.titleVi || lesson.title || lessonId),
            moduleId: String(mod.id || ''),
            nodeId: String(node.id || ''),
            depth,
            conceptIds: new Set(cleanIds([...(lesson.conceptIds || []), ...anchorIds])),
            primaryEntityId: String(sc.primaryEntityId || '').trim(),
            sceneEntityIds: new Set(cleanIds([sc.primaryEntityId, ...(sc.entityIds || [])])),
          });
        }
      }
    }
  }
  return rows;
}

function toLessonLink(row, source, primary = false) {
  return {
    lessonId: row.lessonId,
    titleVi: row.titleVi,
    moduleId: row.moduleId,
    nodeId: row.nodeId,
    depth: row.depth,
    source,
    primary,
  };
}

const SOURCE_RANK = { cms: 0, scene: 1, concept: 2, hint: 3 };

/**
 * @param {object} input
 * @param {string} input.entityId
 * @param {{conceptTagIds?: string[], lessonIds?: string[]}|null} [input.panelConfig]
 * @param {object[]} [input.modules] — modules của lộ trình đã publish
 * @param {string[]} [input.hintConceptIds] — concept khớp từ khóa (đã tra sẵn)
 */
function resolveEntityLearningLinks({ entityId, panelConfig, modules, hintConceptIds }) {
  const id = String(entityId || '').trim();
  const lessons = flattenLessons(modules);
  const byLessonId = new Map(lessons.map((row) => [row.lessonId, row]));

  const cmsConceptIds = cleanIds(panelConfig?.conceptTagIds);
  const cmsLessonIds = cleanIds(panelConfig?.lessonIds);
  const conceptSource = cmsConceptIds.length ? 'cms' : 'hint';
  const conceptIds = cmsConceptIds.length ? cmsConceptIds : cleanIds(hintConceptIds);

  const links = new Map();
  const add = (row, source, primary) => {
    const prev = links.get(row.lessonId);
    if (prev && SOURCE_RANK[prev.source] <= SOURCE_RANK[source]) {
      if (primary && !prev.primary) prev.primary = true;
      return;
    }
    links.set(row.lessonId, toLessonLink(row, source, primary || Boolean(prev?.primary)));
  };

  for (const lessonId of cmsLessonIds) {
    const row = byLessonId.get(lessonId);
    if (row) add(row, 'cms', false);
  }
  for (const row of lessons) {
    if (row.sceneEntityIds.has(id)) add(row, 'scene', row.primaryEntityId === id);
  }
  const conceptSet = new Set(conceptIds);
  if (conceptSet.size) {
    for (const row of lessons) {
      if ([...row.conceptIds].some((c) => conceptSet.has(c))) {
        add(row, conceptSource === 'cms' ? 'concept' : 'hint', false);
      }
    }
  }

  const sorted = [...links.values()].sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    if (a.source !== b.source) return SOURCE_RANK[a.source] - SOURCE_RANK[b.source];
    return a.titleVi.localeCompare(b.titleVi, 'vi');
  });

  return {
    entityId: id,
    conceptIds,
    conceptSource: conceptIds.length ? conceptSource : null,
    lessons: sorted,
    /** true khi có ít nhất một liên kết do người biên soạn khai báo (không phải đoán). */
    explicit: cmsConceptIds.length > 0 || sorted.some((l) => l.source !== 'hint'),
  };
}

/**
 * Báo cáo độ phủ cho Studio: entity nào chưa nối với nội dung học,
 * và bài học nào trỏ tới entity không tồn tại trong cảnh 3D.
 *
 * @param {{ entities: Array<{entityId: string, nameVi?: string, panelConfig?: object}>, modules: object[] }} input
 */
function buildLearningLinkCoverage({ entities, modules }) {
  const knownIds = new Set();
  const rows = (Array.isArray(entities) ? entities : []).map((entity) => {
    const entityId = String(entity?.entityId || '').trim();
    knownIds.add(entityId);
    const links = resolveEntityLearningLinks({
      entityId,
      panelConfig: entity?.panelConfig,
      modules,
    });
    return {
      entityId,
      nameVi: String(entity?.nameVi || ''),
      conceptCount: links.conceptIds.length,
      lessonCount: links.lessons.length,
      explicit: links.explicit,
    };
  });

  const danglingSceneRefs = [];
  for (const row of flattenLessons(modules)) {
    for (const entityId of row.sceneEntityIds) {
      if (!knownIds.has(entityId)) {
        danglingSceneRefs.push({ lessonId: row.lessonId, titleVi: row.titleVi, entityId });
      }
    }
  }

  return {
    entities: rows,
    unlinkedEntityIds: rows.filter((r) => !r.explicit).map((r) => r.entityId),
    danglingSceneRefs,
  };
}

module.exports = { resolveEntityLearningLinks, buildLearningLinkCoverage, flattenLessons };
