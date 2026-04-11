import { notFound } from 'next/navigation'
import { getModuleById } from '@/data/learningPathCurriculum'
import LearningModuleView from '@/components/learning-path/LearningModuleView'

type Props = { params: { moduleId: string } }

export function generateMetadata({ params }: Props) {
  const mod = getModuleById(params.moduleId)
  if (!mod) return { title: 'Module | Galaxies' }
  return {
    title: `${mod.titleVi} | Learning Path`,
    description: mod.goalVi,
  }
}

export default function TutorialModulePage({ params }: Props) {
  const mod = getModuleById(params.moduleId)
  if (!mod) notFound()
  return <LearningModuleView module={mod} />
}
