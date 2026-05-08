export type ShowcaseEntityRef = {
  id: string
  name: string
  parentId?: string | null
}

export type ShowcaseCameraState = {
  dist: number
  az: number
  el: number
}
