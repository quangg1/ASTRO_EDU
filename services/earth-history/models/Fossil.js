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
    },

    /**
     * Gán theo Earth History (`earth_history_stages`): khớp cửa sổ Ma với `time` / `timeEnd`
     * (cùng logic client `mapServerStageToClient`). Dùng cho prune và query theo “địa tầng” app.
     */
    earthStageId: { type: Number, index: true },

}, {
    timestamps: true,
    collection: 'fossils'
});

// Compound indexes cho queries theo thời kỳ
fossilSchema.index({ 'time.maxMa': -1, 'time.minMa': 1 });
fossilSchema.index({ 'time.eon': 1, 'time.era': 1, 'time.period': 1 });
fossilSchema.index({ 'paleoLocation.paleolng': 1, 'paleoLocation.paleolat': 1 });
fossilSchema.index({ 'taxonomy.phylum': 1, 'time.maxMa': -1 });
fossilSchema.index({ earthStageId: 1, 'taxonomy.phylum': 1 });

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

/**
 * Đối với mỗi giá trị `time.period` (kỉ địa chất): giữ tối đa `maxPerPeriod` bản ghi,
 * chia đều theo `taxonomy.phylum` (mỗi ngành tối đa floor(N/T)+phần dư).
 * Kỉ nào có tổng ≤ `maxPerPeriod` thì giữ nguyên toàn bộ.
 *
 * @param {object} [options]
 * @param {number} [options.maxPerPeriod=20000]
 * @param {boolean} [options.dryRun=false] — chỉ thống kê, không xóa
 * @returns {Promise<{ totalDeleted: number, totalKeptEstimate: number, periods: object[] }>}
 */
fossilSchema.statics.pruneByPeriodBalancedPhylum = async function pruneByPeriodBalancedPhylum(options = {}) {
    const maxPerPeriod = Number(options.maxPerPeriod) > 0 ? Number(options.maxPerPeriod) : 20000;
    const dryRun = !!options.dryRun;

    const buildPeriodMatch = (periodVal) => {
        if (periodVal === undefined || periodVal === null) {
            return { $or: [{ 'time.period': null }, { 'time.period': { $exists: false } }] };
        }
        return { 'time.period': periodVal };
    };

    const buildPhylumMatch = (phylumVal) => {
        if (phylumVal === undefined || phylumVal === null) {
            return { $or: [{ 'taxonomy.phylum': null }, { 'taxonomy.phylum': { $exists: false } }] };
        }
        return { 'taxonomy.phylum': phylumVal };
    };

    const periodBuckets = await this.aggregate([
        { $group: { _id: '$time.period' } },
        { $sort: { _id: 1 } },
    ]);

    const periods = [];
    let totalDeleted = 0;
    let totalKeptEstimate = 0;

    for (const bucket of periodBuckets) {
        const periodVal = bucket._id;
        const periodMatch = buildPeriodMatch(periodVal);

        const groups = await this.aggregate([
            { $match: periodMatch },
            { $group: { _id: '$taxonomy.phylum', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        if (groups.length === 0) continue;

        const totalInPeriod = groups.reduce((s, g) => s + g.count, 0);

        if (totalInPeriod <= maxPerPeriod) {
            periods.push({
                period: periodVal === undefined || periodVal === null ? '(null)' : String(periodVal),
                totalBefore: totalInPeriod,
                deleted: 0,
                kept: totalInPeriod,
                note: 'skip_total_under_cap',
            });
            totalKeptEstimate += totalInPeriod;
            continue;
        }

        const n = groups.length;
        const base = Math.floor(maxPerPeriod / n);
        const rem = maxPerPeriod % n;

        let periodDeleted = 0;
        let periodKept = 0;

        for (let i = 0; i < n; i++) {
            const phylumVal = groups[i]._id;
            const count = groups[i].count;
            const cap = base + (i < rem ? 1 : 0);
            const keep = Math.min(count, cap);

            const phylumMatch = buildPhylumMatch(phylumVal);
            const fullMatch = { $and: [periodMatch, phylumMatch] };

            if (keep === 0) {
                if (!dryRun) {
                    const r = await this.deleteMany(fullMatch);
                    periodDeleted += r.deletedCount;
                } else {
                    periodDeleted += count;
                }
                continue;
            }

            if (count <= keep) {
                periodKept += count;
                continue;
            }

            const keepDocs = await this.aggregate([
                { $match: fullMatch },
                { $sample: { size: keep } },
                { $project: { _id: 1 } },
            ]);
            const keepIds = keepDocs.map((d) => d._id);

            if (!dryRun) {
                const r = await this.deleteMany({
                    $and: [periodMatch, phylumMatch, { _id: { $nin: keepIds } }],
                });
                periodDeleted += r.deletedCount;
            } else {
                periodDeleted += count - keep;
            }
            periodKept += keep;
        }

        periods.push({
            period: periodVal === undefined || periodVal === null ? '(null)' : String(periodVal),
            totalBefore: totalInPeriod,
            deleted: periodDeleted,
            kept: periodKept,
            phylaCount: n,
            maxPerPeriod,
        });
        totalDeleted += periodDeleted;
        totalKeptEstimate += periodKept;
    }

    return {
        maxPerPeriod,
        dryRun,
        totalDeleted,
        totalKeptEstimate,
        periods,
    };
};

/**
 * Cửa sổ thời gian (Ma) trùng với client `mapServerStageToClient` / seed Earth History.
 */
function earthHistoryStageMaWindow(stage) {
    const t = stage.time;
    const te =
        stage.timeEnd != null && stage.timeEnd !== undefined
            ? stage.timeEnd
            : t >= 1
              ? Math.max(0, t - 50)
              : Math.max(0, t - 0.5);
    let hi = Math.max(t, te);
    let lo = Math.min(t, te);
    /**
     * Cửa sổ độ dài 0 (vd. Trái Đất hiện tại time=0, timeEnd=0): overlap chuẩn không bắt
     * hầu hết fossil PBDB (minMa > 0). Mở thành [0, 2.58] Ma (kỷ Quaternary → hiện tại).
     */
    if (hi === lo && hi === 0) {
        return { lo: 0, hi: 2.58 };
    }
    return { lo, hi };
}

function fossilOverlapTimeMatch(lo, hi) {
    return {
        'time.maxMa': { $gte: lo },
        'time.minMa': { $lte: hi },
    };
}

/**
 * Gán `earthStageId` theo thứ tự `order` của `earth_history_stages`.
 * Hóa thạch giao thời gian với nhiều stage → stage có `order` nhỏ hơn (trước trong timeline) được ưu tiên.
 */
fossilSchema.statics.assignEarthHistoryStages = async function assignEarthHistoryStages(options = {}) {
    const dryRun = !!options.dryRun;
    const EarthHistory = require('./EarthHistory');

    const stages = await EarthHistory.find({ isActive: true }).sort({ order: 1 }).lean();
    const stagesOut = [];
    let totalTouched = 0;

    for (const stage of stages) {
        const { lo, hi } = earthHistoryStageMaWindow(stage);
        const filter = {
            ...fossilOverlapTimeMatch(lo, hi),
            $or: [{ earthStageId: { $exists: false } }, { earthStageId: null }],
        };

        if (dryRun) {
            const n = await this.countDocuments(filter);
            stagesOut.push({
                stageId: stage.stageId,
                name: stage.name,
                lo,
                hi,
                wouldAssign: n,
            });
            totalTouched += n;
        } else {
            const r = await this.updateMany(filter, { $set: { earthStageId: stage.stageId } });
            stagesOut.push({
                stageId: stage.stageId,
                name: stage.name,
                lo,
                hi,
                modified: r.modifiedCount,
            });
            totalTouched += r.modifiedCount;
        }
    }

    return { dryRun, totalTouched, stages: stagesOut };
};

/**
 * Giữ tối đa `maxPerStage` bản ghi **mỗi Earth History stage** (`earthStageId`),
 * chia đều theo `taxonomy.phylum`. Cần chạy `assignEarthHistoryStages` trước (hoặc đã có earthStageId).
 * Stage có tổng ≤ cap thì không xóa.
 */
fossilSchema.statics.pruneByEarthHistoryStageBalancedPhylum =
    async function pruneByEarthHistoryStageBalancedPhylum(options = {}) {
        const maxPerStage = Number(options.maxPerStage) > 0 ? Number(options.maxPerStage) : 20000;
        const dryRun = !!options.dryRun;

        const buildPhylumMatch = (phylumVal) => {
            if (phylumVal === undefined || phylumVal === null) {
                return { $or: [{ 'taxonomy.phylum': null }, { 'taxonomy.phylum': { $exists: false } }] };
            }
            return { 'taxonomy.phylum': phylumVal };
        };

        const rawIds = await this.distinct('earthStageId', {
            earthStageId: { $ne: null },
        });
        const stageIds = rawIds.filter((id) => id != null).sort((a, b) => a - b);

        const stages = [];
        let totalDeleted = 0;
        let totalKeptEstimate = 0;

        for (const sid of stageIds) {
            const stageMatch = { earthStageId: sid };

            const groups = await this.aggregate([
                { $match: stageMatch },
                { $group: { _id: '$taxonomy.phylum', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]);

            if (groups.length === 0) continue;

            const totalInStage = groups.reduce((s, g) => s + g.count, 0);

            if (totalInStage <= maxPerStage) {
                stages.push({
                    earthStageId: sid,
                    totalBefore: totalInStage,
                    deleted: 0,
                    kept: totalInStage,
                    note: 'skip_total_under_cap',
                });
                totalKeptEstimate += totalInStage;
                continue;
            }

            const n = groups.length;
            const base = Math.floor(maxPerStage / n);
            const rem = maxPerStage % n;

            let stageDeleted = 0;
            let stageKept = 0;

            for (let i = 0; i < n; i++) {
                const phylumVal = groups[i]._id;
                const count = groups[i].count;
                const cap = base + (i < rem ? 1 : 0);
                const keep = Math.min(count, cap);

                const phylumMatch = buildPhylumMatch(phylumVal);
                const fullMatch = { $and: [stageMatch, phylumMatch] };

                if (keep === 0) {
                    if (!dryRun) {
                        const r = await this.deleteMany(fullMatch);
                        stageDeleted += r.deletedCount;
                    } else {
                        stageDeleted += count;
                    }
                    continue;
                }

                if (count <= keep) {
                    stageKept += count;
                    continue;
                }

                const keepDocs = await this.aggregate([
                    { $match: fullMatch },
                    { $sample: { size: keep } },
                    { $project: { _id: 1 } },
                ]);
                const keepIds = keepDocs.map((d) => d._id);

                if (!dryRun) {
                    const r = await this.deleteMany({
                        $and: [stageMatch, phylumMatch, { _id: { $nin: keepIds } }],
                    });
                    stageDeleted += r.deletedCount;
                } else {
                    stageDeleted += count - keep;
                }
                stageKept += keep;
            }

            stages.push({
                earthStageId: sid,
                totalBefore: totalInStage,
                deleted: stageDeleted,
                kept: stageKept,
                phylaCount: n,
                maxPerStage,
            });
            totalDeleted += stageDeleted;
            totalKeptEstimate += stageKept;
        }

        return {
            maxPerStage,
            dryRun,
            totalDeleted,
            totalKeptEstimate,
            stages,
        };
    };

/**
 * Thống kê phủ Earth History: bao nhiêu stage, fossil theo earthStageId,
 * fossil chưa gán, fossil không trùng bất kỳ cửa sổ stage nào, và overlap thô theo từng stage.
 */
fossilSchema.statics.analyzeEarthStageCoverage = async function analyzeEarthStageCoverage() {
    const EarthHistory = require('./EarthHistory');
    const stages = await EarthHistory.find({ isActive: true }).sort({ order: 1 }).lean();

    const totalFossils = await this.countDocuments();

    const byEarthStageId = await this.aggregate([
        { $group: { _id: '$earthStageId', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
    ]);

    const unassignedCount = await this.countDocuments({
        $or: [{ earthStageId: { $exists: false } }, { earthStageId: null }],
    });

    const overlapConds = stages.map((s) => {
        const { lo, hi } = earthHistoryStageMaWindow(s);
        return fossilOverlapTimeMatch(lo, hi);
    });

    let fossilsOverlappingAtLeastOneStage = 0;
    let fossilsOverlappingNone = 0;

    if (overlapConds.length === 0) {
        fossilsOverlappingNone = totalFossils;
    } else {
        fossilsOverlappingAtLeastOneStage = await this.countDocuments({ $or: overlapConds });
        fossilsOverlappingNone = await this.countDocuments({ $nor: overlapConds });
    }

    const perStageOverlap = [];
    for (const s of stages) {
        const { lo, hi } = earthHistoryStageMaWindow(s);
        const m = fossilOverlapTimeMatch(lo, hi);
        const overlapCount = await this.countDocuments(m);
        const assignedHere = await this.countDocuments({ earthStageId: s.stageId });
        perStageOverlap.push({
            stageId: s.stageId,
            order: s.order,
            name: s.name,
            lo,
            hi,
            /** Số fossil có khoảng thời gian giao với [lo,hi] — có thể trùng giữa nhiều stage */
            overlapCount,
            /** Số fossil đang gán earthStageId = stage này */
            assignedCount: assignedHere,
        });
    }

    const sumOverlapRaw = perStageOverlap.reduce((a, r) => a + r.overlapCount, 0);

    return {
        totalFossils,
        earthHistoryStageCount: stages.length,
        earthHistoryStages: stages.map((s) => {
            const { lo, hi } = earthHistoryStageMaWindow(s);
            return {
                stageId: s.stageId,
                order: s.order,
                name: s.name,
                nameEn: s.nameEn,
                lo,
                hi,
            };
        }),
        fossilsByEarthStageId: byEarthStageId.map((r) => ({
            earthStageId: r._id === undefined ? '(missing)' : r._id === null ? '(null)' : r._id,
            count: r.count,
        })),
        unassignedCount,
        fossilsOverlappingAtLeastOneStage,
        fossilsOverlappingNone,
        perStageOverlap,
        note:
            'overlapCount theo từng stage có thể cộng dồn > total (cùng một fossil trùng nhiều cửa sổ). ' +
            'sumOverlapRaw=' +
            sumOverlapRaw +
            '. Prune earth chỉ xóa trong từng nhóm earthStageId khi tổng > maxPerStage; fossil không có earthStageId không bị xóa.',
    };
};

/**
 * Xóa mọi fossil **không** giao thời gian với bất kỳ Earth History stage nào
 * (cùng điều kiện overlap Ma như `assignEarthHistoryStages`).
 * Dùng để bỏ mẫu nằm ngoài các “kỉ”/cửa sổ địa tầng đã định nghĩa trong `earth_history_stages`.
 *
 * @param {object} [options]
 * @param {boolean} [options.dryRun=false]
 */
fossilSchema.statics.deleteFossilsOutsideEarthHistoryStages =
    async function deleteFossilsOutsideEarthHistoryStages(options = {}) {
        const dryRun = !!options.dryRun;
        const EarthHistory = require('./EarthHistory');
        const stages = await EarthHistory.find({ isActive: true }).sort({ order: 1 }).lean();

        const overlapConds = stages.map((s) => {
            const { lo, hi } = earthHistoryStageMaWindow(s);
            return fossilOverlapTimeMatch(lo, hi);
        });

        if (overlapConds.length === 0) {
            return {
                dryRun,
                deletedCount: 0,
                wouldDelete: 0,
                note: 'Không có earth_history_stages active — không xóa.',
            };
        }

        const filter = { $nor: overlapConds };
        const wouldDelete = await this.countDocuments(filter);

        if (dryRun) {
            return { dryRun: true, deletedCount: 0, wouldDelete, stageCount: stages.length };
        }

        const res = await this.deleteMany(filter);
        return {
            dryRun: false,
            deletedCount: res.deletedCount,
            wouldDelete,
            stageCount: stages.length,
        };
    };

const Fossil = mongoose.model('Fossil', fossilSchema);

module.exports = Fossil;
