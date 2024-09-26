const { createClient } = require('redis');
const redisConfig = require('./config/redisConfig'); 

let redisClient;

const initializeRedis = async () => {
  if (!redisClient) {
    redisClient = createClient({ url: redisConfig.redisUrl });
    try {
      await redisClient.connect();
      console.log('Connected to Redis...');
    } catch (err) {
      console.error('Redis connection error:', err);
      redisClient = null;
    }
  }
};

const queryCacheMiddleware = async (req, res, next) => {
  await initializeRedis();

  if (!redisClient) {
    console.error('Failed to connect to Redis');
    return next(); 
  }

  const cacheKey = `${req.method}-${req.originalUrl}`.replace(/\//g, '_');

  try {
    const cachedResponse = await redisClient.get(cacheKey);

    if (cachedResponse) {
      return res.json(JSON.parse(cachedResponse)); 
    }

    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(data)); 
      originalJson(data);
    };

    next(); 
  } catch (err) {
    console.error('Error accessing Redis:', err);
    next(err); 
  }
};

module.exports = queryCacheMiddleware;
