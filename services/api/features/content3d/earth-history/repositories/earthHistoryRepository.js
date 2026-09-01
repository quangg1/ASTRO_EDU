const { BaseRepository } = require('../../../../shared/db/BaseRepository');
const EarthHistory = require('../models/EarthHistory');
const Fossil = require('../models/Fossil');
const PhylumMetadata = require('../models/PhylumMetadata');

const SUMMARY_FIELDS =
  'stageId name nameEn icon time eon era period flags.isExtinction order';

class EarthHistoryRepository extends BaseRepository {
  constructor() {
    super(EarthHistory);
  }

  /** Static của model chứa quy tắc sắp xếp theo niên đại — dùng lại thay vì chép. */
  listAllStages() {
    return this.raw.getAllStages();
  }

  listByEon(eon) {
    return this.raw.getByEon(eon);
  }

  listByTimeRange(startMya, endMya) {
    return this.raw.getByTimeRange(startMya, endMya);
  }

  listExtinctionEvents() {
    return this.raw.getExtinctionEvents();
  }

  listSummary() {
    return this.findMany({ isActive: true }, { projection: SUMMARY_FIELDS, sort: { order: 1 } });
  }

  findActiveStage(stageId) {
    return this.findOne({ stageId, isActive: true });
  }

  findStage(stageId) {
    return this.findOne({ stageId });
  }

  /** Stage active gần nhất với `time <= stageTimeMa` (agent / Explore). */
  findNearestActiveByTime(stageTimeMa) {
    return this.findOne(
      { isActive: true, time: { $lte: stageTimeMa + 0.001 } },
      {
        projection: 'stageId name nameEn time timeDisplay era period eon',
        sort: { time: -1 },
      },
    );
  }

  async statsOverview() {
    const [totalStages, extinctionCount, byEon] = await Promise.all([
      this.count({ isActive: true }),
      this.count({ 'flags.isExtinction': true, isActive: true }),
      this.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$eon', count: { $sum: 1 } } },
      ]),
    ]);
    return {
      totalStages,
      extinctionCount,
      eonCounts: Object.fromEntries(byEon.map((row) => [row._id, row.count])),
    };
  }

  upsertStages(stages) {
    if (!stages.length) return Promise.resolve({ upsertedCount: 0 });
    return this.raw.bulkWrite(
      stages.map((stage) => ({
        updateOne: { filter: { stageId: stage.stageId }, update: { $set: stage }, upsert: true },
      })),
      { ordered: false },
    );
  }
}

const FOSSIL_SEARCH_FIELDS = 'taxonomy time location paleoLocation geology ecology';

/** Hóa thạch phải có tọa độ cổ địa lý mới vẽ được lên quả cầu. */
const HAS_PALEO_COORDS = {
  'paleoLocation.paleolng': { $exists: true, $ne: null },
  'paleoLocation.paleolat': { $exists: true, $ne: null },
};

class FossilRepository extends BaseRepository {
  constructor() {
    super(Fossil);
  }

  countInTimeRange(maxMa, minMa) {
    return this.count({
      'time.maxMa': { $gte: minMa },
      'time.minMa': { $lte: maxMa },
      ...HAS_PALEO_COORDS,
    });
  }

  /** Đếm hóa thạch có tên accepted trong khung thời gian (không bắt buộc paleo coords). */
  countAcceptedInTimeRange(maxMa, minMa) {
    return this.count({
      'time.maxMa': { $gte: minMa },
      'time.minMa': { $lte: maxMa },
      'taxonomy.acceptedName': { $exists: true, $nin: [null, ''] },
    });
  }

  sampleForVisualization(maxMa, minMa, sampleSize) {
    return this.raw.getSampleForVisualization(maxMa, minMa, sampleSize);
  }

  phylaDistribution(maxMa, minMa) {
    return this.raw.getPhylaDistribution(maxMa, minMa);
  }

  /**
   * Top loài theo số mẫu trong khung thời gian — shape agent Cosmo dùng để grounding.
   */
  listNotableAccepted(maxMa, minMa, limit = 20) {
    return this.aggregate([
      {
        $match: {
          'time.maxMa': { $gte: minMa },
          'time.minMa': { $lte: maxMa },
          'taxonomy.acceptedName': { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$taxonomy.acceptedName',
          phylum: { $first: '$taxonomy.phylum' },
          taxonClass: { $first: '$taxonomy.class' },
          environment: {
            $first: {
              $ifNull: ['$ecology.taxonEnvironment', '$geology.environment'],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          name: '$_id',
          phylum: 1,
          class: '$taxonClass',
          environment: 1,
        },
      },
    ]);
  }

  /**
   * Full-text index cho điểm liên quan; người gọi tự lo phương án dự phòng.
   * Xếp hạng theo `textScore` bắt buộc phải chiếu trường score nên query này
   * dùng thẳng model thay vì helper đọc chung.
   */
  searchByText(searchExpr, timeFilter, limit) {
    return this.raw
      .find({ $text: { $search: searchExpr }, ...timeFilter }, { score: { $meta: 'textScore' } })
      .select(FOSSIL_SEARCH_FIELDS)
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();
  }

  searchByName(pattern, timeFilter, limit) {
    return this.findMany(
      { 'taxonomy.acceptedName': { $regex: pattern, $options: 'i' }, ...timeFilter },
      { projection: FOSSIL_SEARCH_FIELDS, limit },
    );
  }

  async stats() {
    const [total, byEra, byPeriod, byPhylum, withPaleoCoords] = await Promise.all([
      this.count(),
      this.aggregate([
        { $group: { _id: '$time.era', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.aggregate([
        { $match: { 'time.period': { $ne: null } } },
        { $group: { _id: '$time.period', count: { $sum: 1 }, avgMa: { $avg: '$time.maxMa' } } },
        { $sort: { avgMa: -1 } },
      ]),
      this.aggregate([
        { $match: { 'taxonomy.phylum': { $ne: null } } },
        { $group: { _id: '$taxonomy.phylum', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      this.count(HAS_PALEO_COORDS),
    ]);

    return {
      total,
      withPaleoCoords,
      byEra: Object.fromEntries(byEra.map((row) => [row._id || 'Unknown', row.count])),
      byPeriod,
      byPhylum,
    };
  }
}

class PhylumMetadataRepository extends BaseRepository {
  constructor() {
    super(PhylumMetadata);
  }

  listForLocale(locale) {
    return this.findMany({ locale }, { projection: 'phylum nameVi description color' });
  }
}

module.exports = {
  earthHistoryRepository: new EarthHistoryRepository(),
  fossilRepository: new FossilRepository(),
  phylumMetadataRepository: new PhylumMetadataRepository(),
};
