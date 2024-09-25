// config/redisConfig.js

require('dotenv').config(); // Load environment variables from .env

module.exports = {
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
};
