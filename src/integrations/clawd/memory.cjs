/**
 * Clawdbot-style Persistent Memory System
 * Stores and retrieves conversation context and user data
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class ZidniMemory {
  constructor(options = {}) {
    this.memoryDir = options.memoryDir || path.join(os.homedir(), '.zidni', 'memory');
    this.conversationsDir = path.join(this.memoryDir, 'conversations');
    this.userDataFile = path.join(this.memoryDir, 'user-data.json');
    this.cache = new Map();
    this.autoSave = options.autoSave !== false;
    this.encryptionKey = options.encryptionKey;
    
    this.ensureDirectories();
  }

  /**
   * Ensure memory directories exist
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.memoryDir, { recursive: true });
      await fs.mkdir(this.conversationsDir, { recursive: true });
    } catch (error) {
      console.error('[Memory] Failed to create directories:', error.message);
    }
  }

  /**
   * Generate a unique ID
   */
  generateId() {
    return crypto.randomUUID();
  }

  /**
   * Get file path for a key
   */
  getFilePath(key, category = 'general') {
    const safeKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.memoryDir, category, `${safeKey}.json`);
  }

  /**
   * Save a value to memory
   */
  async set(key, value, options = {}) {
    const category = options.category || 'general';
    const ttl = options.ttl || null; // Time to live in milliseconds
    
    const data = {
      key,
      value,
      category,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ttl,
      tags: options.tags || [],
      metadata: options.metadata || {}
    };

    // Save to cache
    this.cache.set(`${category}:${key}`, data);

    // Save to file
    const filePath = this.getFilePath(key, category);
    const categoryDir = path.dirname(filePath);
    
    try {
      await fs.mkdir(categoryDir, { recursive: true });
      
      const content = this.encryptionKey 
        ? this.encrypt(JSON.stringify(data))
        : JSON.stringify(data, null, 2);
        
      await fs.writeFile(filePath, content, 'utf-8');
      
      return { success: true, key, category };
    } catch (error) {
      console.error('[Memory] Save failed:', error.message);
      throw error;
    }
  }

  /**
   * Get a value from memory
   */
  async get(key, category = 'general') {
    const cacheKey = `${category}:${key}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (!this.isExpired(cached)) {
        return cached.value;
      }
    }

    // Load from file
    const filePath = this.getFilePath(key, category);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(
        this.encryptionKey ? this.decrypt(content) : content
      );

      // Check if expired
      if (this.isExpired(data)) {
        await this.delete(key, category);
        return null;
      }

      // Update cache
      this.cache.set(cacheKey, data);
      
      return data.value;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // Key doesn't exist
      }
      console.error('[Memory] Get failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if data is expired
   */
  isExpired(data) {
    if (!data.ttl) return false;
    return Date.now() > data.createdAt + data.ttl;
  }

  /**
   * Delete a key from memory
   */
  async delete(key, category = 'general') {
    const cacheKey = `${category}:${key}`;
    
    // Remove from cache
    this.cache.delete(cacheKey);

    // Remove from file
    const filePath = this.getFilePath(key, category);
    
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, message: 'Key did not exist' };
      }
      console.error('[Memory] Delete failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if a key exists
   */
  async has(key, category = 'general') {
    const value = await this.get(key, category);
    return value !== null;
  }

  /**
   * Get all keys in a category
   */
  async keys(category = 'general') {
    const categoryDir = path.join(this.memoryDir, category);
    
    try {
      const files = await fs.readdir(categoryDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * Search memory by value content
   */
  async search(query, category = null) {
    const results = [];
    const categories = category ? [category] : await this.getCategories();
    
    for (const cat of categories) {
      const keys = await this.keys(cat);
      
      for (const key of keys) {
        const value = await this.get(key, cat);
        
        if (value && JSON.stringify(value).toLowerCase().includes(query.toLowerCase())) {
          results.push({ key, category: cat, value });
        }
      }
    }
    
    return results;
  }

  /**
   * Get all categories
   */
  async getCategories() {
    try {
      const entries = await fs.readdir(this.memoryDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch (error) {
      return ['general'];
    }
  }

  /**
   * Clear all memory
   */
  async clear(category = null) {
    if (category) {
      // Clear specific category
      const categoryDir = path.join(this.memoryDir, category);
      
      try {
        const files = await fs.readdir(categoryDir);
        for (const file of files) {
          await fs.unlink(path.join(categoryDir, file));
        }
        
        // Clear cache for this category
        for (const [key] of this.cache) {
          if (key.startsWith(`${category}:`)) {
            this.cache.delete(key);
          }
        }
        
        return { success: true, cleared: files.length };
      } catch (error) {
        console.error('[Memory] Clear failed:', error.message);
        throw error;
      }
    } else {
      // Clear all
      this.cache.clear();
      
      try {
        await fs.rm(this.memoryDir, { recursive: true, force: true });
        await this.ensureDirectories();
        return { success: true };
      } catch (error) {
        console.error('[Memory] Clear all failed:', error.message);
        throw error;
      }
    }
  }

  /**
   * Save conversation context
   */
  async saveConversation(conversationId, messages, metadata = {}) {
    const filePath = path.join(this.conversationsDir, `${conversationId}.json`);
    
    const data = {
      id: conversationId,
      messages,
      metadata,
      updatedAt: Date.now()
    };

    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      console.error('[Memory] Save conversation failed:', error.message);
      throw error;
    }
  }

  /**
   * Load conversation context
   */
  async loadConversation(conversationId) {
    const filePath = path.join(this.conversationsDir, `${conversationId}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all conversations
   */
  async getConversations() {
    try {
      const files = await fs.readdir(this.conversationsDir);
      const conversations = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const id = file.replace('.json', '');
          const conv = await this.loadConversation(id);
          if (conv) {
            conversations.push({
              id,
              messageCount: conv.messages?.length || 0,
              updatedAt: conv.updatedAt,
              preview: conv.messages?.[conv.messages.length - 1]?.content?.substring(0, 100) || ''
            });
          }
        }
      }
      
      return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      return [];
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId) {
    const filePath = path.join(this.conversationsDir, `${conversationId}.json`);
    
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { success: true, message: 'Conversation did not exist' };
      }
      throw error;
    }
  }

  /**
   * Save user data
   */
  async saveUserData(data) {
    try {
      let existing = {};
      
      try {
        const content = await fs.readFile(this.userDataFile, 'utf-8');
        existing = JSON.parse(content);
      } catch (e) {
        // File doesn't exist yet
      }

      const updated = {
        ...existing,
        ...data,
        updatedAt: Date.now()
      };

      await fs.writeFile(this.userDataFile, JSON.stringify(updated, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      console.error('[Memory] Save user data failed:', error.message);
      throw error;
    }
  }

  /**
   * Load user data
   */
  async loadUserData() {
    try {
      const content = await fs.readFile(this.userDataFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return {};
    }
  }

  /**
   * Encrypt data
   */
  encrypt(text) {
    if (!this.encryptionKey) return text;
    
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data
   */
  decrypt(text) {
    if (!this.encryptionKey) return text;
    
    const parts = text.split(':');
    if (parts.length !== 2) return text;
    
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
    
    let decrypted = decipher.update(parts[1], 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get memory statistics
   */
  async getStats() {
    const categories = await this.getCategories();
    let totalKeys = 0;
    let totalSize = 0;

    for (const category of categories) {
      const keys = await this.keys(category);
      totalKeys += keys.length;

      for (const key of keys) {
        const filePath = this.getFilePath(key, category);
        try {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        } catch (e) {}
      }
    }

    return {
      categories: categories.length,
      keys: totalKeys,
      size: totalSize,
      cacheSize: this.cache.size
    };
  }
}

module.exports = { ZidniMemory };
