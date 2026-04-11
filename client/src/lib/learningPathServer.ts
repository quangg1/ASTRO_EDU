import {
  LEARNING_CONCEPTS,
  LEARNING_MODULES,
  mergeLearningModules,
  type LearningConcept,
  type LearningModule,
} from '@/data/learningPathCurriculum'
import { getApiPathBase } from '@/lib/apiConfig'

/** Server-only: merge API learning path with static defaults */
export async function getMergedLearningModules(): Promise<LearningModule[]> {
  try {
    const base = getApiPathBase()
    const res = await fetch(`${base}/learning-path`, { cache: 'no-store' })
    const data = await res.json()
    if (data.success && Array.isArray(data.data?.modules) && data.data.modules.length > 0) {
      return mergeLearningModules(LEARNING_MODULES, data.data.modules)
    }
  } catch {
    /* API down — static only */
  }
  return LEARNING_MODULES
}

export async function getMergedLearningPathData(): Promise<{
  modules: LearningModule[]
  concepts: LearningConcept[]
}> {
  try {
    const base = getApiPathBase()
    const [lpRes, conceptRes] = await Promise.all([
      fetch(`${base}/learning-path`, { cache: 'no-store' }),
      fetch(`${base}/concepts`, { cache: 'no-store' }),
    ])
    const [lpData, conceptData] = await Promise.all([lpRes.json(), conceptRes.json()])
    const modules =
      lpData.success && Array.isArray(lpData.data?.modules) && lpData.data.modules.length > 0
        ? mergeLearningModules(LEARNING_MODULES, lpData.data.modules)
        : LEARNING_MODULES
    const concepts =
      conceptData.success && Array.isArray(conceptData.data?.concepts) && conceptData.data.concepts.length > 0
        ? (conceptData.data.concepts as LearningConcept[])
        : LEARNING_CONCEPTS
    return { modules, concepts }
  } catch {
    /* API down — static only */
  }
  return { modules: LEARNING_MODULES, concepts: LEARNING_CONCEPTS }
}
