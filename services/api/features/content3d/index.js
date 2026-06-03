const showcaseEntitiesRouter = require('./routes/showcaseEntities');
const showcaseCatalogRouter = require('./routes/showcaseCatalog');
const showcaseOrbitsJplRouter = require('./routes/showcaseOrbitsJpl');
const {
  earthHistoryRouter,
  fossilsRouter,
  phylaRouter,
} = require('./earth-history');
const { planetNarrativeRouter } = require('./planet-narrative');
const exploreContextualQuizRouter = require('./routes/exploreContextualQuiz');
const exploreSkyTargetsRouter = require('./routes/exploreSkyTargets');

module.exports = {
  showcaseEntitiesRouter,
  showcaseCatalogRouter,
  showcaseOrbitsJplRouter,
  exploreContextualQuizRouter,
  exploreSkyTargetsRouter,
  earthHistoryRouter,
  fossilsRouter,
  phylaRouter,
  planetNarrativeRouter,
};
