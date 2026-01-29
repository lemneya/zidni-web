/**
 * Channel Manager for Zidni
 * Orchestrates WhatsApp, Telegram, and Discord connectors
 * Provides unified interface for multi-channel messaging
 */

const { EventEmitter } = require('events');
const WhatsAppConnector = require('./whatsapp.cjs');
const TelegramConnector = require('./telegram.cjs');
const DiscordConnector = require('./discord.cjs');

class ChannelManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.connectors = new Map();
    this.messageHistory = new Map();
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.activeConversations = new Map();
    this.aiHandler = options.aiHandler || null;
    this.db = options.db || null;
  }

  // Initialize connectors
  async initializeWhatsApp(options = {}) {
    try {
      const whatsapp = new WhatsAppConnector(options);
      
      whatsapp.on('qr', (qr) => {
        this.emit('whatsapp:qr', qr);
      });

      whatsapp.on('connected', () => {
        this.emit('whatsapp:connected');
      });

      whatsapp.on('disconnected', (data) => {
        this.emit('whatsapp:disconnected', data);
      });

      whatsapp.on('message', async (message) => {
        await this.handleIncomingMessage('whatsapp', message);
      });

      whatsapp.on('error', (error) => {
        this.emit('whatsapp:error', error);
      });

      this.connectors.set('whatsapp', whatsapp);
      return await whatsapp.initialize();
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      return { success: false, error: error.message };
    }
  }

  async initializeTelegram(options = {}) {
    try {
      const telegram = new TelegramConnector(options);

      telegram.on('started', (bot) => {
        this.emit('telegram:started', bot);
      });

      telegram.on('stopped', () => {
        this.emit('telegram:stopped');
      });

      telegram.on('message', async (message) => {
        await this.handleIncomingMessage('telegram', message);
      });

      telegram.on('callback_query', (query) => {
        this.emit('telegram:callback', query);
      });

      telegram.on('error', (error) => {
        this.emit('telegram:error', error);
      });

      // Set up default commands
      telegram.onCommand('start', async (msg) => {
        await telegram.sendMessage(msg.chatId, 
          'مرحباً! أنا زِدْني، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟'
        );
      });

      telegram.onCommand('help', async (msg) => {
        await telegram.sendMessage(msg.chatId, 
          'الأوامر المتاحة:\n' +
          '/start - بدء المحادثة\n' +
          '/help - عرض المساعدة\n' +
          '/clear - مسح سجل المحادثة\n' +
          '/status - حالة البوت'
        );
      });

      telegram.onCommand('clear', async (msg) => {
        this.clearHistory('telegram', msg.from);
        await telegram.sendMessage(msg.chatId, 'تم مسح سجل المحادثة.');
      });

      telegram.onCommand('status', async (msg) => {
        const status = this.getStatus();
        await telegram.sendMessage(msg.chatId, 
          `حالة البوت:\nWhatsApp: ${status.whatsapp.isConnected ? 'متصل' : 'غير متصل'}\n` +
          `Telegram: ${status.telegram.isRunning ? 'يعمل' : 'متوقف'}\n` +
          `Discord: ${status.discord.isConnected ? 'متصل' : 'غير متصل'}`
        );
      });

      this.connectors.set('telegram', telegram);
      return await telegram.start();
    } catch (error) {
      console.error('Error initializing Telegram:', error);
      return { success: false, error: error.message };
    }
  }

  async initializeDiscord(options = {}) {
    try {
      const discord = new DiscordConnector(options);

      discord.on('ready', (info) => {
        this.emit('discord:ready', info);
      });

      discord.on('disconnect', () => {
        this.emit('discord:disconnect');
      });

      discord.on('message', async (message) => {
        await this.handleIncomingMessage('discord', message);
      });

      discord.on('slashCommand', (command) => {
        this.emit('discord:slashCommand', command);
      });

      discord.on('error', (error) => {
        this.emit('discord:error', error);
      });

      // Set up default commands
      discord.onCommand('help', async (msg, ctx) => {
        await ctx.reply(
          'الأوامر المتاحة:\n' +
          '!help - عرض المساعدة\n' +
          '!clear - مسح سجل المحادثة\n' +
          '!status - حالة البوت'
        );
      });

      discord.onCommand('clear', async (msg, ctx) => {
        this.clearHistory('discord', msg.from);
        await ctx.reply('تم مسح سجل المحادثة.');
      });

      discord.onCommand('status', async (msg, ctx) => {
        const status = this.getStatus();
        await ctx.reply(
          `حالة البوت:\nWhatsApp: ${status.whatsapp.isConnected ? 'متصل' : 'غير متصل'}\n` +
          `Telegram: ${status.telegram.isRunning ? 'يعمل' : 'متوقف'}\n` +
          `Discord: ${status.discord.isConnected ? 'متصل' : 'غير متصل'}`
        );
      });

      this.connectors.set('discord', discord);
      return await discord.start();
    } catch (error) {
      console.error('Error initializing Discord:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle incoming messages from any channel
  async handleIncomingMessage(channel, message) {
    try {
      // Store in history
      this.addToHistory(channel, message);

      // Emit for external handling
      this.emit('message', { channel, message });

      // If AI handler is set, process the message
      if (this.aiHandler && !message.isCommand) {
        await this.processWithAI(channel, message);
      }

      // Store in database if available
      if (this.db) {
        this.storeMessage(channel, message);
      }
    } catch (error) {
      console.error(`Error handling ${channel} message:`, error);
      this.emit('error', { channel, error });
    }
  }

  // Process message with AI
  async processWithAI(channel, message) {
    try {
      const connector = this.connectors.get(channel);
      if (!connector) return;

      // Get conversation history for context
      const history = this.getHistory(channel, message.from);
      
      // Show typing indicator
      if (channel === 'whatsapp') {
        await connector.sendTyping(message.from);
      } else if (channel === 'telegram') {
        await connector.sendChatAction(message.chatId, 'typing');
      }

      // Call AI handler
      const response = await this.aiHandler({
        message: message.content,
        channel,
        userId: message.from,
        username: message.sender || message.username,
        history: history.slice(-10), // Last 10 messages for context
        metadata: {
          isGroup: message.isGroup,
          chatId: message.chatId || message.channelId
        }
      });

      // Stop typing indicator
      if (channel === 'whatsapp') {
        await connector.stopTyping(message.from);
      }

      // Send response
      if (response) {
        const targetId = message.chatId || message.from || message.channelId;
        
        if (typeof response === 'string') {
          await this.sendMessage(channel, targetId, response, {
            replyTo: message.id
          });
        } else if (response.text) {
          await this.sendMessage(channel, targetId, response.text, {
            replyTo: message.id,
            ...response.options
          });
        }
      }
    } catch (error) {
      console.error('Error processing with AI:', error);
      
      // Send error message
      const targetId = message.chatId || message.from || message.channelId;
      await this.sendMessage(channel, targetId, 
        'عذراً، حدث خطأ أثناء معالجة رسالتك. يرجى المحاولة مرة أخرى.',
        { replyTo: message.id }
      );
    }
  }

  // Send message to any channel
  async sendMessage(channel, to, content, options = {}) {
    try {
      const connector = this.connectors.get(channel);
      if (!connector) {
        throw new Error(`Connector ${channel} not initialized`);
      }

      let result;

      switch (channel) {
        case 'whatsapp':
          result = await connector.sendMessage(to, content, options);
          break;
        case 'telegram':
          result = await connector.sendMessage(to, content, options);
          break;
        case 'discord':
          result = await connector.sendMessage(to, content, options);
          break;
        default:
          throw new Error(`Unknown channel: ${channel}`);
      }

      // Store sent message in history
      if (result.success) {
        this.addToHistory(channel, {
          id: result.messageId || `sent-${Date.now()}`,
          from: 'bot',
          content,
          timestamp: Date.now(),
          isOutgoing: true
        });
      }

      return result;
    } catch (error) {
      console.error(`Error sending ${channel} message:`, error);
      return { success: false, error: error.message };
    }
  }

  // Send to multiple channels
  async broadcast(channels, to, content, options = {}) {
    const results = [];
    for (const channel of channels) {
      const result = await this.sendMessage(channel, to, content, options);
      results.push({ channel, ...result });
    }
    return results;
  }

  // History management
  addToHistory(channel, message) {
    const key = `${channel}:${message.from}`;
    if (!this.messageHistory.has(key)) {
      this.messageHistory.set(key, []);
    }

    const history = this.messageHistory.get(key);
    history.push({
      ...message,
      receivedAt: Date.now()
    });

    // Trim history if too large
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  getHistory(channel, userId) {
    const key = `${channel}:${userId}`;
    return this.messageHistory.get(key) || [];
  }

  clearHistory(channel, userId) {
    const key = `${channel}:${userId}`;
    this.messageHistory.delete(key);
  }

  // Database storage
  storeMessage(channel, message) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO channel_messages (channel, message_id, user_id, content, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        channel,
        message.id,
        message.from,
        message.content,
        message.type,
        message.timestamp
      );
    } catch (error) {
      console.error('Error storing message:', error);
    }
  }

  // Get connector status
  getStatus() {
    const status = {};
    
    for (const [name, connector] of this.connectors) {
      status[name] = connector.getStatus();
    }

    return status;
  }

  // Get all connectors
  getConnectors() {
    return Array.from(this.connectors.keys());
  }

  // Get specific connector
  getConnector(name) {
    return this.connectors.get(name);
  }

  // Stop all connectors
  async stopAll() {
    const promises = [];
    
    for (const [name, connector] of this.connectors) {
      if (name === 'whatsapp') {
        promises.push(connector.disconnect());
      } else if (name === 'telegram') {
        connector.stop();
        promises.push(Promise.resolve());
      } else if (name === 'discord') {
        promises.push(connector.stop());
      }
    }

    await Promise.all(promises);
    this.connectors.clear();
    this.emit('stopped');
  }

  // Set AI handler
  setAIHandler(handler) {
    this.aiHandler = handler;
  }

  // Webhook handler for Telegram
  async handleTelegramWebhook(update) {
    const telegram = this.connectors.get('telegram');
    if (telegram) {
      await telegram.handleUpdate(update);
    }
  }
}

module.exports = ChannelManager;
