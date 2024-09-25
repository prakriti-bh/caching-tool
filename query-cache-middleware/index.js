// query-cache-middleware/index.js
const { createClient } = require('redis');
const redisConfig = require('./config/redisConfig'); // Load the Redis config

const queryCacheMiddleware = async (req, res, next) => {
    // Use the redisUrl from the config or environment variables
    const redisClient = createClient({ url: redisConfig.redisUrl });

    try {
        await redisClient.connect();
        console.log('Connected to Redis...');
    } catch (err) {
        console.error('Redis connection error:', err);
    }

    const cacheKey = `${req.method}-${req.originalUrl}`.replace(/\//g, '_');

    try {
        const cachedResponse = await redisClient.get(cacheKey);

        if (cachedResponse) {
            return res.json(JSON.parse(cachedResponse));
        }

        const originalJson = res.json.bind(res);
        res.json = async (data) => {
            await redisClient.setEx(cacheKey, 3600, JSON.stringify(data)); // Cache for 1 hour
            originalJson(data);
        };

        next();
    } catch (err) {
        console.error('Error accessing Redis:', err);
        next(err);
    }

    process.on('exit', () => {
        redisClient.quit();
    });
};

module.exports = queryCacheMiddleware;
