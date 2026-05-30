#!/usr/bin/env node
/**
 * Guard: `components/` import feature code via `features/<domain>/public` only.
 * Existing debt is allowlisted; remove entries only after refactoring the file.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const SCAN_ROOT = join(SCRIPT_DIR, '..', 'src', 'components')

const FORBIDDEN_RE = /from\s+['"]@\/features\/[^'"]+\/api\/[^'"]+['"]/g

/** Files still importing deep `api/*` — shrink this list over time. */
const ALLOWLIST = new Set([
  'src/components/auth/AuthProvider.tsx',
  'src/components/community/comments/CommentRichEditor.tsx',
  'src/components/community/comments/CommentThread.tsx',
  'src/components/community/discussion/DiscussionForumView.tsx',
  'src/components/community/discussion/DiscussionPostList.tsx',
  'src/components/community/learning/LessonRelatedQuestions.tsx',
  'src/components/community/learning/PostLearningContextChip.tsx',
  'src/components/community/moderation/ModerationQueuePanel.tsx',
  'src/components/community/moderation/ReportContentButton.tsx',
  'src/components/community/news/NewsForumView.tsx',
  'src/components/community/shared/TagChips.tsx',
  'src/components/courses/CourseLandingClient.tsx',
  'src/components/courses/CoursePromoBanner.tsx',
  'src/components/courses/LessonContentBody.tsx',
  'src/components/courses/QuizLessonBlock.tsx',
  'src/components/gem-shop/GemShopDecorationCatalog.tsx',
  'src/components/notifications/NotificationBell.tsx',
  'src/components/profile/ProfileAvatarEditor.tsx',
  'src/components/promotions/PromoCampaignBar.tsx',
  'src/components/promotions/PromoNotificationsSection.tsx',
  'src/components/rewards/DecorationCatalogExperience.tsx',
  'src/components/showcase/ShowcaseCatalogProvider.tsx',
  'src/components/studio/BlockEditor.tsx',
  'src/components/studio/BlockPalette.tsx',
  'src/components/studio/blocks/ChartBlock.tsx',
  'src/components/studio/blocks/SliderBlock.tsx',
  'src/components/studio/CourseStorefrontEditor.tsx',
  'src/components/studio/hooks/useBlockEditorActions.ts',
  'src/components/studio/lessonPreviewTypes.ts',
  'src/components/studio/LessonPreview.tsx',
])

function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      yield* walk(full)
    } else if (/\.(ts|tsx)$/.test(name)) {
      yield full
    }
  }
}

const violations = []
const allowedHits = []

for (const abs of walk(SCAN_ROOT)) {
  const rel = relative(join(SCRIPT_DIR, '..'), abs).split(sep).join('/')
  const src = readFileSync(abs, 'utf8')
  let m
  FORBIDDEN_RE.lastIndex = 0
  while ((m = FORBIDDEN_RE.exec(src)) !== null) {
    const line = src.slice(0, m.index).split('\n').length
    const record = { file: rel, line, import: m[0] }
    if (ALLOWLIST.has(rel)) {
      allowedHits.push(record)
    } else {
      violations.push(record)
    }
  }
}

if (violations.length) {
  console.error('components/ must import via features/<domain>/public (not deep api paths):\n')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.import}`)
  }
  process.exit(1)
}

console.log(
  `check-components-public: OK (${ALLOWLIST.size} allowlisted files, ${allowedHits.length} deep imports tracked)`,
)
