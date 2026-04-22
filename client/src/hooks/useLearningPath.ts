'use client'

import { useEffect, useState } from 'react'
import {
  LEARNING_CONCEPTS,
  LEARNING_MODULES,
  type LearningConcept,
  type LearningModule,
} from '@/data/learningPathCurriculum'
import { fetchPublicLearningPath } from '@/lib/learningPathApi'
import { fetchPublicConcepts } from '@/lib/conceptsApi'

export function useLearningPath() {
  const [modules, setModules] = useState<LearningModule[]>(LEARNING_MODULES)
  const [concepts, setConcepts] = useState<LearningConcept[]>(LEARNING_CONCEPTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPublicLearningPath(), fetchPublicConcepts()]).then(([incomingModules, incomingConcepts]) => {
      if (cancelled) return
      if (incomingModules?.length) {
        // Source of truth: DB learning path structure (module/node/lesson ids and ordering)
        setModules(incomingModules)
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
