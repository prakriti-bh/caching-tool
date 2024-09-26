const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

class Cache {
    constructor(maxSize, policy, cacheDir) {
        this.maxSize = maxSize || config.cache.maxSize;
        this.policy = policy || config.cache.policy;
        this.cacheDir = cacheDir || config.cache.cacheDir;
        this.cache = new Map();
        this.usageCount = new Map();
        this.order = [];
        
    fs.ensureDirSync(this.cacheDir);
  }

  async get(key) {
    const filePath = path.join(this.cacheDir, this.encodeKey(key));
    
    if (await fs.pathExists(filePath)) {
      const data = await fs.readFile(filePath, 'utf-8');

      // For LRU and LFU, we need to update usage
      if (this.policy === 'LRU') {
        this.order = this.order.filter(item => item !== key);
        this.order.push(key);
      } else if (this.policy === 'LFU') {
        this.usageCount.set(key, this.usageCount.get(key) + 1);
      }

      return data;
    }
    
    return null;
  }

  async set(key, value) {
    if (this.cache.has(key)) {
      await this.updateUsage(key);
      return;
    }

    // If the cache is full, evict an entry
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    this.cache.set(key, value);
    await fs.writeFile(path.join(this.cacheDir, this.encodeKey(key)), value);

    if (this.policy === 'FIFO' || this.policy === 'LRU') {
      this.order.push(key);
    } else if (this.policy === 'LFU') {
      this.usageCount.set(key, 1);
    }
  }

  async updateUsage(key) {
    if (this.policy === 'LRU') {
      this.order = this.order.filter(item => item !== key);
      this.order.push(key);
    } else if (this.policy === 'LFU') {
      this.usageCount.set(key, this.usageCount.get(key) + 1);
    }
  }

  evict() {
    let keyToEvict;

    if (this.policy === 'FIFO') {
      keyToEvict = this.order.shift();
    } else if (this.policy === 'LRU') {
      keyToEvict = this.order.shift();
    } else if (this.policy === 'LFU') {
      let minUsage = Infinity;
      for (const [key, count] of this.usageCount.entries()) {
        if (count < minUsage) {
          minUsage = count;
          keyToEvict = key;
        }
      }
      this.usageCount.delete(keyToEvict);
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      fs.unlinkSync(path.join(this.cacheDir, this.encodeKey(keyToEvict)));
    }
  }

  encodeKey(key) {
    return key.replace(/[\/\\?%*:|"<>]/g, '_'); // Replace invalid characters
  }
}

const cacheMiddleware = (maxSize, policy, cacheDir = './cache') => {
  const cache = new Cache(maxSize, policy, cacheDir);

  return async (req, res, next) => {
    const { originalUrl } = req;

    // Check if the response is in cache
    const cachedResponse = await cache.get(originalUrl);
    if (cachedResponse) {
      return res.send(cachedResponse);
    }

    // Store the original send method to intercept the response
    const originalSend = res.send.bind(res);
    res.send = async (body) => {
      // Cache the response before sending
      await cache.set(originalUrl, body);
      return originalSend(body);
    };

    next();
  };
};

module.exports = cacheMiddleware;