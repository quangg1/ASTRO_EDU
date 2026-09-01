import { notFound } from 'next/navigation'
import { getMergedLearningModules } from '@/features/learning-path/server'
import { LearningNodeView } from '@/features/learning-path/public'

type Props = { params: { moduleId: string; nodeId: string } }

export async function generateMetadata({ params }: Props) {
  const modules = await getMergedLearningModules()
  const mod = modules.find((m) => m.id === params.moduleId)
  const node = mod?.nodes.find((n) => n.id === params.nodeId)
  if (!mod || !node) return { title: 'Chủ đề' }
  return {
    title: `${node.titleVi} | ${mod.titleVi}`,
    description: `${mod.emoji} ${node.title}`,
  }
}

export default async function TutorialNodePage({ params }: Props) {
  const modules = await getMergedLearningModules()
  const mod = modules.find((m) => m.id === params.moduleId)
  const node = mod?.nodes.find((n) => n.id === params.nodeId)
  if (!mod || !node) notFound()
  return <LearningNodeView module={mod} node={node} />
}
