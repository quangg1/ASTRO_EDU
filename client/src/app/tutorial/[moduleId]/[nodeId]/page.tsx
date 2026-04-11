import { notFound } from 'next/navigation'
import { getModuleById, getNodeByIds } from '@/data/learningPathCurriculum'
import LearningNodeView from '@/components/learning-path/LearningNodeView'

type Props = { params: { moduleId: string; nodeId: string } }

export function generateMetadata({ params }: Props) {
  const mod = getModuleById(params.moduleId)
  const node = getNodeByIds(params.moduleId, params.nodeId)
  if (!mod || !node) return { title: 'Chủ đề | Galaxies' }
  return {
    title: `${node.titleVi} | ${mod.titleVi}`,
    description: `${mod.emoji} ${node.title}`,
  }
}

export default function TutorialNodePage({ params }: Props) {
  const mod = getModuleById(params.moduleId)
  const node = getNodeByIds(params.moduleId, params.nodeId)
  if (!mod || !node) notFound()
  return <LearningNodeView module={mod} node={node} />
}
