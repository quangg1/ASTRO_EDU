import { notFound } from 'next/navigation'
import { getMergedLearningModules } from '@/features/learning-path/server'
import { LearningModuleView } from '@/features/learning-path/public'

type Props = { params: { moduleId: string } }

export async function generateMetadata({ params }: Props) {
  const modules = await getMergedLearningModules()
  const mod = modules.find((m) => m.id === params.moduleId)
  if (!mod) return { title: 'Module' }
  return {
    title: `${mod.titleVi} | Learning Path`,
    description: mod.goalVi,
  }
}

export default async function TutorialModulePage({ params }: Props) {
  const modules = await getMergedLearningModules()
  const mod = modules.find((m) => m.id === params.moduleId)
  if (!mod) notFound()
  return <LearningModuleView module={mod} />
}
