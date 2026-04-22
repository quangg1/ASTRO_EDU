import { notFound } from 'next/navigation'
import { getMergedLearningModules } from '@/lib/learningPathServer'
import LearningModuleView from '@/components/learning-path/LearningModuleView'

type Props = { params: { moduleId: string } }

export async function generateMetadata({ params }: Props) {
  const modules = await getMergedLearningModules()
  const mod = modules.find((m) => m.id === params.moduleId)
  if (!mod) return { title: 'Module | Galaxies' }
  return {
    title: `${mod.titleVi} | Learning Path`,
    description: mod.goalVi,
  }
}

export const dynamic = 'force-dynamic'

export default async function TutorialModulePage({ params }: Props) {
  const modules = await getMergedLearningModules()
  const mod = modules.find((m) => m.id === params.moduleId)
  if (!mod) notFound()
  return <LearningModuleView module={mod} />
}
