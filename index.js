const queryCacheMiddleware = require('./querycache');
const cacheMiddleware = require('./memcache');
const apiCacheMiddleware = require('./apicache');

module.exports = {
    queryCacheMiddleware,
    cacheMiddleware,
    apiCacheMiddleware
};
