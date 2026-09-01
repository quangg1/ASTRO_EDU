const MATERIAL_KINDS = ['pdf', 'slides', 'link', 'video'];
const LESSON_TYPES = ['text', 'visualization', 'quiz', 'assignment', 'live_session'];

const toDate = (value) => (value ? new Date(value) : null);
const toNumberOrNull = (value) => (value != null ? Number(value) : null);
const toArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Fills in the positional defaults the studio editor relies on (titles, slugs
 * and ordering derived from array position). Kept out of the Zod schema
 * because these defaults depend on the item's index, not just its value.
 */
function normalizeModules(modules) {
  return modules.map((module, index) => ({
    _id: module?._id || undefined,
    title: module?.title || `Module ${index + 1}`,
    slug: module?.slug || `module-${index + 1}`,
    description: module?.description || '',
    icon: module?.icon || '',
    order: module?.order != null ? Number(module.order) : index,
    materials: toArray(module?.materials).map((material) => ({
      id: material?.id || `mat-${index}-${Date.now()}`,
      label: material?.label || '',
      kind: MATERIAL_KINDS.includes(material?.kind) ? material.kind : 'pdf',
      url: material?.url || '',
      uploadedAt: toDate(material?.uploadedAt),
    })),
  }));
}

function normalizeLessons(lessons) {
  return lessons.map((lesson, index) => ({
    title: lesson?.title || `Lesson ${index + 1}`,
    slug: lesson?.slug || `lesson-${index + 1}`,
    description: lesson?.description || '',
    type: LESSON_TYPES.includes(lesson?.type) ? lesson.type : 'text',
    quizSettings: lesson?.quizSettings || null,
    assignmentSettings: lesson?.assignmentSettings || null,
    meetingUrl: lesson?.meetingUrl || null,
    liveScheduledAt: toDate(lesson?.liveScheduledAt),
    visualizationId: lesson?.visualizationId || null,
    stageTime: toNumberOrNull(lesson?.stageTime),
    videoUrl: lesson?.videoUrl || null,
    coverImage: lesson?.coverImage || null,
    galleryImages: toArray(lesson?.galleryImages),
    week: toNumberOrNull(lesson?.week),
    moduleId: lesson?.moduleId || null,
    content: lesson?.content || '',
    learningGoals: toArray(lesson?.learningGoals),
    sections: toArray(lesson?.sections),
    quizQuestions: toArray(lesson?.quizQuestions),
    resourceLinks: toArray(lesson?.resourceLinks),
    sourcePdf: lesson?.sourcePdf || null,
    sourcePageCount: toNumberOrNull(lesson?.sourcePageCount),
    order: lesson?.order != null ? Number(lesson.order) : index,
  }));
}

module.exports = { MATERIAL_KINDS, LESSON_TYPES, normalizeModules, normalizeLessons };
