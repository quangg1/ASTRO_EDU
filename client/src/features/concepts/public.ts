/**
 * Public surface for the concepts kernel — read-mostly API; no UI/stores here.
 * @see DOMAIN_MAP.md
 */
export {
  FALLBACK_TAXONOMY_REGISTRY,
  fetchEditorConcepts,
  fetchPublicConcepts,
  fetchTaxonomyRegistryEditor,
  saveEditorConcepts,
  saveTaxonomyRegistryEditor,
} from './api/conceptsApi'
export type { TaxonomyRegistry } from './api/conceptsApi'
export type { ConceptAnchorInput } from './lib/conceptAnchorsHtml'
export { applyConceptAnchorsToHtml } from './lib/conceptAnchorsHtml'
export * from './lib/knowledgeGraphData'
