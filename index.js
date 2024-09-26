const queryCacheMiddleware = require('./querycache');
const cacheMiddleware = require('./memcache');
const apiCacheMiddleware = require('./apicache');
const cacheMiddleware = require('./cacheMiddleware');
const setupAnalyticsRoute = require('./cacheMiddleware');

module.exports = {
    queryCacheMiddleware,
    cacheMiddleware,
    apiCacheMiddleware,
    setupAnalyticsRoute
};
