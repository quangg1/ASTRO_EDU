const express = require('express');

const ShowcaseCatalogBundle = require('../models/ShowcaseCatalogBundle');
const { getBySlug } = require('../narrative/services/narrativeSpace.service');

const router = express.Router();

function pickRelatedEntities(catalog, orbits, worldBodySlug) {
  const body = String(worldBodySlug || '').trim().toLowerCase();
  if (!body) return [];
  const orbitMap = new Map((Array.isArray(orbits) ? orbits : []).map((x) => [String(x?.id || '').trim(), x]));
  return (Array.isArray(catalog) ? catalog : [])
    .filter((item) => String(item?.id || '').trim().toLowerCase() === body)
    .map((item) => {
      const id = String(item?.id || '').trim();
      const orbit = orbitMap.get(id) || null;
      return {
        id,
        name: item?.name || '',
        nameVi: item?.nameVi || '',
        group: item?.group || '',
        textureUrl: item?.diffuseMapUrl || item?.textureUrl || '',
        orbit: orbit
          ? {
              parentId: orbit.parentId || '',
              orbitAround: orbit.orbitAround || '',
              orbitColor: orbit.orbitColor || '',
              orbitalElements: orbit.orbitalElements || null,
            }
          : null,
      };
    });
}

/**
 * One endpoint for 3D runtime: narrative + related showcase config.
 * Keeps old endpoints unchanged; this is a bridge for scene composition.
 */
router.get('/spaces/:slug/context', async (req, res) => {
  try {
    const narrative = await getBySlug(req.params.slug);
    if (!narrative) return res.status(404).json({ success: false, error: 'Narrative space not found' });
    const bundle = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const relatedEntities = pickRelatedEntities(bundle?.catalog || [], bundle?.orbits || [], narrative?.world?.bodySlug);
    return res.json({
      success: true,
      data: {
        narrative,
        scene3d: {
          bodySlug: narrative?.world?.bodySlug || '',
          effectTags: Array.isArray(narrative?.world?.effectTags) ? narrative.world.effectTags : [],
          relatedEntities,
        },
      },
    });
  } catch (error) {
    console.error('Get content3d space context failed:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
