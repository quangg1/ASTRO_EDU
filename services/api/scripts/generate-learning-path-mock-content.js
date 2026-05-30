/**
 * Làm dày learningPathDefault.json — mock nội dung tiếng Việt cho wizard / topic personalization.
 * Chạy từ services/api: node scripts/generate-learning-path-mock-content.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../data/learningPathDefault.json');

const DEPTHS = ['beginner', 'explorer', 'researcher'];

const DEPTH_LABEL = {
  beginner: 'Cơ bản',
  explorer: 'Cơ chế',
  researcher: 'Sâu',
};

const PLANET_ENTITIES = [
  'planet-mercury',
  'planet-venus',
  'planet-earth',
  'planet-mars',
  'planet-jupiter',
  'planet-saturn',
  'planet-uranus',
  'planet-neptune',
];

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pickBullets(lessonTitleVi, depth) {
  const base = [
    `Nắm ý chính: ${lessonTitleVi}.`,
    `Liên hệ với quan sát thực tế hoặc mô hình vật lý ở mức ${DEPTH_LABEL[depth]}.`,
    'Ghi chú câu hỏi bạn còn thắc mắc — dùng forum hoặc agent để đào sâu.',
  ];
  if (depth === 'researcher') {
    base.push('Đọc thêm paper/survey nếu muốn đi xa hơn lộ trình.');
  }
  return base;
}

function themeParagraph(moduleId, nodeTitleVi) {
  const themes = {
    'intro-scale':
      'Quy mô và cấu trúc phân cấp giúp bạn không nhầm lẫn giữa “gần” và “xa”, giữa hiện tượng nhìn thấy trên bầu trời và cấu trúc vật lý bên dưới.',
    'sky-motion':
      'Chuyển động biểu kiến — ngày/đêm, pha Mặt Trăng, nhật thực — là nền tảng để đọc bản đồ sao và lên kế hoạch quan sát.',
    'light-observation':
      'Ánh sáng mang thông tin: bước sóng, phổ và hiệu ứng Doppler là “ngôn ngữ” chính để đo khoảng cách, vận tốc và thành phần hóa học.',
    'solar-system':
      'Hệ Mặt Trời là phòng thí nghiệm gần nhất: quỹ đạo, hình thành và các vật thể nhỏ giải thích cách hệ hành tinh tiến hóa.',
    'stars-life':
      'Sao sinh ra, sống và chết trong các giai đoạn rõ rệt; hiểu sao là chìa khóa để hiểu nguyên tố hóa học và nguồn gốc hệ Mặt Trời.',
    'universe-cosmology':
      'Ở quy mô vũ trụ, thiên hà và vật chất tối lập thành bức tranh lớn về lịch sử và số phận vũ trụ.',
    'exoplanets-worlds':
      'Hành tinh ngoài hệ được tìm bằng nhiều kỹ thuật; mỗi phát hiện thắt chặt mô hình hình thành hệ và khả năng sự sống.',
    'space-exploration':
      'Khám phá không gian kết hợp kỹ thuật, vật lý và dữ liệu — từ tàu không người lái đến định hướng con người tới Mặt Trăng và xa hơn.',
  };
  return themes[moduleId] || `Chủ đề “${nodeTitleVi}” nằm trong lộ trình thiên văn tổng hợp của Galaxies.`;
}

function buildHtmlBody(ctx) {
  const { moduleTitleVi, nodeTitleVi, lessonTitleVi, depth, moduleId } = ctx;
  const theme = themeParagraph(moduleId, nodeTitleVi);
  const bullets = pickBullets(lessonTitleVi, depth);

  return [
    `<p><strong>${escapeHtml(DEPTH_LABEL[depth])} · ${escapeHtml(lessonTitleVi)}</strong></p>`,
    `<p>Trong module <em>${escapeHtml(moduleTitleVi)}</em>, node <em>${escapeHtml(nodeTitleVi)}</em>: ${escapeHtml(theme)}</p>`,
    `<p>Bài này tập trung vào <strong>${escapeHtml(lessonTitleVi)}</strong>. Hãy đọc chậm, ghi lại khái niệm mới và thử liên hệ với Explore 3D nếu bài có gợi ý thực thể.</p>`,
    `<p>Ở mức ${escapeHtml(DEPTH_LABEL[depth])}, bạn không cần thuộc mọi công thức — ưu tiên hiểu <em>vì sao</em> nhà khoa học tin vào mô hình và <em>quan sát nào</em> ủng hộ điều đó.</p>`,
    `<h3>Điểm cần nhớ</h3>`,
    `<ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`,
  ].join('\n');
}

function buildSections(ctx, html) {
  const tip =
    ctx.depth === 'beginner'
      ? 'Mẹo: hoàn thành bài với đủ thời gian đọc (≥1 phút) để nhận thưởng Gem lộ trình.'
      : ctx.depth === 'explorer'
        ? 'Mẹo: thử chuyển depth trong cùng node để so sánh mức giải thích.'
        : 'Mẹo: ghi lại giả định mô hình và nguồn dữ liệu quan sát tương ứng.';

  return [
    {
      type: 'richtext',
      sectionLevel: 'main',
      title: ctx.lessonTitleVi,
      html,
    },
    {
      type: 'callout',
      calloutVariant: 'tip',
      content: tip,
    },
    {
      type: 'richtext',
      sectionLevel: 'sub',
      title: 'Tóm tắt nhanh',
      bullets: pickBullets(ctx.lessonTitleVi, ctx.depth),
    },
  ];
}

function enrichLesson(lesson, ctx) {
  const hasBody = String(lesson.body || '').trim().length > 80;
  const hasSections = Array.isArray(lesson.sections) && lesson.sections.length > 0;
  if (hasBody && hasSections) return lesson;

  const fullCtx = { ...ctx, lessonTitleVi: lesson.titleVi || lesson.title || 'Bài học' };
  const html = buildHtmlBody(fullCtx);
  return {
    ...lesson,
    title: lesson.title || '',
    conceptIds: lesson.conceptIds?.length ? lesson.conceptIds : ['astronomy_fundamentals'],
    sections: hasSections ? lesson.sections : buildSections(fullCtx, html),
    body: hasBody ? lesson.body : html,
  };
}

function maybeSceneContext(moduleId, nodeId, lessonIndex) {
  if (moduleId !== 'solar-system') return undefined;
  if (nodeId === 'the-sun') return { primaryEntityId: 'planet-earth', entityIds: ['planet-earth'] };
  if (nodeId === 'planets') {
    const e = PLANET_ENTITIES[lessonIndex % PLANET_ENTITIES.length];
    return { primaryEntityId: e, entityIds: [e] };
  }
  if (nodeId === 'orbits') {
    return { primaryEntityId: 'planet-jupiter', entityIds: ['planet-jupiter', 'planet-saturn'] };
  }
  return undefined;
}

function enrichNode(node, module) {
  const nextDepths = {};
  for (const depth of DEPTHS) {
    const lessons = node.depths?.[depth] || [];
    nextDepths[depth] = lessons.map((lesson, i) => {
      const enriched = enrichLesson(lesson, {
        moduleId: module.id,
        moduleTitleVi: module.titleVi,
        nodeTitleVi: node.titleVi,
        nodeId: node.id,
        depth,
      });
      const scene = maybeSceneContext(module.id, node.id, i);
      if (scene && !enriched.sceneContext) {
        enriched.sceneContext = scene;
      }
      return enriched;
    });
  }
  return { ...node, depths: nextDepths };
}

function makeLessons(module, nodeId, nodeTitleVi, depth, titles) {
  return titles.map((titleVi, i) => {
    const id = `${module.id}__${nodeId}__${depth}__${i}`;
    const ctx = {
      moduleId: module.id,
      moduleTitleVi: module.titleVi,
      nodeTitleVi,
      nodeId,
      depth,
      lessonTitleVi: titleVi,
    };
    const html = buildHtmlBody(ctx);
    return {
      id,
      titleVi,
      title: '',
      conceptIds: ['astronomy_fundamentals'],
      sections: buildSections(ctx, html),
      body: html,
    };
  });
}

function makeNode(module, nodeSpec) {
  const { id, titleVi, title, topicWeights, lessonTitles } = nodeSpec;
  const depths = {};
  for (const depth of DEPTHS) {
    const titles = lessonTitles[depth] || lessonTitles.beginner || [];
    depths[depth] = makeLessons(module, id, titleVi, depth, titles);
  }
  return {
    id,
    title: title || '',
    titleVi,
    depths,
    topicWeights,
  };
}

const NEW_MODULES = [
  {
    id: 'exoplanets-worlds',
    order: 7,
    title: 'Exoplanets & Habitable Worlds',
    titleVi: 'Hành tinh ngoài & Thế giới có thể sống',
    emoji: '🪐',
    goal: 'How we find and characterize planets around other stars.',
    goalVi: 'Cách tìm và mô tả hành tinh quanh sao khác.',
    connections: ['→ Module 4 (Stars)', '→ Module 3 (Light & Doppler)'],
    nodes: [
      {
        id: 'exoplanet-detection',
        titleVi: 'Phương pháp phát hiện',
        topicWeights: [
          { topicId: 'exoplanets', weight: 1 },
          { topicId: 'astrophysics', weight: 0.5 },
          { topicId: 'telescopes', weight: 0.4 },
        ],
        lessonTitles: {
          beginner: ['Transit là gì?', 'Radial velocity — sao “lắc” nhẹ', 'Tại sao khó chụp ảnh trực tiếp'],
          explorer: ['Độ lệch transit và kích thước hành tinh', 'Đường cong RV và khối lượng tối thiểu', 'Microlensing — phóng đại trọng lực'],
          researcher: ['False positive trong survey', 'Mass–radius degeneracy', 'Future: direct imaging với coronagraph'],
        },
      },
      {
        id: 'habitable-zone',
        titleVi: 'Vùng sống được',
        topicWeights: [
          { topicId: 'exoplanets', weight: 0.95 },
          { topicId: 'astrophysics', weight: 0.45 },
          { topicId: 'solar-system', weight: 0.3 },
        ],
        lessonTitles: {
          beginner: ['Vùng HZ quanh sao giống Mặt Trời', 'Sao đỏ và HZ gần hơn', 'Nước lỏng — điều kiện cần chưa đủ'],
          explorer: ['Bức xạ sao mẹ và cân bằng năng lượng', 'Tidal locking — một mặt luôn ngày', 'Atmosphere greenhouse on exoplanets'],
          researcher: ['3D climate models (ý niệm)', 'False negatives in HZ', 'Biomarkers — O₂, CH₄ (cẩn trọng)'],
        },
      },
      {
        id: 'exoplanet-atmospheres',
        titleVi: 'Khí quyển ngoài hệ',
        topicWeights: [
          { topicId: 'exoplanets', weight: 0.9 },
          { topicId: 'astrophysics', weight: 0.55 },
        ],
        lessonTitles: {
          beginner: ['Transmission spectrum khi transit', 'Clouds và featureless spectrum', 'Hot Jupiters — khí quyển nóng'],
          explorer: ['Retrieval — suy ngược thành phần', 'Scattering vs absorption lines', 'JWST và exoplanet atmospheres'],
          researcher: ['Degeneracy trong retrieval', 'Photochemistry on hot worlds', 'Bio-signatures vs false positives'],
        },
      },
      {
        id: 'famous-exoplanets',
        titleVi: 'Hệ nổi tiếng',
        topicWeights: [
          { topicId: 'exoplanets', weight: 1 },
          { topicId: 'space-exploration', weight: 0.25 },
        ],
        lessonTitles: {
          beginner: ['TRAPPIST-1 — hệ 7 hành tinh', 'Proxima b — gần nhất', 'Kepler-186f — trong HZ'],
          explorer: ['Compact systems vs Solar System', 'Tidal effects in TRAPPIST-1', 'RV follow-up of nearby stars'],
          researcher: ['Population statistics from Kepler', 'Occurrence rate of Earth-size planets', 'Future: LIFE / HabEx concepts'],
        },
      },
      {
        id: 'exoplanet-formation',
        titleVi: 'Hình thành hành tinh ngoài',
        topicWeights: [
          { topicId: 'exoplanets', weight: 0.85 },
          { topicId: 'solar-system', weight: 0.5 },
          { topicId: 'astrophysics', weight: 0.4 },
        ],
        lessonTitles: {
          beginner: ['Hot Jupiters — bất ngờ đầu tiên', 'Super-Earths và mini-Neptunes', 'Migration — hành tinh “di cư”'],
          explorer: ['Core accretion vs disk instability', 'Pebbles accretion (ý niệm)', 'Metallicity và số lượng hành tinh'],
          researcher: ['N-body + hydrodynamics sims', 'Observational tests of migration', 'Planet–disk interaction'],
        },
      },
    ],
  },
  {
    id: 'space-exploration',
    order: 8,
    title: 'Space Exploration',
    titleVi: 'Khám phá không gian',
    emoji: '🚀',
    goal: 'Robotic and human missions that extend our reach.',
    goalVi: 'Nhiệm vụ robot và con người mở rộng tầm với của loài người.',
    connections: ['→ Module 5 (Solar System)', '→ Showcase stories'],
    nodes: [
      {
        id: 'rockets-launch',
        titleVi: 'Tên lửa & quỹ đạo',
        topicWeights: [
          { topicId: 'space-exploration', weight: 1 },
          { topicId: 'astrophysics', weight: 0.35 },
        ],
        lessonTitles: {
          beginner: ['Đẩy lên quỹ đạo — delta-v cơ bản', 'Tầng tên lửa và booster tái sử dụng', 'LEO vs GEO — quỹ đạo phổ biến'],
          explorer: ['Hohmann transfer (ý niệm)', 'Gravity assist', 'Staging và hiệu suất nhiên liệu'],
          researcher: ['Launch window optimization', 'Radiation belts và shielding', 'In-space propulsion (ion, nuclear)'],
        },
      },
      {
        id: 'robotic-missions',
        titleVi: 'Tàu robot',
        topicWeights: [
          { topicId: 'space-exploration', weight: 1 },
          { topicId: 'solar-system', weight: 0.55 },
        ],
        lessonTitles: {
          beginner: ['Voyager — thông điệp tới vì sao', 'Mars rovers — Curiosity & Perseverance', 'Juno tại Jupiter'],
          explorer: ['Power: RTG vs solar at distance', 'Telecom delay và autonomy', 'Sample return — OSIRIS-REx, Hayabusa'],
          researcher: ['Planetary protection', 'Fault tolerance on long missions', 'AI planning for rovers'],
        },
      },
      {
        id: 'human-spaceflight',
        titleVi: 'Bay người',
        topicWeights: [
          { topicId: 'space-exploration', weight: 0.95 },
          { topicId: 'solar-system', weight: 0.4 },
        ],
        lessonTitles: {
          beginner: ['ISS — phòng lab quỹ đạo', 'Artemis — trở lại Mặt Trăng', 'Spacesuit và môi trường chân không'],
          explorer: ['Microgravity effects on body', 'Life support loops', 'Re-entry heat shield'],
          researcher: ['Radiation risk for Mars crew', 'Closed-loop ECLSS', 'Human factors in long duration flight'],
        },
      },
      {
        id: 'space-telescopes',
        titleVi: 'Kính trên không gian',
        topicWeights: [
          { topicId: 'space-exploration', weight: 0.7 },
          { topicId: 'telescopes', weight: 0.85 },
          { topicId: 'exoplanets', weight: 0.35 },
        ],
        lessonTitles: {
          beginner: ['Hubble — ảnh icon', 'JWST — hồng ngoại sâu', 'Tại sao phải đưa kính lên không gian'],
          explorer: ['Angular resolution và mirror size', 'Cooling for IR telescopes', 'Gaia — astrometry từ không gian'],
          researcher: ['Wavefront control on JWST', 'Future: LUVOIR / Habitable Worlds Observatory', 'Synergy ground + space'],
        },
      },
      {
        id: 'future-exploration',
        titleVi: 'Tương lai',
        topicWeights: [
          { topicId: 'space-exploration', weight: 1 },
          { topicId: 'exoplanets', weight: 0.3 },
        ],
        lessonTitles: {
          beginner: ['Mặt Trăng là bước đệm', 'Mars — thách thức chính', 'Tiểu hành tinh và tài nguyên'],
          explorer: ['In-situ resource utilization', 'Swarm satellites', 'Commercial launch market'],
          researcher: ['Interstellar probes — Breakthrough Starshot', 'Ethics of planetary settlement', 'International governance in space'],
        },
      },
    ],
  },
];

function main() {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  let modules = Array.isArray(raw.modules) ? raw.modules : [];

  modules = modules.map((mod) => ({
    ...mod,
    nodes: (mod.nodes || []).map((node) => enrichNode(node, mod)),
  }));

  const existingIds = new Set(modules.map((m) => m.id));
  for (const mod of NEW_MODULES) {
    if (existingIds.has(mod.id)) continue;
    modules.push({
      ...mod,
      nodes: mod.nodes.map((n) => enrichNode(makeNode(mod, n), mod)),
    });
  }

  modules.sort((a, b) => (a.order || 0) - (b.order || 0));

  for (const mod of modules) {
    for (const node of mod.nodes || []) {
      for (const depth of DEPTHS) {
        for (let i = 0; i < (node.depths?.[depth] || []).length; i++) {
          const lesson = node.depths[depth][i];
          node.depths[depth][i] = enrichLesson(lesson, {
            moduleId: mod.id,
            moduleTitleVi: mod.titleVi,
            nodeTitleVi: node.titleVi,
            nodeId: node.id,
            depth,
          });
          if (!node.depths[depth][i].sceneContext) {
            const scene = maybeSceneContext(mod.id, node.id, i);
            if (scene) node.depths[depth][i].sceneContext = scene;
          }
        }
      }
    }
  }

  const stats = { modules: modules.length, nodes: 0, lessons: 0, withBody: 0 };
  for (const mod of modules) {
    for (const node of mod.nodes || []) {
      stats.nodes += 1;
      for (const depth of DEPTHS) {
        for (const lesson of node.depths?.[depth] || []) {
          stats.lessons += 1;
          if (String(lesson.body || '').trim().length > 80) stats.withBody += 1;
        }
      }
    }
  }

  fs.writeFileSync(file, `${JSON.stringify({ modules }, null, 2)}\n`, 'utf8');
  console.log('Updated', file);
  console.log(stats);
}

main();
