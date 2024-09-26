const NodeCache = require('node-cache');
const apiCache = new NodeCache({ stdTTL: 10 });

const requestFrequency = {};

const cacheMiddleware = async (req, res, next) => {
  const cacheKey = req.originalUrl;
  requestFrequency[cacheKey] = (requestFrequency[cacheKey] || 0) + 1;
  const cachedData = apiCache.get(cacheKey);

  if (cachedData) {
    res.json(cachedData.data);
    compareWithFreshData(req, res, cacheKey, cachedData.data);
    
    return; 
  }

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    apiCache.set(cacheKey, { data, timestamp: Date.now() }, calculateTTL(cacheKey));
    return originalJson(data);
  };

  next();
};

const compareWithFreshData = (req, res, cacheKey, cachedData) => {
  const originalJson = res.json.bind(res);
  res.json = (freshData) => {
    if (JSON.stringify(freshData) !== JSON.stringify(cachedData)) {
      apiCache.set(cacheKey, { data: freshData, timestamp: Date.now() });
      console.log(`Cache updated for ${cacheKey}`);
    }
    res.json = originalJson;
  };
};

const calculateTTL = (cacheKey) => {
  const frequency = requestFrequency[cacheKey] || 1; 
  if (frequency > 10) {
    return 5; 
  } else if (frequency > 5) {
    return 15; 
  }
  return 30; 
};

module.exports = cacheMiddleware;
