const NodeCache = require('node-cache');
const path = require('path');
const express = require('express');
const apiCache = new NodeCache({ stdTTL: 10 });

const requestFrequency = {};
const analyticsData = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  lastUpdated: null
};

const cacheMiddleware = (options = {}) => {
  const { staleTime = 5 } = options;

  return async (req, res, next) => {
    const cacheKey = req.originalUrl;
    if (isAnalyticsEndpoint(cacheKey)) {
      return next(); 
    }

    requestFrequency[cacheKey] = (requestFrequency[cacheKey] || 0) + 1;

    const cachedData = apiCache.get(cacheKey);
    analyticsData.totalRequests++; 

    if (cachedData) {
      analyticsData.cacheHits++;
      res.json(cachedData.data);
      compareWithFreshData(req, res, cacheKey, cachedData.data, staleTime);
      return; 
    } else {
      analyticsData.cacheMisses++; 
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      apiCache.set(cacheKey, { data, timestamp: Date.now() }, calculateTTL(cacheKey));
      analyticsData.lastUpdated = new Date(); 
      return originalJson(data);
    };

    next(); 
  };
};

const isAnalyticsEndpoint = (url) => {
  return url.startsWith('/api/cache-analytics') || url.startsWith('/dashboard');
};

const calculateTTL = (cacheKey) => {
  const frequency = requestFrequency[cacheKey] || 1;
  if (frequency > 10) return 5;
  else if (frequency > 5) return 15;
  return 30;
};

const compareWithFreshData = (req, res, cacheKey, cachedData, staleTime) => {
  const originalJson = res.json.bind(res);

  res.json = (freshData) => {
    if (JSON.stringify(freshData) !== JSON.stringify(cachedData)) {
      const now = Date.now();
      const cacheAge = now - cachedData.timestamp;
      if (cacheAge > staleTime * 1000) { 
        apiCache.set(cacheKey, { data: freshData, timestamp: now });
        console.log(`Cache updated for ${cacheKey}`);
      }
    }
    res.json = originalJson; 
  };
};

const setupAnalyticsRoute = (app) => {
  app.get('/api/cache-analytics', (req, res) => {
    res.json(analyticsData);
  });

  app.use('/dashboard', express.static(path.join(__dirname, '../public')));
};

module.exports = {
  cacheMiddleware,
  setupAnalyticsRoute
};
