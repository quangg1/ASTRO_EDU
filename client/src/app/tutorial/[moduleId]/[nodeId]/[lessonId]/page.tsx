import { notFound } from 'next/navigation'
import { getLessonById } from '@/data/learningPathCurriculum'
import { getMergedLearningPathData } from '@/lib/learningPathServer'
import LearningLessonView from '@/components/learning-path/LearningLessonView'

/** Luôn lấy learning path + concepts mới (conceptAnchors, nội dung bài). */
export const dynamic = 'force-dynamic'

type Props = { params: { moduleId: string; nodeId: string; lessonId: string } }

export async function generateMetadata({ params }: Props) {
  const id = decodeURIComponent(params.lessonId)
  const { modules } = await getMergedLearningPathData()
  const hit = getLessonById(id, modules)
  if (!hit) return { title: 'Bài học | Galaxies' }
  return {
    title: `${hit.lesson.titleVi} | ${hit.node.titleVi}`,
    description: hit.lesson.title || hit.lesson.titleVi,
  }
}

export default async function TutorialLessonPage({ params }: Props) {
  const id = decodeURIComponent(params.lessonId)
  const { modules, concepts } = await getMergedLearningPathData()
  const hit = getLessonById(id, modules)
  if (!hit) notFound()
  return (
    <LearningLessonView
      modules={modules}
      concepts={concepts}
      module={hit.module}
      node={hit.node}
      depth={hit.depth}
      lesson={hit.lesson}
    />
  )
}
