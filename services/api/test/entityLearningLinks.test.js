const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveEntityLearningLinks,
  buildLearningLinkCoverage,
  buildLessonEntityIndex,
} = require('../features/content3d/lib/entityLearningLinks');

const COURSE_LESSONS = [
  {
    courseSlug: 'astro-101',
    courseTitle: 'Thiên văn 101',
    lessonSlug: 'rings-lab',
    title: 'Thực hành vành đai',
    sceneContext: { primaryEntityId: 'planet-saturn' },
  },
  {
    courseSlug: 'astro-101',
    courseTitle: 'Thiên văn 101',
    lessonSlug: 'moons',
    title: 'Các vệ tinh',
    sceneContext: { primaryEntityId: 'moon-titan', entityIds: ['planet-saturn', 'moon-ghost'] },
  },
];

const lesson = (id, extra = {}) => ({ id, titleVi: `Bài ${id}`, conceptIds: [], ...extra });

const MODULES = [
  {
    id: 'm1',
    nodes: [
      {
        id: 'n1',
        depths: {
          beginner: [
            lesson('saturn-intro', { sceneContext: { primaryEntityId: 'planet-saturn', entityIds: [] } }),
            lesson('rings', { conceptIds: ['planetary-rings'] }),
            lesson('titan-air', { sceneContext: { primaryEntityId: 'moon-titan', entityIds: ['planet-saturn'] } }),
          ],
          explorer: [
            lesson('gas-giants', { conceptAnchors: [{ conceptId: 'gas-giant', phrase: 'khí khổng lồ' }] }),
            lesson('ghost', { sceneContext: { primaryEntityId: 'planet-vulcan' } }),
          ],
          researcher: [],
        },
      },
    ],
  },
];

test('scene-declared lessons link to their entity, primary first', () => {
  const links = resolveEntityLearningLinks({ entityId: 'planet-saturn', modules: MODULES });
  assert.deepEqual(
    links.lessons.map((l) => [l.lessonId, l.source, l.primary]),
    [
      ['saturn-intro', 'scene', true],
      ['titan-air', 'scene', false],
    ],
  );
  assert.equal(links.explicit, true);
  assert.equal(links.lessons[0].moduleId, 'm1');
  assert.equal(links.lessons[0].nodeId, 'n1');
});

test('Studio concepts pull in lessons by concept (incl. anchors); Studio lessons rank first', () => {
  const links = resolveEntityLearningLinks({
    entityId: 'planet-saturn',
    panelConfig: { conceptTagIds: ['planetary-rings', 'gas-giant'], lessonIds: ['titan-air'] },
    modules: MODULES,
  });
  assert.deepEqual(links.conceptIds, ['planetary-rings', 'gas-giant']);
  assert.equal(links.conceptSource, 'cms');
  const bySource = Object.fromEntries(links.lessons.map((l) => [l.lessonId, l.source]));
  assert.deepEqual(bySource, {
    'saturn-intro': 'scene',
    'titan-air': 'cms',
    rings: 'concept',
    'gas-giants': 'concept',
  });
  assert.equal(links.lessons[0].lessonId, 'saturn-intro');
});

test('keyword hints are used only without Studio concepts and are not explicit', () => {
  const hinted = resolveEntityLearningLinks({
    entityId: 'planet-jupiter',
    modules: MODULES,
    hintConceptIds: ['gas-giant'],
  });
  assert.equal(hinted.conceptSource, 'hint');
  assert.deepEqual(hinted.lessons.map((l) => [l.lessonId, l.source]), [['gas-giants', 'hint']]);
  assert.equal(hinted.explicit, false);

  const studio = resolveEntityLearningLinks({
    entityId: 'planet-jupiter',
    panelConfig: { conceptTagIds: ['planetary-rings'] },
    modules: MODULES,
    hintConceptIds: ['gas-giant'],
  });
  assert.deepEqual(studio.conceptIds, ['planetary-rings']);
});

test('unknown Studio lesson ids are ignored', () => {
  const links = resolveEntityLearningLinks({
    entityId: 'comet-x',
    panelConfig: { lessonIds: ['does-not-exist'] },
    modules: MODULES,
  });
  assert.deepEqual(links.lessons, []);
  assert.equal(links.explicit, false);
});

test('coverage lists unlinked entities and lessons pointing at missing entities', () => {
  const report = buildLearningLinkCoverage({
    entities: [
      { entityId: 'planet-saturn', nameVi: 'Sao Thổ' },
      { entityId: 'moon-titan' },
      { entityId: 'planet-neptune' },
    ],
    modules: MODULES,
    courseLessons: COURSE_LESSONS,
  });
  assert.deepEqual(report.unlinkedEntityIds, ['planet-neptune']);
  assert.deepEqual(report.danglingSceneRefs, [
    { kind: 'lp', lessonId: 'ghost', titleVi: 'Bài ghost', moduleId: 'm1', nodeId: 'n1', entityId: 'planet-vulcan' },
    { kind: 'course', lessonId: 'moons', titleVi: 'Các vệ tinh', courseSlug: 'astro-101', entityId: 'moon-ghost' },
  ]);
  const saturn = report.entities.find((e) => e.entityId === 'planet-saturn');
  assert.equal(saturn.lessonCount, 2);
  assert.equal(saturn.courseLessonCount, 2);
  assert.deepEqual(saturn.sources, { cms: 0, scene: 2, concept: 0 });
  assert.deepEqual(report.summary, {
    entityCount: 3,
    linkedEntityCount: 2,
    lpLessonCount: 5,
    lpLessonsWithScene: 3,
    courseLessonsWithScene: 2,
  });
});

test('course lessons declaring an entity link to it and make it explicit', () => {
  const links = resolveEntityLearningLinks({
    entityId: 'planet-saturn',
    modules: [],
    courseLessons: COURSE_LESSONS,
  });
  assert.deepEqual(
    links.courseLessons.map((l) => [l.courseSlug, l.lessonSlug, l.primary]),
    [
      ['astro-101', 'rings-lab', true],
      ['astro-101', 'moons', false],
    ],
  );
  assert.equal(links.explicit, true);
  assert.deepEqual(
    resolveEntityLearningLinks({ entityId: 'planet-mars', modules: [], courseLessons: COURSE_LESSONS })
      .courseLessons,
    [],
  );
});

test('lesson index maps lessons back to entities, primary scene entity first, no hints', () => {
  const index = buildLessonEntityIndex({
    entities: [
      { entityId: 'planet-saturn', panelConfig: { conceptTagIds: ['planetary-rings'] } },
      { entityId: 'moon-titan' },
      { entityId: 'planet-jupiter' },
    ],
    modules: MODULES,
  });
  assert.deepEqual(index['titan-air'], [
    { entityId: 'moon-titan', source: 'scene', primary: true },
    { entityId: 'planet-saturn', source: 'scene', primary: false },
  ]);
  assert.deepEqual(index.rings, [{ entityId: 'planet-saturn', source: 'concept', primary: false }]);
  assert.equal(index['gas-giants'], undefined);
});
