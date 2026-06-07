/**
 * Explore scene context passed from client sessionContext — timeline beat, pin, iconic organisms, sky.
 * @param {Record<string, unknown>|null|undefined} sessionContext
 */
function buildExploreSceneContext(sessionContext) {
  if (sessionContext?.surface !== 'explore') return null;

  /** @type {Record<string, unknown>} */
  const out = {};

  const beatId = sessionContext.narrativeBeatId;
  const beatName = sessionContext.narrativeBeatName;
  if (beatId != null || (typeof beatName === 'string' && beatName.trim())) {
    out.narrativeBeat = {
      id: beatId ?? null,
      name: typeof beatName === 'string' ? beatName.trim() : null,
      timeMa:
        sessionContext.narrativeBeatTimeMa ?? sessionContext.stageTimeMa ?? null,
      ageLabelVi:
        typeof sessionContext.narrativeBeatAgeLabel === 'string'
          ? sessionContext.narrativeBeatAgeLabel.trim()
          : null,
    };
  }

  const site = sessionContext.selectedSite;
  if (site && typeof site === 'object' && !Array.isArray(site)) {
    const nameVi = typeof site.nameVi === 'string' ? site.nameVi.trim() : '';
    if (nameVi || site.siteId) {
      out.selectedSite = {
        siteId: site.siteId ?? null,
        nameVi: nameVi || null,
        kind: typeof site.kind === 'string' ? site.kind : null,
        blurbVi:
          typeof site.blurbVi === 'string' ? site.blurbVi.trim().slice(0, 400) : null,
      };
    }
  }

  if (Array.isArray(sessionContext.iconicOrganisms) && sessionContext.iconicOrganisms.length) {
    out.iconicOrganisms = sessionContext.iconicOrganisms.slice(0, 8).map((row) => {
      if (!row || typeof row !== 'object') return null;
      return {
        nameVi: row.nameVi ?? null,
        name: row.name ?? null,
        description:
          typeof row.description === 'string' ? row.description.slice(0, 220) : null,
        hasModel3d: Boolean(row.hasModel3d),
      };
    }).filter(Boolean);
  }

  const sky = sessionContext.skyContext;
  if (sky && typeof sky === 'object' && !Array.isArray(sky)) {
    out.sky = {
      pinnedTargetId: sky.pinnedTargetId ?? null,
      pinnedTargetLabel: sky.pinnedTargetLabel ?? null,
      pinnedTargetKind: sky.pinnedTargetKind ?? null,
      sceneHighlightId: sky.sceneHighlightId ?? null,
      sceneHighlightLabel: sky.sceneHighlightLabel ?? null,
      observerLatDeg: sky.observerLatDeg ?? null,
      observerLonDeg: sky.observerLonDeg ?? null,
      observerTimeIso: sky.observerTimeIso ?? null,
      observerLocationLabel: sky.observerLocationLabel ?? null,
      lightPollution: sky.lightPollution ?? null,
      museumBlurbVi:
        typeof sky.museumBlurbVi === 'string' ? sky.museumBlurbVi.slice(0, 400) : null,
    };
  }

  return Object.keys(out).length ? out : null;
}

module.exports = { buildExploreSceneContext };
