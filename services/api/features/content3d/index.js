const showcaseEntitiesRouter = require('./routes/showcaseEntities');
const showcaseCatalogRouter = require('./routes/showcaseCatalog');
const showcaseOrbitsJplRouter = require('./routes/showcaseOrbitsJpl');
const {
  earthHistoryRouter,
  fossilsRouter,
  phylaRouter,
} = require('./earth-history');
const { planetNarrativeRouter } = require('./planet-narrative');

module.exports = {
  showcaseEntitiesRouter,
  showcaseCatalogRouter,
  showcaseOrbitsJplRouter,
  earthHistoryRouter,
  fossilsRouter,
  phylaRouter,
  planetNarrativeRouter,
};
