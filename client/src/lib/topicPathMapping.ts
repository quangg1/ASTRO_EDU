import type { LearningModule, LearningNode, TopicWeight } from '@/data/learningPathCurriculum'

export type { TopicWeight }

/** Trọng số theo topic (0–1). Node không có field → không hiện trong topic đó (trừ khi fallback). */
export function getNodeWeightForTopic(node: LearningNode, topicId: string): number {
  const tw = node.topicWeights
  if (!tw?.length) return 0
  const hit = tw.find((x) => x.topicId === topicId)
  return hit?.weight ?? 0
}

export type TopicNodeGroup = {
  module: LearningModule
  nodes: { node: LearningNode; weight: number }[]
}

/**
 * Gom node theo module, chỉ giữ node có weight > 0 cho topic; sắp xếp theo weight giảm dần trong module.
 */
export function groupNodesByTopic(modules: LearningModule[], topicId: string, minWeight = 0.15): TopicNodeGroup[] {
  const sorted = [...modules].sort((a, b) => a.order - b.order)
  const out: TopicNodeGroup[] = []

  for (const mod of sorted) {
    const nodes: { node: LearningNode; weight: number }[] = []
    for (const node of mod.nodes) {
      const w = getNodeWeightForTopic(node, topicId)
      if (w >= minWeight) nodes.push({ node, weight: w })
    }
    nodes.sort((a, b) => b.weight - a.weight)
    if (nodes.length) out.push({ module: mod, nodes })
  }

  return out
}
