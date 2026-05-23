import { notFound } from 'next/navigation'
import { getMergedLearningModules } from '@/features/learning-path/public'
import { tutorialNodeStaticParams } from '@/features/learning-path/lib/tutorialStaticParams'
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

export function generateStaticParams() {
  return tutorialNodeStaticParams()
}

export default async function TutorialNodePage({ params }: Props) {
  const modules = await getMergedLearningModules()
  const mod = modules.find((m) => m.id === params.moduleId)
  const node = mod?.nodes.find((n) => n.id === params.nodeId)
  if (!mod || !node) notFound()
  return <LearningNodeView module={mod} node={node} />
}
