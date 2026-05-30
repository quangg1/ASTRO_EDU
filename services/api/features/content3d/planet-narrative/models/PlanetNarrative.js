const mongoose = require('mongoose');

const planetNarrativeSchema = new mongoose.Schema(
  {
    entityId: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    kind: { type: String, enum: ['mars', 'earth', 'generic'], default: 'generic' },
    /** Unified narrative beats (schema NarrativeBeat). */
    beats: { type: mongoose.Schema.Types.Mixed, default: [] },
    /** @deprecated alias — kept for documents saved before beats key */
    stages: { type: mongoose.Schema.Types.Mixed, default: [] },
    sites: { type: mongoose.Schema.Types.Mixed, default: [] },
    panelSchema: { type: mongoose.Schema.Types.Mixed, default: null },
    stageVisuals: { type: mongoose.Schema.Types.Mixed, default: {} },
    published: { type: Boolean, default: true },
    linkedLessonIds: { type: [String], default: [] },
    linkedConceptIds: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'planet_narratives' },
);

planetNarrativeSchema.index({ entityId: 1 });

module.exports =
  mongoose.models.PlanetNarrative || mongoose.model('PlanetNarrative', planetNarrativeSchema);
