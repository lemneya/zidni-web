/**
 * Clawdbot Gateway Connector
 * Connects Zidni to Clawdbot/Moltbot gateway for extended capabilities
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const axios = require('axios');

class ClawdGateway extends EventEmitter {
  constructor(options = {}) {
    super();
    this.url = options.url || process.env.CLAWD_GATEWAY_URL || 'ws://localhost:18789';
    this.apiUrl = options.apiUrl || process.env.CLAWD_API_URL || 'http://localhost:18789';
    this.ws = null;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectAttempts = 0;
    this.isConnected = false;
    this.messageQueue = [];
    this.sessionId = null;
  }

  /**
   * Connect to Clawdbot gateway
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[Clawd] Connecting to ${this.url}...`);
        
        this.ws = new WebSocket(this.url);
        
        this.ws.on('open', () => {
          console.log('[Clawd] Connected to gateway');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          
          // Send any queued messages
          while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            this.send(msg);
          }
          
          resolve(true);
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[Clawd] Failed to parse message:', error);
          }
        });

        this.ws.on('close', (code, reason) => {
          console.log(`[Clawd] Disconnected: ${code} ${reason}`);
          this.isConnected = false;
          this.emit('disconnected', { code, reason });
          this.attemptReconnect();
        });

        this.ws.on('error', (error) => {
          console.error('[Clawd] WebSocket error:', error.message);
          this.emit('error', error);
          // Don't reject here - let the close handler deal with reconnection
          if (!this.isConnected) {
            reject(error);
          }
        });

      } catch (error) {
        console.error('[Clawd] Connection failed:', error.message);
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Clawd] Max reconnection attempts reached');
      this.emit('maxReconnectReached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[Clawd] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        // Error handled in connect()
      });
    }, this.reconnectInterval);
  }

  /**
   * Send message to Clawdbot
   */
  send(message) {
    if (!this.isConnected || !this.ws) {
      console.log('[Clawd] Queueing message (not connected)');
      this.messageQueue.push(message);
      return false;
    }

    try {
      const payload = typeof message === 'string' ? { content: message } : message;
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('[Clawd] Send failed:', error.message);
      return false;
    }
  }

  /**
   * Handle incoming messages
   */
  handleMessage(message) {
    console.log('[Clawd] Received:', message.type || 'message');
    
    switch (message.type) {
      case 'session':
        this.sessionId = message.sessionId;
        console.log('[Clawd] Session ID:', this.sessionId);
        break;
        
      case 'response':
        this.emit('response', message);
        break;
        
      case 'tool_call':
        this.emit('toolCall', message);
        break;
        
      case 'error':
        console.error('[Clawd] Error:', message.error);
        this.emit('error', new Error(message.error));
        break;
        
      default:
        this.emit('message', message);
    }
  }

  /**
   * Send chat message and wait for response
   */
  async chat(content, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Clawdbot response timeout'));
      }, options.timeout || 60000);

      const onResponse = (msg) => {
        clearTimeout(timeout);
        this.off('response', onResponse);
        resolve(msg);
      };

      this.once('response', onResponse);
      
      this.send({
        type: 'chat',
        content,
        channel: options.channel || 'default',
        useTools: options.useTools !== false,
        ...options
      });
    });
  }

  /**
   * Execute a skill via HTTP API
   */
  async executeSkill(skillName, params = {}) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/skills/${skillName}/execute`,
        params,
        { timeout: 60000 }
      );
      return response.data;
    } catch (error) {
      console.error(`[Clawd] Skill execution failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get available skills
   */
  async getSkills() {
    try {
      const response = await axios.get(`${this.apiUrl}/skills`, { timeout: 10000 });
      return response.data.skills || [];
    } catch (error) {
      console.error('[Clawd] Failed to get skills:', error.message);
      return [];
    }
  }

  /**
   * Get skill info
   */
  async getSkillInfo(skillName) {
    try {
      const response = await axios.get(`${this.apiUrl}/skills/${skillName}`, { timeout: 10000 });
      return response.data;
    } catch (error) {
      console.error(`[Clawd] Failed to get skill info for ${skillName}:`, error.message);
      return null;
    }
  }

  /**
   * Disconnect from gateway
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    console.log('[Clawd] Disconnected');
  }

  /**
   * Check connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      sessionId: this.sessionId,
      url: this.url,
      queueLength: this.messageQueue.length
    };
  }
}

module.exports = { ClawdGateway };
