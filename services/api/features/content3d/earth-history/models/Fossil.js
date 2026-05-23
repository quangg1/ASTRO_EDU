const mongoose = require('mongoose');

const fossilSchema = new mongoose.Schema(
  {
    occurrenceNo: { type: Number, required: true, index: true },
    taxonomy: {
      acceptedName: { type: String, required: true, index: true },
      acceptedRank: String,
      phylum: { type: String, index: true },
      class: String,
      order: String,
      family: String,
      genus: { type: String, index: true },
    },
    time: {
      earlyInterval: String,
      lateInterval: String,
      maxMa: { type: Number, required: true, index: true },
      minMa: { type: Number, required: true, index: true },
      timeBins: String,
      eon: { type: String, index: true },
      era: { type: String, index: true },
      period: { type: String, index: true },
    },
    location: { lng: { type: Number, required: true }, lat: { type: Number, required: true }, country: String, state: String, county: String, collectionName: String },
    paleoLocation: { paleolng: Number, paleolat: Number, paleoAge: String, geoplate: Number },
    geology: { formation: String, geologicalGroup: String, member: String, lithology: String, environment: String },
    ecology: { taxonEnvironment: String, motility: String, lifeHabit: String, diet: String },
    abundance: { value: Number, unit: String },
    reference: { author: String, year: Number, referenceNo: Number },
    earthStageId: { type: Number, index: true },
  },
  { timestamps: true, collection: 'fossils' }
);

fossilSchema.index({ 'time.maxMa': -1, 'time.minMa': 1 });
fossilSchema.index({ 'time.eon': 1, 'time.era': 1, 'time.period': 1 });
fossilSchema.index({ 'paleoLocation.paleolng': 1, 'paleoLocation.paleolat': 1 });
fossilSchema.index({ 'taxonomy.phylum': 1, 'time.maxMa': -1 });
fossilSchema.index({ earthStageId: 1, 'taxonomy.phylum': 1 });
fossilSchema.index({ 'location.lng': 1, 'location.lat': 1 });
fossilSchema.index({ 'taxonomy.acceptedName': 'text' }, { default_language: 'none', name: 'acceptedName_text' });

fossilSchema.statics.getSampleForVisualization = function getSampleForVisualization(maxMa, minMa, sampleSize = 500) {
  return this.aggregate([
    { $match: { 'time.maxMa': { $gte: minMa }, 'time.minMa': { $lte: maxMa }, 'paleoLocation.paleolng': { $exists: true, $ne: null }, 'paleoLocation.paleolat': { $exists: true, $ne: null } } },
    { $sample: { size: sampleSize } },
    { $project: { name: '$taxonomy.acceptedName', phylum: '$taxonomy.phylum', class: '$taxonomy.class', paleolng: '$paleoLocation.paleolng', paleolat: '$paleoLocation.paleolat', geoplate: '$paleoLocation.geoplate', lng: '$location.lng', lat: '$location.lat', maxMa: '$time.maxMa', minMa: '$time.minMa', environment: '$ecology.taxonEnvironment' } },
  ]);
};

fossilSchema.statics.getPhylaDistribution = async function getPhylaDistribution(maxMa, minMa) {
  return this.aggregate([
    { $match: { 'time.maxMa': { $gte: minMa }, 'time.minMa': { $lte: maxMa } } },
    { $group: { _id: '$taxonomy.phylum', count: { $sum: 1 }, genera: { $addToSet: '$taxonomy.genus' } } },
    { $project: { phylum: '$_id', count: 1, generaCount: { $size: '$genera' } } },
    { $sort: { count: -1 } },
  ]);
};

module.exports = mongoose.models.Fossil || mongoose.model('Fossil', fossilSchema);
