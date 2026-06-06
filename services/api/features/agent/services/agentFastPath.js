const { resolveSmallTalkFastPath } = require('./smallTalkFastPath');
const { resolveFaqFastPath } = require('./agentFaqStatic');
const { lookupExact, lookupSemantic, storeExact } = require('./agentResponseCache');

/**
 * Thử P0 small talk → P1 FAQ → cache exact → P2 semantic.
 * @returns {Promise<{ source: string, content: string, cacheEntryId?: string } | null>}
 */
async function resolveAgentFastPath({ userMessage, sessionContext, hasImage }) {
  if (hasImage) return null;
  const text = String(userMessage || '').trim();
  if (!text) return null;

  const surface = sessionContext?.surface || 'general';

  const small = resolveSmallTalkFastPath(text);
  if (small) {
    return {
      source: small.source,
      kind: small.kind,
      content: small.content,
    };
  }

  const faq = resolveFaqFastPath(text);
  if (faq) {
    const cacheEntryId = await storeExact(text, faq.content, surface, `faq:${faq.faqKey}`);
    return {
      source: faq.source,
      content: faq.content,
      cacheEntryId,
    };
  }

  const exact = await lookupExact(text, surface);
  if (exact) return exact;

  const semantic = await lookupSemantic(text, surface);
  if (semantic) return semantic;

  return null;
}

module.exports = { resolveAgentFastPath };
