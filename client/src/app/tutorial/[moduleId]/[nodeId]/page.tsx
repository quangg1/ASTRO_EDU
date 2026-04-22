import { notFound } from 'next/navigation'
import { getMergedLearningModules } from '@/lib/learningPathServer'
import LearningNodeView from '@/components/learning-path/LearningNodeView'

type Props = { params: { moduleId: string; nodeId: string } }

export async function generateMetadata({ params }: Props) {
  const modules = await getMergedLearningModules()
  const mod = modules.find((m) => m.id === params.moduleId)
  const node = mod?.nodes.find((n) => n.id === params.nodeId)
  if (!mod || !node) return { title: 'Chủ đề | Galaxies' }
  return {
    title: `${node.titleVi} | ${mod.titleVi}`,
    description: `${mod.emoji} ${node.title}`,
  }
}

export const dynamic = 'force-dynamic'

export default async function TutorialNodePage({ params }: Props) {
  const modules = await getMergedLearningModules()
  const mod = modules.find((m) => m.id === params.moduleId)
  const node = mod?.nodes.find((n) => n.id === params.nodeId)
  if (!mod || !node) notFound()
  return <LearningNodeView module={mod} node={node} />
}
