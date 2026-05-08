'use client'

import { useEffect, useState } from 'react'
import {
  LEARNING_CONCEPTS,
  LEARNING_MODULES,
  type LearningConcept,
  type LearningModule,
} from '@/data/learningPathCurriculum'
import { fetchPublicConcepts } from '@/features/concepts/public'
import { fetchPublicLearningPathData } from '@/features/learning-path/api/learningPathApi'

export function useLearningPath() {
  const [modules, setModules] = useState<LearningModule[]>(LEARNING_MODULES)
  const [concepts, setConcepts] = useState<LearningConcept[]>(LEARNING_CONCEPTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPublicLearningPathData(), fetchPublicConcepts()]).then(([incomingPath, incomingConcepts]) => {
      if (cancelled) return
      if (incomingPath?.modules?.length) {
        // Source of truth: DB learning path structure (module/node/lesson ids and ordering)
        setModules(incomingPath.modules)
      }
      if (incomingConcepts?.length) {
        setConcepts(incomingConcepts)
      }
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { modules, concepts, loaded, setModules }
}
