const mongoose = require('mongoose');

/**
 * Fossil Schema
 * Dữ liệu hóa thạch từ Paleobiology Database (PBDB)
 * Được phân chia theo thời kỳ địa chất
 */

const fossilSchema = new mongoose.Schema({
    // PBDB ID
    occurrenceNo: { type: Number, required: true, index: true },
    
    // Taxonomy (Phân loại học)
    taxonomy: {
        acceptedName: { type: String, required: true, index: true },
        acceptedRank: String, // species, genus, family, order, class, phylum
        phylum: { type: String, index: true },
        class: String,
        order: String,
        family: String,
        genus: { type: String, index: true }
    },
    
    // Time (Thời gian địa chất) - QUAN TRỌNG cho việc phân chia
    time: {
        earlyInterval: String,      // e.g., "Cambrian", "Tournaisian"
        lateInterval: String,
        maxMa: { type: Number, required: true, index: true }, // Tuổi tối đa (triệu năm)
        minMa: { type: Number, required: true, index: true }, // Tuổi tối thiểu
        timeBins: String,           // Geological time bins
        
        // Computed fields cho việc query nhanh
        eon: { type: String, index: true },      // Hadean, Archean, Proterozoic, Phanerozoic
        era: { type: String, index: true },      // Paleozoic, Mesozoic, Cenozoic
        period: { type: String, index: true }    // Cambrian, Ordovician, etc.
    },
    
    // Location - Vị trí hiện đại
    location: {
        lng: { type: Number, required: true },
        lat: { type: Number, required: true },
        country: String,
        state: String,
        county: String,
        collectionName: String
    },
    
    // Paleo Location - Vị trí cổ địa lý (RẤT QUAN TRỌNG!)
    paleoLocation: {
        paleolng: Number,
        paleolat: Number,
        paleoAge: String,  // "early", "mid", "late"
        geoplate: Number   // Mảng kiến tạo
    },
    
    // Geology
    geology: {
        formation: String,
        geologicalGroup: String,
        member: String,
        lithology: String,
        environment: String  // marine, terrestrial, freshwater
    },
    
    // Ecology
    ecology: {
        taxonEnvironment: String,    // marine invertebrate, terrestrial vertebrate, etc.
        motility: String,            // stationary, fast-moving, slow-moving
        lifeHabit: String,           // epifaunal, infaunal, pelagic, etc.
        diet: String                 // suspension feeder, deposit feeder, carnivore, etc.
    },
    
    // Abundance
    abundance: {
        value: Number,
        unit: String  // specimens, individuals
    },
    
    // Reference
    reference: {
        author: String,
        year: Number,
        referenceNo: Number
    }
    
}, {
    timestamps: true,
    collection: 'fossils'
});

// Compound indexes cho queries theo thời kỳ
fossilSchema.index({ 'time.maxMa': -1, 'time.minMa': 1 });
fossilSchema.index({ 'time.eon': 1, 'time.era': 1, 'time.period': 1 });
fossilSchema.index({ 'paleoLocation.paleolng': 1, 'paleoLocation.paleolat': 1 });
fossilSchema.index({ 'taxonomy.phylum': 1, 'time.maxMa': -1 });

// 2dsphere index cho geo queries (vị trí hiện đại)
fossilSchema.index({ 
    'location.lng': 1, 
    'location.lat': 1 
});

// Text index cho GET /api/fossils/search — tìm nhanh theo tên khi collection lớn.
// Lần đầu deploy/restart, MongoDB có thể mất vài phút để build index nếu collection rất lớn.
fossilSchema.index(
    { 'taxonomy.acceptedName': 'text' },
    { default_language: 'none', name: 'acceptedName_text' }
);

// Static: Lấy fossils theo khoảng thời gian (overlap: khoảng hóa thạch giao với [minMa, maxMa])
fossilSchema.statics.getByTimeRange = function(maxMa, minMa, options = {}) {
    const query = {
        'time.maxMa': { $gte: minMa },
        'time.minMa': { $lte: maxMa }
    };
    
    if (options.phylum) {
        query['taxonomy.phylum'] = options.phylum;
    }
    
    return this.find(query)
        .select(options.select || '-__v')
        .limit(options.limit || 1000)
        .lean();
};

// Static: Lấy fossils cho một stage cụ thể của Earth History
fossilSchema.statics.getForStage = function(stageTime, options = {}) {
    // Mở rộng khoảng thời gian một chút để bao quát
    const buffer = stageTime * 0.1 || 10; // 10% buffer hoặc 10 Ma
    
    return this.getByTimeRange(
        stageTime + buffer,
        Math.max(0, stageTime - buffer),
        options
    );
};

// Static: Đếm số loài theo thời kỳ
fossilSchema.statics.countByPeriod = async function() {
    return this.aggregate([
        {
            $group: {
                _id: '$time.period',
                count: { $sum: 1 },
                avgMaxMa: { $avg: '$time.maxMa' }
            }
        },
        { $sort: { avgMaxMa: -1 } }
    ]);
};

// Static: Lấy diverse phyla theo thời kỳ (overlap với [minMa, maxMa])
fossilSchema.statics.getPhylaDistribution = async function(maxMa, minMa) {
    return this.aggregate([
        {
            $match: {
                'time.maxMa': { $gte: minMa },
                'time.minMa': { $lte: maxMa }
            }
        },
        {
            $group: {
                _id: '$taxonomy.phylum',
                count: { $sum: 1 },
                genera: { $addToSet: '$taxonomy.genus' }
            }
        },
        {
            $project: {
                phylum: '$_id',
                count: 1,
                generaCount: { $size: '$genera' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Static: Lấy sample fossils với paleo coordinates cho visualization.
// Dùng OVERLAP: hóa thạch có khoảng thời gian giao với [minMa, maxMa] (maxMa = già hơn, minMa = trẻ hơn).
// Overlap: fossil.maxMa >= minMa AND fossil.minMa <= maxMa (không dùng containment vì sẽ bỏ sót nhiều mẫu).
// Lưu ý: dùng $sample (mẫu ngẫu nhiên) nên không phải mọi loài trong khoảng thời gian đều xuất hiện.
fossilSchema.statics.getSampleForVisualization = function(maxMa, minMa, sampleSize = 500) {
    return this.aggregate([
        {
            $match: {
                'time.maxMa': { $gte: minMa },
                'time.minMa': { $lte: maxMa },
                'paleoLocation.paleolng': { $exists: true, $ne: null },
                'paleoLocation.paleolat': { $exists: true, $ne: null }
            }
        },
        { $sample: { size: sampleSize } },
        {
            $project: {
                name: '$taxonomy.acceptedName',
                phylum: '$taxonomy.phylum',
                class: '$taxonomy.class',
                paleolng: '$paleoLocation.paleolng',
                paleolat: '$paleoLocation.paleolat',
                geoplate: '$paleoLocation.geoplate',
                lng: '$location.lng',
                lat: '$location.lat',
                maxMa: '$time.maxMa',
                minMa: '$time.minMa',
                environment: '$ecology.taxonEnvironment'
            }
        }
    ]);
};

const Fossil = mongoose.model('Fossil', fossilSchema);

module.exports = Fossil;
