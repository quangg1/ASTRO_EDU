const mongoose = require('mongoose');

// Schema cho các sự kiện lớn
const majorEventSchema = new mongoose.Schema({
    name: { type: String, required: true },
    nameEn: String,
    description: String,
    type: { 
        type: String, 
        enum: ['volcanic', 'impact', 'climate', 'biological', 'tectonic', 'extinction', 'evolution']
    },
    magnitude: Number // 1-10 scale
}, { _id: false });

// Schema cho sinh vật tiêu biểu
const lifeformSchema = new mongoose.Schema({
    name: { type: String, required: true },
    nameEn: String,
    type: { 
        type: String, 
        enum: ['bacteria', 'archaea', 'protist', 'plant', 'fungi', 'invertebrate', 'fish', 'amphibian', 'reptile', 'dinosaur', 'bird', 'mammal', 'human']
    },
    description: String,
    imageUrl: String,
    firstAppearance: Boolean,
    dominant: Boolean
}, { _id: false });

// Schema cho vị trí lục địa (simplified)
const continentSchema = new mongoose.Schema({
    name: String,
    lat: Number,
    lng: Number,
    rotation: Number
}, { _id: false });

// Main Earth History Stage Schema
const earthHistoryStageSchema = new mongoose.Schema({
    // Basic Info
    stageId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    nameEn: { type: String, required: true },
    icon: { type: String, default: '🌍' },
    
    // Time
    time: { type: Number, required: true }, // Million Years Ago (MYA)
    timeEnd: Number, // End of period (MYA)
    timeDisplay: String,
    timeDisplayEn: String,
    
    // Geological Classification
    eon: { 
        type: String, 
        enum: ['Hadean', 'Archean', 'Proterozoic', 'Phanerozoic'],
        required: true
    },
    era: String,
    period: String,
    epoch: String,
    
    // Atmosphere
    atmosphere: {
        o2: { type: Number, default: 21 }, // Percentage
        co2: { type: Number, default: 420 }, // ppm
        n2: { type: Number, default: 78 }, // Percentage
        ch4: Number, // ppm (methane)
        pressure: { type: Number, default: 1 } // atm
    },
    
    // Climate
    climate: {
        globalTemp: Number, // °C global average
        tempAnomaly: Number, // °C difference from present
        seaLevel: Number, // meters relative to present
        iceCoverage: Number, // percentage of surface
        oceanTemp: Number // °C average ocean temperature
    },
    
    // Astronomy
    astronomy: {
        dayLength: { type: Number, default: 24 }, // hours
        yearLength: Number, // days
        moonDistance: Number, // thousands of km
        solarLuminosity: Number // relative to present (1.0)
    },
    
    // Continental Configuration
    continental: {
        config: { 
            type: String, 
            enum: ['protoearth', 'scattered', 'rodinia', 'pannotia', 'gondwana', 'pangaea', 'laurasia_gondwana', 'modern'],
            default: 'modern'
        },
        continents: [continentSchema],
        oceanCoverage: { type: Number, default: 71 }, // percentage
        landArea: Number // million km²
    },
    
    // Life
    life: {
        exists: { type: Boolean, default: false },
        complexity: { 
            type: String, 
            enum: ['none', 'prokaryote', 'eukaryote', 'multicellular', 'complex', 'intelligent'],
            default: 'none'
        },
        dominantLifeforms: [lifeformSchema],
        biodiversityIndex: Number, // 0-100 scale
        extinctionRate: Number, // percentage of species lost (if extinction event)
        oxygenProducers: Boolean,
        landLife: Boolean,
        aerialLife: Boolean
    },
    
    // Major Events
    majorEvents: [majorEventSchema],
    
    // Visual Properties for Three.js
    visual: {
        earthColor: { type: String, default: '#6B93D6' },
        earthEmissive: { type: String, default: '#112244' },
        emissiveIntensity: { type: Number, default: 0.2 },
        atmosphereColor: String,
        atmosphereOpacity: { type: Number, default: 0.2 },
        surfaceType: { 
            type: String, 
            enum: ['dust', 'molten', 'hellish', 'cratered', 'ocean_early', 'early_life', 'oxidation', 'snowball', 'cambrian', 'ordovician', 'devonian', 'carboniferous', 'extinction', 'triassic', 'jurassic', 'cretaceous', 'asteroid_impact', 'paleogene', 'neogene', 'ice_age', 'modern'],
            default: 'modern'
        },
        textureUrl: String,
        normalMapUrl: String,
        cloudsTextureUrl: String,
        nightTextureUrl: String
    },
    
    // Flags
    flags: {
        hasDebris: { type: Boolean, default: false },
        hasMoon: { type: Boolean, default: true },
        hasMeteorites: { type: Boolean, default: false },
        hasRings: { type: Boolean, default: false },
        isCollision: { type: Boolean, default: false },
        isExtinction: { type: Boolean, default: false },
        isAsteroidImpact: { type: Boolean, default: false }
    },
    
    // Description (multilingual)
    description: {
        vi: { type: String, required: true },
        en: String
    },
    
    // Additional Resources
    resources: {
        wikipediaUrl: String,
        videoUrl: String,
        references: [String]
    },
    
    // Metadata
    order: { type: Number, required: true }, // Display order
    isActive: { type: Boolean, default: true }
    
}, { 
    timestamps: true,
    collection: 'earth_history_stages'
});

// Indexes (stageId đã có unique index — không khai báo thêm)
earthHistoryStageSchema.index({ time: -1 });
earthHistoryStageSchema.index({ eon: 1, era: 1, period: 1 });
earthHistoryStageSchema.index({ order: 1 });

// Virtual for formatted time
earthHistoryStageSchema.virtual('formattedTime').get(function() {
    if (this.time >= 1000) {
        return `${(this.time / 1000).toFixed(1)} tỷ năm trước`;
    } else if (this.time >= 1) {
        return `${Math.round(this.time)} triệu năm trước`;
    } else if (this.time > 0) {
        return `${Math.round(this.time * 1000)} nghìn năm trước`;
    }
    return 'Hiện tại';
});

// Static methods
earthHistoryStageSchema.statics.getAllStages = function() {
    return this.find({ isActive: true }).sort({ order: 1 });
};

earthHistoryStageSchema.statics.getByTimeRange = function(startMya, endMya) {
    return this.find({ 
        time: { $lte: startMya, $gte: endMya },
        isActive: true 
    }).sort({ time: -1 });
};

earthHistoryStageSchema.statics.getExtinctionEvents = function() {
    return this.find({ 
        'flags.isExtinction': true,
        isActive: true 
    }).sort({ time: -1 });
};

earthHistoryStageSchema.statics.getByEon = function(eon) {
    return this.find({ eon, isActive: true }).sort({ order: 1 });
};

const EarthHistory = mongoose.model('EarthHistory', earthHistoryStageSchema);

module.exports = EarthHistory;
