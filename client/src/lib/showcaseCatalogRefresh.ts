/** Cross-route/sync: Studio lưu bundle showcase → Explore refetch được CMS & orbit đã hydrate. */
export const SHOWCASE_CATALOG_CHANGED_EVENT = 'galaxies-showcase-catalog-changed'

export function notifyShowcaseCatalogChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SHOWCASE_CATALOG_CHANGED_EVENT))
}
