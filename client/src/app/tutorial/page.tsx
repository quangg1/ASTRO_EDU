import { LearningPathHub, TutorialJourneyGuide } from '@/features/learning-path/public'

export const metadata = {
  title: 'Learning Path',
  description: 'Lộ trình học thiên văn 6 module — từ quy mô vũ trụ đến vũ trụ học.',
}

export default function TutorialPage() {
  return (
    <div className="space-y-6">
      <TutorialJourneyGuide />
      <LearningPathHub />
    </div>
  )
}
