/**
 * Regenerate UC Diagram.drawio — compact multi-page layout.
 * Run: npm run diagrams:uc
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** FinalReport §3.4.2 — mỗi UC phải có đúng một oval trên sơ đồ (diagramId). */
const CATALOG_UC50 = [
  ['UC-01', 'uc_register'],
  ['UC-02', 'uc_login'],
  ['UC-03', 'uc_reset'],
  ['UC-04', 'uc_deact_self'],
  ['UC-05', 'uc_profile'],
  ['UC-06', 'uc_chpass'],
  ['UC-07', 'uc_browse'],
  ['UC-08', 'uc_lp'],
  ['UC-09', 'uc_course'],
  ['UC-10', 'uc_lesson'],
  ['UC-11', 'uc_enroll'],
  ['UC-12', 'uc_pay'],
  ['UC-13', 'uc_cohort'],
  ['UC-14', 'uc_apply'],
  ['UC-15', 'uc_recall'],
  ['UC-16', 'uc_myorders'],
  ['UC-17', 'uc_lesson_quiz'],
  ['UC-18', 'uc_assignment'],
  ['UC-19', 'uc_progress'],
  ['UC-20', 'uc_study_lp'],
  ['UC-21', 'uc_3d'],
  ['UC-22', 'uc_sky'],
  ['UC-23', 'uc_ctx_quiz'],
  ['UC-24', 'uc_mastery'],
  ['UC-25', 'uc_agent_chat'],
  ['UC-26', 'uc_agent_concept_q'],
  ['UC-27', 'uc_agent_feedback'],
  ['UC-28', 'uc_comm_browse'],
  ['UC-29', 'uc_post'],
  ['UC-30', 'uc_report'],
  ['UC-31', 'uc_moderate'],
  ['UC-32', 'uc_messages'],
  ['UC-33', 'uc_gem_shop'],
  ['UC-34', 'uc_earn'],
  ['UC-35', 'uc_solar'],
  ['UC-36', 'uc_notif'],
  ['UC-37', 'uc_studio'],
  ['UC-38', 'uc_course_edit'],
  ['UC-39', 'uc_lesson_edit'],
  ['UC-40', 'uc_cohort_edit'],
  ['UC-41', 'uc_quiz_edit'],
  ['UC-42', 'uc_lp_edit'],
  ['UC-43', 'uc_concepts'],
  ['UC-44', 'uc_showcase'],
  ['UC-45', 'uc_user'],
  ['UC-46', 'uc_order'],
  ['UC-47', 'uc_approve'],
  ['UC-48', 'uc_gem_adm'],
  ['UC-49', 'uc_promo'],
  ['UC-50', 'uc_audit'],
];
const OUT = [
  path.join(ROOT, 'UC Diagram.drawio'),
  path.join(ROOT, 'docs/diagrams/UC-Diagram.drawio'),
];

const PAGE_W = 1100;
const PAGE_H = 820;
const SYS_X = 100;
const SYS_Y = 50;
const PKG_W = 920;
const COLS = 3;
const CELL_W = 290;
const CELL_H = 88;
const UC_W = 128;
const UC_H = 62;
const UC_START_X = 20;
const UC_START_Y = 40;
const ACTOR_X = 24;

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function actor(id, label, x, y) {
  return `<mxCell id="${id}" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontSize=12;fontStyle=1;" value="${esc(label)}" vertex="1"><mxGeometry height="60" width="30" x="${x}" y="${y}" as="geometry"/></mxCell>`;
}

function pkg(id, label, x, y, w, h) {
  return `<mxCell id="${id}" parent="sys" style="swimlane;startSize=26;fontStyle=1;fontSize=12;html=1;fillColor=#1a1a2e;fontColor=#ffffff;strokeColor=#6c8cff;" value="${esc(label)}" vertex="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
}

function uc(id, label, x, y, w = UC_W, h = UC_H, parent = 'sys') {
  return `<mxCell id="${id}" parent="${parent}" style="ellipse;whiteSpace=wrap;html=1;fontSize=11;fontColor=#ffffff;fillColor=#16213e;strokeColor=#7ec8e3;" value="${esc(label)}" vertex="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
}

function note(text, x, y, w, h = 56) {
  return `<mxCell id="note_${x}_${y}" parent="1" style="text;html=1;strokeColor=#444;fillColor=none;align=left;verticalAlign=top;fontSize=10;fontColor=#cccccc;rounded=1;" value="${esc(text)}" vertex="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
}

function assoc(source, target) {
  return `<mxCell id="e_${source}_${target}" edge="1" parent="1" source="${source}" target="${target}" style="rounded=1;html=1;endArrow=none;endFill=0;strokeColor=#aaaaaa;fontSize=10;"><mxGeometry relative="1" as="geometry"/></mxCell>`;
}

function extend(from, to) {
  return `<mxCell id="x_${from}_${to}" edge="1" parent="sys" source="${from}" target="${to}" style="html=1;verticalAlign=bottom;endArrow=open;endFill=0;dashed=1;strokeColor=#ffd166;fontSize=9;fontColor=#ffd166;" value="&amp;lt;&amp;lt;extend&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"/></mxCell>`;
}

function include(from, to) {
  return `<mxCell id="i_${from}_${to}" edge="1" parent="sys" source="${from}" target="${to}" style="html=1;verticalAlign=bottom;endArrow=open;endFill=0;dashed=1;strokeColor=#95d5b2;fontSize=9;fontColor=#95d5b2;" value="&amp;lt;&amp;lt;include&amp;gt;&amp;gt;"><mxGeometry relative="1" as="geometry"/></mxCell>`;
}

function generalization(child, parent, ty) {
  return `<mxCell id="gen_${child}_${parent}" edge="1" parent="1" source="${child}" target="${parent}" style="endArrow=block;endFill=0;html=1;edgeStyle=orthogonalEdgeStyle;rounded=0;strokeColor=#ffffff;fontSize=10;"><mxGeometry relative="1" as="geometry"><mxPoint x="80" y="${ty}" as="targetPoint"/></mxGeometry></mxCell>`;
}

function layoutGrid(ucs) {
  const rows = Math.ceil(ucs.length / COLS);
  const h = UC_START_Y + rows * CELL_H + 16;
  const laid = ucs.map((row, i) => {
    const col = i % COLS;
    const r = Math.floor(i / COLS);
    const [id, label, , , w, hh] = row;
    return [
      id,
      label,
      UC_START_X + col * CELL_W,
      UC_START_Y + r * CELL_H,
      w ?? UC_W,
      hh ?? UC_H,
    ];
  });
  return { laid, pkgH: h };
}

const packages = [
  {
    tab: '02 Auth',
    id: 'pkg_auth',
    label: 'Authentication & Account',
    ucs: [
      ['uc_register', 'Register'],
      ['uc_login', 'Log In / Log Out'],
      ['uc_reset', 'Reset Password'],
      ['uc_profile', 'View / Update Profile', null, null, 150, UC_H],
      ['uc_chpass', 'Change Password', null, null, 130, UC_H],
      ['uc_deact_self', 'Deactivate Own Account', null, null, 140, UC_H],
    ],
    extendRels: [],
    includes: [],
  },
  {
    tab: '03 Courses',
    id: 'pkg_course',
    label: 'Courses & Enrollment',
    ucs: [
      ['uc_browse', 'Browse & Search Courses', null, null, 140, UC_H],
      ['uc_lp', 'View Learning Path'],
      ['uc_course', 'View Course Details'],
      ['uc_lesson', 'View Lesson Content'],
      ['uc_enroll', 'Enroll in Course'],
      ['uc_cohort', 'Join Cohort'],
      ['uc_pay', 'Pay Order'],
      ['uc_apply', 'Apply as Teacher'],
      ['uc_recall', 'Take Recall Quiz'],
      ['uc_myorders', 'View My Orders'],
      ['uc_lesson_quiz', 'Take Quiz (lesson)', null, null, 140, UC_H],
      ['uc_assignment', 'Submit Assignment', null, null, 140, UC_H],
      ['uc_progress', 'Track Progress', null, null, 130, UC_H],
      ['uc_study_lp', 'Study LP In-Depth', null, null, 140, UC_H],
    ],
    extendRels: [
      ['uc_lesson', 'uc_course'],
      ['uc_recall', 'uc_lesson'],
      ['uc_lesson_quiz', 'uc_lesson'],
      ['uc_assignment', 'uc_lesson'],
      ['uc_study_lp', 'uc_lp'],
    ],
    includes: [['uc_pay', 'uc_enroll']],
  },
  {
    tab: '04 Explore',
    id: 'pkg_explore',
    label: 'Explore & 3D (không gồm Cosmo agent)',
    ucs: [
      ['uc_3d', 'View 3D Simulation'],
      ['uc_sky', 'Explore Sky Planetarium', null, null, 140, UC_H],
      ['uc_ctx_quiz', 'Contextual Quiz (API)', null, null, 130, UC_H],
      ['uc_mastery', 'Track Concept Mastery', null, null, 140, UC_H],
    ],
    extendRels: [
      ['uc_ctx_quiz', 'uc_sky'],
      ['uc_ctx_quiz', 'uc_3d'],
    ],
    includes: [],
    noteExtra:
      'Contextual Quiz = exploreContextualQuizService (không qua LLM). Cosmo / concept quiz → tab 09 Agent.',
  },
  {
    tab: '09 Agent',
    id: 'pkg_agent',
    label: 'AI Agent (Cosmo / nito)',
    ucs: [
      ['uc_agent_chat', 'Chat with Cosmo Assistant', null, null, 160, UC_H],
      ['uc_agent_concept_q', 'Take Concept Quiz (agent)', null, null, 150, UC_H],
      ['uc_agent_feedback', 'Rate Agent Reply', null, null, 120, UC_H],
    ],
    extendRels: [
      ['uc_agent_feedback', 'uc_agent_chat'],
      ['uc_agent_concept_q', 'uc_agent_chat'],
    ],
    includes: [],
    noteExtra:
      'Guest demo = alternate flow (limited pipeline). Tools/search/nudge = system behavior trong pipeline (SRS). Widget layout; xem docs/architecture/learning-agent.md',
  },
  {
    tab: '05 Community',
    id: 'pkg_community',
    label: 'Community',
    ucs: [
      ['uc_comm_browse', 'Browse Community / News', null, null, 150, UC_H],
      ['uc_post', 'Post & Comment'],
      ['uc_report', 'Report Content'],
      ['uc_moderate', 'Moderate Content'],
      ['uc_messages', 'Direct Messages'],
    ],
    extendRels: [],
    includes: [],
  },
  {
    tab: '06 Rewards',
    id: 'pkg_rewards',
    label: 'Rewards & Notifications',
    ucs: [
      ['uc_gem_shop', 'Gem Shop & Avatar', null, null, 130, UC_H],
      ['uc_earn', 'Earn & Spend Gems'],
      ['uc_solar', 'Solar Journey', null, null, 120, UC_H],
      ['uc_notif', 'Notifications'],
    ],
    extendRels: [],
    includes: [],
  },
  {
    tab: '07 Studio',
    id: 'pkg_studio',
    label: 'Studio (Teacher)',
    ucs: [
      ['uc_studio', 'Studio Dashboard', null, null, 120, UC_H],
      ['uc_course_edit', 'Create / Edit Course', null, null, 150, UC_H],
      ['uc_lesson_edit', 'Create / Edit Lesson', null, null, 150, UC_H],
      ['uc_cohort_edit', 'Manage Cohort', null, null, 130, UC_H],
      ['uc_quiz_edit', 'Make Quiz'],
      ['uc_concepts', 'Manage Concepts'],
      ['uc_lp_edit', 'Edit Learning Path', null, null, 130, UC_H],
      ['uc_showcase', 'Showcase Entity Studio', null, null, 150, UC_H],
    ],
    extendRels: [],
    includes: [],
  },
  {
    tab: '08 Admin',
    id: 'pkg_admin',
    label: 'Administration',
    ucs: [
      ['uc_user', 'Manage User', null, null, 120, UC_H],
      ['uc_order', 'Manage Order'],
      ['uc_approve', 'Approve / Reject Teacher', null, null, 160, UC_H],
      ['uc_gem_adm', 'Gem Economy', null, null, 120, UC_H],
      ['uc_promo', 'Promo & Broadcast', null, null, 130, UC_H],
      ['uc_audit', 'Audit & System', null, null, 120, UC_H],
    ],
    extendRels: [],
    includes: [],
  },
];

const links = {
  act_guest: [
    'uc_register',
    'uc_login',
    'uc_reset',
    'uc_browse',
    'uc_lp',
    'uc_study_lp',
    'uc_3d',
    'uc_sky',
    'uc_comm_browse',
    'uc_course',
    'uc_agent_chat',
  ],
  act_mod: ['uc_login', 'uc_browse', 'uc_moderate', 'uc_report', 'uc_comm_browse', 'uc_profile', 'uc_chpass', 'uc_deact_self'],
  act_admin: [
    'uc_login',
    'uc_browse',
    'uc_user',
    'uc_order',
    'uc_approve',
    'uc_gem_adm',
    'uc_promo',
    'uc_audit',
    'uc_moderate',
    'uc_profile',
    'uc_chpass',
    'uc_deact_self',
  ],
  act_student: [
    'uc_login',
    'uc_reset',
    'uc_profile',
    'uc_chpass',
    'uc_deact_self',
    'uc_browse',
    'uc_lp',
    'uc_course',
    'uc_lesson',
    'uc_enroll',
    'uc_cohort',
    'uc_pay',
    'uc_apply',
    'uc_recall',
    'uc_myorders',
    'uc_lesson_quiz',
    'uc_assignment',
    'uc_progress',
    'uc_study_lp',
    'uc_3d',
    'uc_sky',
    'uc_ctx_quiz',
    'uc_mastery',
    'uc_agent_chat',
    'uc_agent_concept_q',
    'uc_agent_feedback',
    'uc_comm_browse',
    'uc_post',
    'uc_report',
    'uc_messages',
    'uc_gem_shop',
    'uc_earn',
    'uc_solar',
    'uc_notif',
  ],
  act_teacher: [
    'uc_studio',
    'uc_course_edit',
    'uc_lesson_edit',
    'uc_cohort_edit',
    'uc_quiz_edit',
    'uc_concepts',
    'uc_lp_edit',
    'uc_showcase',
    'uc_agent_chat',
  ],
};

const ACTOR_LABELS = {
  act_guest: 'Guest',
  act_mod: 'Moderator',
  act_admin: 'Admin',
  act_student: 'Student',
  act_teacher: 'Teacher',
};

function filterLinks(ucIds) {
  const set = new Set(ucIds);
  const out = {};
  for (const [actor, targets] of Object.entries(links)) {
    const f = targets.filter((t) => set.has(t));
    if (f.length) out[actor] = f;
  }
  return out;
}

function buildPackagePage(pkgDef) {
  const parts = [];
  parts.push(`<mxCell id="0"/>`);
  parts.push(`<mxCell id="1" parent="0"/>`);

  const ucIds = pkgDef.ucs.map((u) => u[0]);
  const pageLinks = filterLinks(ucIds);
  const actors = Object.keys(pageLinks);
  const { laid, pkgH } = layoutGrid(pkgDef.ucs);
  const sysH = pkgH + 36;

  parts.push(
    `<mxCell id="sys" parent="1" style="swimlane;startSize=28;fontStyle=1;fontSize=13;html=1;fillColor=#0f0f1a;fontColor=#e8e8e8;strokeColor=#7ec8e3;" value="${esc(pkgDef.label)}" vertex="1"><mxGeometry x="${SYS_X}" y="${SYS_Y}" width="${PKG_W}" height="${sysH}" as="geometry"/></mxCell>`,
  );
  actors.forEach((aid, i) => {
    parts.push(actor(aid, ACTOR_LABELS[aid], ACTOR_X, SYS_Y + 20 + i * 100));
  });
  for (const row of laid) {
    const [id, label, x, y, w, h] = row;
    parts.push(uc(id, label, x, y, w, h, 'sys'));
  }
  for (const [f, t] of pkgDef.extendRels) parts.push(extend(f, t));
  for (const [f, t] of pkgDef.includes) parts.push(include(f, t));
  for (const [a, targets] of Object.entries(pageLinks)) {
    for (const t of targets) parts.push(assoc(a, t));
  }
  if (pkgDef.id === 'pkg_studio') {
    parts.push(actor('act_student', 'Student', ACTOR_X, SYS_Y + 20 + actors.length * 100));
    parts.push(generalization('act_teacher', 'act_student', SYS_Y + 60 + actors.length * 100));
  }

  const footnote =
    pkgDef.noteExtra ||
    'Zoom 100–150%. Chỉ hiện actor/UC của tab này — ít đường chéo hơn sơ đồ tổng.';
  parts.push(note(footnote, SYS_X, SYS_Y + sysH + 10, PKG_W, pkgDef.noteExtra ? 52 : 36));

  return parts;
}

function buildOverviewPage() {
  const parts = [];
  parts.push(`<mxCell id="0"/>`);
  parts.push(`<mxCell id="1" parent="0"/>`);

  parts.push(
    note(
      'Cosmo Learn — Use Case (multi-page)\n\nTab 02–09: chi tiết từng domain. Tab 09 = AI Agent (Cosmo) — không gộp chung Explore.\nTeacher → Student: kế thừa UC Student + tab 07 Studio.\n\nTái sinh: npm run diagrams:uc',
      40,
      30,
      520,
      110,
    ),
  );

  const actors = [
    ['act_guest', 'Guest', 40, 180],
    ['act_mod', 'Moderator', 40, 280],
    ['act_admin', 'Admin', 40, 380],
    ['act_student', 'Student', 40, 500],
    ['act_teacher', 'Teacher', 40, 620],
  ];
  for (const [id, label, x, y] of actors) {
    parts.push(actor(id, label, x, y));
  }
  parts.push(generalization('act_teacher', 'act_student', 530));

  let y = 160;
  for (const p of packages) {
    const ucList = p.ucs.map((u) => u[1]).join(' · ');
    parts.push(
      `<mxCell id="box_${p.id}" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fontSize=11;align=left;verticalAlign=top;fillColor=#16213e;fontColor=#e8e8e8;strokeColor=#7ec8e3;spacingLeft=8;spacingTop=6;" value="${esc(`【${p.tab}】 ${p.label}\n${ucList}`)}" vertex="1"><mxGeometry x="200" y="${y}" width="860" height="${Math.min(120, 36 + Math.ceil(p.ucs.length / 3) * 22)}" as="geometry"/></mxCell>`,
    );
    y += Math.min(120, 36 + Math.ceil(p.ucs.length / 3) * 22) + 14;
  }

  return parts;
}

function diagramXml(name, id, parts, pageH = PAGE_H) {
  return `  <diagram name="${esc(name)}" id="${id}">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="${PAGE_W}" pageHeight="${pageH}" math="0" shadow="0">
      <root>
        ${parts.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>`;
}

const overviewH = 160 + packages.reduce((s, p) => s + Math.min(120, 36 + Math.ceil(p.ucs.length / 3) * 22) + 14, 0);
const diagrams = [
  diagramXml('01 Overview', 'uc-overview', buildOverviewPage(), overviewH),
  ...packages.map((p) => {
    const rows = Math.ceil(p.ucs.length / COLS);
    const pkgH = UC_START_Y + rows * CELL_H + 16;
    const actorsN = Object.keys(filterLinks(p.ucs.map((u) => u[0]))).length;
    const pageH = Math.max(PAGE_H, SYS_Y + pkgH + 80 + actorsN * 20);
    return diagramXml(p.tab, p.id.replace('pkg_', 'uc-'), buildPackagePage(p), pageH);
  }),
];

const xml = `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="generate-uc-diagram.mjs" version="22.1.0">
${diagrams.join('\n')}
</mxfile>
`;

const diagramIds = new Set(packages.flatMap((p) => p.ucs.map((u) => u[0])));
const catalogIds = new Set(CATALOG_UC50.map(([, id]) => id));
const missingFromDiagram = CATALOG_UC50.filter(([, id]) => !diagramIds.has(id));
const extraOnDiagram = [...diagramIds].filter((id) => !catalogIds.has(id));
if (missingFromDiagram.length) {
  console.error('Catalog UC missing on diagram:', missingFromDiagram.map(([uc]) => uc).join(', '));
  process.exit(1);
}
if (extraOnDiagram.length) {
  console.error('Diagram ovals not in UC-50 catalog:', extraOnDiagram.join(', '));
  process.exit(1);
}
if (diagramIds.size !== 50) {
  console.error(`Expected 50 diagram ovals, got ${diagramIds.size}`);
  process.exit(1);
}

for (const p of OUT) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, xml, 'utf8');
  console.log('Wrote', p, `(${1 + packages.length} pages, ${diagramIds.size} UCs)`);
}
