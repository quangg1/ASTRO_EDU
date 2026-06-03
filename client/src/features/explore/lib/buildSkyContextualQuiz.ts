import type { LearningConcept } from '@/data/learningPathCurriculum'
import type { QuizQuestion } from '@/shared/types/quizQuestion'
import { newQuizQuestionId, setMcqAnswer } from '@/shared/types/quizQuestion'
import type { SkyExploreTarget } from './exploreTargets'

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items]
  const rnd = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function pickDistinct<T>(items: T[], count: number, seed: number, exclude?: Set<T>): T[] {
  const pool = items.filter((x) => !exclude?.has(x))
  return shuffle(pool, seed).slice(0, count)
}

function buildMcq(
  question: string,
  correct: string,
  wrongs: string[],
  seed: number,
): QuizQuestion | null {
  const c = String(correct || '').trim()
  if (!c) return null
  const distractors = pickDistinct(
    wrongs.map((w) => String(w || '').trim()).filter((w) => w && w !== c),
    3,
    seed,
  )
  if (distractors.length < 2) return null
  const options = shuffle([c, ...distractors].slice(0, 4), seed + 17)
  const answerIndex = options.indexOf(c)
  if (answerIndex < 0) return null
  let q: QuizQuestion = {
    id: newQuizQuestionId('sky_ctx'),
    type: 'mcq',
    question,
    options: options.map((text) => ({ text })),
    answer: 0,
  }
  q = setMcqAnswer(q, answerIndex)
  return q
}

const IAU_WRONG = ['Ori', 'Leo', 'Peg', 'And', 'Sco', 'UMa', 'Lyr', 'Cyg', 'Aql', 'CMa']

/** Quiz ngữ cảnh La bàn chòm sao — không cần NASA catalog row. */
export function buildSkyConstellationContextualQuiz(args: {
  target: SkyExploreTarget
  peerTargets: SkyExploreTarget[]
  concepts: LearningConcept[]
  limit?: number
}): QuizQuestion[] {
  const { target, peerTargets, concepts, limit = 2 } = args
  const label = target.nameVi.replace(/^Chòm sao /, '').trim() || target.nameEn || target.id
  const seed = hashString(target.id)
  const candidates: QuizQuestion[] = []

  const peerNames = peerTargets
    .filter((t) => t.id !== target.id && t.kind === 'constellation')
    .map((t) => t.nameVi.replace(/^Chòm sao /, '').trim())
    .filter(Boolean)

  const nameQ = buildMcq(
    'Trên La bàn chòm sao, bạn đang xem chòm nào?',
    label,
    pickDistinct(peerNames, 6, seed + 1),
    seed + 2,
  )
  if (nameQ) candidates.push(nameQ)

  if (target.iauCode) {
    const iauQ = buildMcq(
      `Mã IAU ba chữ của chòm ${label} là gì?`,
      target.iauCode,
      pickDistinct(IAU_WRONG.filter((c) => c !== target.iauCode), 4, seed + 3),
      seed + 4,
    )
    if (iauQ) candidates.push(iauQ)
  }

  if (target.nameEn) {
    const enQ = buildMcq(
      `Tên tiếng Anh (IAU) của chòm này là gì?`,
      target.nameEn,
      pickDistinct(
        peerTargets
          .map((t) => t.nameEn)
          .filter((n): n is string => Boolean(n && n !== target.nameEn)),
        4,
        seed + 5,
      ),
      seed + 6,
    )
    if (enQ) candidates.push(enQ)
  }

  const starCount = target.starNodes?.length ?? 0
  if (starCount >= 3) {
    const correct = String(starCount)
    const wrongs = [
      String(Math.max(3, starCount - 4)),
      String(starCount + 5),
      String(starCount + 12),
    ].filter((n) => n !== correct)
    const countQ = buildMcq(
      `Khoảng bao nhiêu sao sáng (HIP) được nối trong chòm ${label} trên bản đồ?`,
      correct,
      wrongs,
      seed + 7,
    )
    if (countQ) candidates.push(countQ)
  }

  if (target.zodiac) {
    const zodiacQ = buildMcq(
      `Chòm ${label} có thuộc vòng hoàng đạo không?`,
      'Có — nằm trên vòng hoàng đạo',
      [
        'Không — chỉ visible ở cực',
        'Không — là chòm cực nam',
        'Chỉ vào ban ngày',
      ],
      seed + 8,
    )
    if (zodiacQ) candidates.push(zodiacQ)
  }

  const concept = concepts.find((c) => String(c.title || '').trim())
  if (concept?.title) {
    const peerTitles = pickDistinct(
      concepts.map((c) => String(c.title || '').trim()).filter((t) => t && t !== concept.title),
      3,
      seed + 9,
    )
    const conceptQ = buildMcq(
      `Khái niệm nào gắn với chòm ${label} trên lộ trình học?`,
      concept.title,
      peerTitles.length >= 2
        ? peerTitles
        : ['Quỹ đạo hành tinh', 'Vành đai Sao', 'Sao lùn', 'Từ trường'],
      seed + 10,
    )
    if (conceptQ) candidates.push(conceptQ)
  }

  return shuffle(candidates, seed + 99).slice(0, limit)
}
