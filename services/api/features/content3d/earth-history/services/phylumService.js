const { phylumMetadataRepository } = require('../repositories/earthHistoryRepository');

const DEFAULT_PHYLUM_COLOR = '#9ca3af';

/** Client tra cứu theo tên ngành nên trả về map thay vì mảng. */
async function getMetadataByPhylum(locale) {
  const docs = await phylumMetadataRepository.listForLocale(locale);
  return Object.fromEntries(
    docs.map((doc) => [
      doc.phylum,
      {
        nameVi: doc.nameVi || '',
        description: doc.description || '',
        color: doc.color || DEFAULT_PHYLUM_COLOR,
      },
    ]),
  );
}

module.exports = { getMetadataByPhylum };
