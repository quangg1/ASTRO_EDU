export type CourseRef = {
  slug: string
  title: string
}

export type LessonRef = {
  slug: string
  title: string
  courseSlug?: string
}
