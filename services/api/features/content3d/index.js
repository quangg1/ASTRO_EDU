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
const explorePassportRouter = require('./routes/explorePassport');

module.exports = {
  showcaseEntitiesRouter,
  showcaseCatalogRouter,
  showcaseOrbitsJplRouter,
  exploreContextualQuizRouter,
  exploreSkyTargetsRouter,
  explorePassportRouter,
  earthHistoryRouter,
  fossilsRouter,
  phylaRouter,
  planetNarrativeRouter,
};
