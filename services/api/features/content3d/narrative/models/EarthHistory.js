const mongoose = require('mongoose');

const majorEventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameEn: String,
    description: String,
    type: { type: String, enum: ['volcanic', 'impact', 'climate', 'biological', 'tectonic', 'extinction', 'evolution'] },
    magnitude: Number,
  },
  { _id: false }
);

const lifeformSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameEn: String,
    type: { type: String, enum: ['bacteria','archaea','protist','plant','fungi','invertebrate','fish','amphibian','reptile','dinosaur','bird','mammal','human'] },
    description: String,
    imageUrl: String,
    firstAppearance: Boolean,
    dominant: Boolean,
  },
  { _id: false }
);

const continentSchema = new mongoose.Schema({ name: String, lat: Number, lng: Number, rotation: Number }, { _id: false });

const earthHistoryStageSchema = new mongoose.Schema(
  {
    stageId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String, required: true },
    icon: { type: String, default: '🌍' },
    time: { type: Number, required: true },
    timeEnd: Number,
    timeDisplay: String,
    timeDisplayEn: String,
    eon: { type: String, enum: ['Hadean', 'Archean', 'Proterozoic', 'Phanerozoic'], required: true },
    era: String,
    period: String,
    epoch: String,
    atmosphere: { o2: { type: Number, default: 21 }, co2: { type: Number, default: 420 }, n2: { type: Number, default: 78 }, ch4: Number, pressure: { type: Number, default: 1 } },
    climate: { globalTemp: Number, tempAnomaly: Number, seaLevel: Number, iceCoverage: Number, oceanTemp: Number },
    astronomy: { dayLength: { type: Number, default: 24 }, yearLength: Number, moonDistance: Number, solarLuminosity: Number },
    continental: { config: { type: String, enum: ['protoearth', 'scattered', 'rodinia', 'pannotia', 'gondwana', 'pangaea', 'laurasia_gondwana', 'modern'], default: 'modern' }, continents: [continentSchema], oceanCoverage: { type: Number, default: 71 }, landArea: Number },
    life: { exists: { type: Boolean, default: false }, complexity: { type: String, enum: ['none', 'prokaryote', 'eukaryote', 'multicellular', 'complex', 'intelligent'], default: 'none' }, dominantLifeforms: [lifeformSchema], biodiversityIndex: Number, extinctionRate: Number, oxygenProducers: Boolean, landLife: Boolean, aerialLife: Boolean },
    majorEvents: [majorEventSchema],
    visual: { earthColor: { type: String, default: '#6B93D6' }, earthEmissive: { type: String, default: '#112244' }, emissiveIntensity: { type: Number, default: 0.2 }, atmosphereColor: String, atmosphereOpacity: { type: Number, default: 0.2 }, surfaceType: { type: String, enum: ['dust','molten','hellish','cratered','ocean_early','early_life','oxidation','snowball','cambrian','ordovician','devonian','carboniferous','extinction','triassic','jurassic','cretaceous','asteroid_impact','paleogene','neogene','ice_age','modern'], default: 'modern' }, textureUrl: String, normalMapUrl: String, cloudsTextureUrl: String, nightTextureUrl: String },
    flags: { hasDebris: { type: Boolean, default: false }, hasMoon: { type: Boolean, default: true }, hasMeteorites: { type: Boolean, default: false }, hasRings: { type: Boolean, default: false }, isCollision: { type: Boolean, default: false }, isExtinction: { type: Boolean, default: false }, isAsteroidImpact: { type: Boolean, default: false } },
    description: { vi: { type: String, required: true }, en: String },
    resources: { wikipediaUrl: String, videoUrl: String, references: [String] },
    order: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'earth_history_stages' }
);

earthHistoryStageSchema.index({ time: -1 });
earthHistoryStageSchema.index({ eon: 1, era: 1, period: 1 });
earthHistoryStageSchema.index({ order: 1 });
earthHistoryStageSchema.statics.getAllStages = function getAllStages() { return this.find({ isActive: true }).sort({ order: 1 }); };
earthHistoryStageSchema.statics.getByTimeRange = function getByTimeRange(startMya, endMya) { return this.find({ time: { $lte: startMya, $gte: endMya }, isActive: true }).sort({ time: -1 }); };
earthHistoryStageSchema.statics.getExtinctionEvents = function getExtinctionEvents() { return this.find({ 'flags.isExtinction': true, isActive: true }).sort({ time: -1 }); };
earthHistoryStageSchema.statics.getByEon = function getByEon(eon) { return this.find({ eon, isActive: true }).sort({ order: 1 }); };

module.exports = mongoose.models.EarthHistory || mongoose.model('EarthHistory', earthHistoryStageSchema);
