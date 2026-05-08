const showcaseEntitiesRouter = require('./routes/showcaseEntities');
const showcaseCatalogRouter = require('./routes/showcaseCatalog');
const showcaseOrbitsJplRouter = require('./routes/showcaseOrbitsJpl');
const {
  narrativeSpacesRouter,
  earthHistoryRouter,
  fossilsRouter,
  phylaRouter,
} = require('./narrative');
const spaceContextRouter = require('./routes/spaceContext');

module.exports = {
  showcaseEntitiesRouter,
  showcaseCatalogRouter,
  showcaseOrbitsJplRouter,
  narrativeSpacesRouter,
  earthHistoryRouter,
  fossilsRouter,
  phylaRouter,
  spaceContextRouter,
};
