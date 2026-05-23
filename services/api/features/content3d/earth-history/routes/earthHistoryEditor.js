const express = require('express');
const EarthHistory = require('../models/EarthHistory');
const { authMiddleware, requireRole } = require('../../../../shared/jwtAuth');

const router = express.Router();

function mapClientStageToDoc(raw, orderFallback) {
  const stageId = Number(raw?.id ?? raw?.stageId);
  if (!Number.isFinite(stageId)) return null;
  const name = String(raw?.name || '').trim();
  if (!name) return null;
  const time = Number(raw?.time);
  const eon = String(raw?.eon || 'Phanerozoic').trim();
  const desc = String(raw?.description || '').trim();

  return {
    stageId,
    name,
    nameEn: String(raw?.nameEn || name).trim(),
    icon: String(raw?.icon || '🌍').trim().slice(0, 8),
    time: Number.isFinite(time) ? time : 0,
    timeEnd: raw?.minMa != null ? Number(raw.minMa) : raw?.timeEnd != null ? Number(raw.timeEnd) : undefined,
    timeDisplay: String(raw?.timeDisplay || '').trim(),
    eon: ['Hadean', 'Archean', 'Proterozoic', 'Phanerozoic'].includes(eon) ? eon : 'Phanerozoic',
    era: raw?.era ? String(raw.era) : null,
    period: raw?.period ? String(raw.period) : null,
    atmosphere: {
      o2: Number(raw?.o2) || 0,
      co2: Number(raw?.co2) || 0,
    },
    astronomy: {
      dayLength: Number(raw?.dayLength) || 24,
    },
    visual: {
      earthColor: String(raw?.earthColor || '#6B93D6').trim(),
      textureUrl: raw?.textureUrl ? String(raw.textureUrl).trim() : undefined,
    },
    flags: {
      hasDebris: Boolean(raw?.hasDebris),
      hasMeteorites: Boolean(raw?.hasMeteorites),
      hasMoon: raw?.hasMoon !== false,
      isExtinction: Boolean(raw?.isExtinction),
    },
    description: { vi: desc || name, en: String(raw?.descriptionEn || '').trim() || undefined },
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : orderFallback,
    isActive: true,
  };
}

router.put('/bulk', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const items = Array.isArray(req.body?.stages) ? req.body.stages : [];
    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'stages[] trống' });
    }
    const docs = [];
    items.forEach((raw, i) => {
      const doc = mapClientStageToDoc(raw, i + 1);
      if (doc) docs.push(doc);
    });
    if (docs.length === 0) {
      return res.status(400).json({ success: false, error: 'Không có stage hợp lệ' });
    }

    await Promise.all(
      docs.map((doc) =>
        EarthHistory.findOneAndUpdate(
          { stageId: doc.stageId },
          { $set: doc },
          { upsert: true },
        ),
      ),
    );

    const stages = await EarthHistory.getAllStages();
    res.json({ success: true, count: stages.length, data: stages });
  } catch (err) {
    console.error('PUT earth-history/editor/bulk', err);
    res.status(500).json({ success: false, error: err.message || 'Lỗi máy chủ' });
  }
});

module.exports = router;
