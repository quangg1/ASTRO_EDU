const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

let cachedPayload = null;

function loadSkySeed() {
  if (cachedPayload) return cachedPayload;
  const filePath = path.join(__dirname, '../../../data/skyExploreSeed.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  cachedPayload = JSON.parse(raw);
  return cachedPayload;
}

/** Public catalog for La bàn chòm sao (sky view) — positions are education MVP. */
router.get('/', (_req, res) => {
  try {
    const data = loadSkySeed();
    res.json({
      version: data.version,
      attribution: data.attribution,
      targets: data.targets || [],
    });
  } catch (err) {
    res.status(500).json({ error: 'sky_targets_unavailable', message: String(err?.message || err) });
  }
});

module.exports = router;
