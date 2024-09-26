const NodeCache = require('node-cache');
const path = require('path');
const express = require('express');
const apiCache = new NodeCache({ stdTTL: 10 });

// Analytics data to track requests, cache hits, and misses
const requestFrequency = {};
const analyticsData = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  lastUpdated: null
};

const cacheMiddleware = (options = {}) => {
  const { staleTime = 5 } = options; // Time to consider cache stale before checking fresh data

  return async (req, res, next) => {
    const cacheKey = req.originalUrl;

    // Track request frequency
    requestFrequency[cacheKey] = (requestFrequency[cacheKey] || 0) + 1;

    // Fetch cached response
    const cachedData = apiCache.get(cacheKey);
    analyticsData.totalRequests++; // Increment total requests

    if (cachedData) {
      analyticsData.cacheHits++; // Increment cache hits
      res.json(cachedData.data);
      compareWithFreshData(req, res, cacheKey, cachedData.data, staleTime);
      return; // End request after serving cached response
    } else {
      analyticsData.cacheMisses++; // Increment cache misses
    }

    // Proceed to actual request and cache the result
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      apiCache.set(cacheKey, { data, timestamp: Date.now() }, calculateTTL(cacheKey));
      analyticsData.lastUpdated = new Date(); // Track last updated time
      return originalJson(data);
    };

    next(); // Proceed with the actual backend logic
  };
};

// Dynamic TTL calculation based on request frequency
const calculateTTL = (cacheKey) => {
  const frequency = requestFrequency[cacheKey] || 1;
  if (frequency > 10) return 5;
  else if (frequency > 5) return 15;
  return 30;
};

// Compare with fresh data for stale cache invalidation
const compareWithFreshData = (req, res, cacheKey, cachedData, staleTime) => {
  const originalJson = res.json.bind(res);

  res.json = (freshData) => {
    if (JSON.stringify(freshData) !== JSON.stringify(cachedData)) {
      const now = Date.now();
      const cacheAge = now - cachedData.timestamp;
      if (cacheAge > staleTime * 1000) { // Compare cache age with stale time
        apiCache.set(cacheKey, { data: freshData, timestamp: now });
        console.log(`Cache updated for ${cacheKey}`);
      }
    }
    res.json = originalJson; // Restore the original `res.json`
  };
};

// Analytics Endpoint
const setupAnalyticsRoute = (app) => {
  app.get('/api/cache-analytics', (req, res) => {
    res.json(analyticsData);
  });

  // Serve the dashboard
  app.use('/dashboard', express.static(path.join(__dirname, '../public')));
};

module.exports = {
  cacheMiddleware,
  setupAnalyticsRoute
};
