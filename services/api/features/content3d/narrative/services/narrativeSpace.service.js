const NarrativeSpace = require('../models/NarrativeSpace');

async function getBySlug(slug) {
  return NarrativeSpace.findOne({ slug, published: true }).lean();
}

async function getBySlugForEditor(slug) {
  return NarrativeSpace.findOne({ slug }).lean();
}

async function upsertBySlug(slug, payload) {
  const existing = await NarrativeSpace.findOne({ slug }).lean();
  const next = { ...payload, slug };
  if (typeof payload.published !== 'boolean') {
    next.published = existing ? !!existing.published : false;
  }
  return NarrativeSpace.findOneAndUpdate(
    { slug },
    { $set: next },
    { new: true, upsert: true }
  ).lean();
}

async function setPublishedBySlug(slug, published) {
  return NarrativeSpace.findOneAndUpdate(
    { slug },
    { $set: { published: !!published } },
    { new: true }
  ).lean();
}

module.exports = {
  getBySlug,
  getBySlugForEditor,
  upsertBySlug,
  setPublishedBySlug,
};
