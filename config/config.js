const path = require('path');

const config = {
    cache: {
        // Memory Cache Settings
        maxSize: 100, // Maximum number of items in memory cache
        policy: 'LRU', // Caching policy: 'FIFO', 'LRU', or 'LFU'
        cacheDir: path.join(__dirname, 'cache'), // Directory for cache storage
    },
    apiCache: {
        // API Cache Settings
        stdTTL: 10, // Default TTL in seconds for API cache
    },
    redis: {
        // Redis Settings
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379', // Default Redis URL
        ttl: 3600, // Time to live for Redis cache in seconds
    }
};

module.exports = config;
