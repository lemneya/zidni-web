/**
 * Telegram Channel Connector for Zidni
 * Integrates with Telegram Bot API
 */

const { EventEmitter } = require('events');

class TelegramConnector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.token = options.token || process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = 'https://api.telegram.org/bot';
    this.webhookUrl = options.webhookUrl || null;
    this.pollingInterval = options.pollingInterval || 1000;
    this.offset = 0;
    this.isRunning = false;
    this.pollingTimeout = null;
    this.messageHandlers = new Map();
    this.commandHandlers = new Map();
    this.conversationContexts = new Map();
  }

  async start() {
    if (!this.token) {
      throw new Error('Telegram bot token is required');
    }

    try {
      // Verify bot token
      const me = await this.request('getMe');
      if (!me.ok) {
        throw new Error('Invalid bot token');
      }

      this.botInfo = me.result;
      this.isRunning = true;

      if (this.webhookUrl) {
        await this.setupWebhook();
      } else {
        this.startPolling();
      }

      this.emit('started', this.botInfo);
      return { success: true, bot: this.botInfo };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async request(method, params = {}) {
    const url = `${this.apiUrl}${this.token}/${method}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      return await response.json();
    } catch (error) {
      console.error(`Telegram API error (${method}):`, error);
      throw error;
    }
  }

  async setupWebhook() {
    await this.request('setWebhook', {
      url: this.webhookUrl,
      allowed_updates: ['message', 'callback_query', 'inline_query']
    });
  }

  startPolling() {
    const poll = async () => {
      if (!this.isRunning) return;

      try {
        const updates = await this.request('getUpdates', {
          offset: this.offset,
          limit: 100,
          timeout: 30
        });

        if (updates.ok && updates.result.length > 0) {
          for (const update of updates.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        }
      } catch (error) {
        this.emit('error', error);
      }

      this.pollingTimeout = setTimeout(poll, this.pollingInterval);
    };

    poll();
  }

  async handleUpdate(update) {
    try {
      if (update.message) {
        const message = this.parseMessage(update.message);
        
        // Check if it's a command
        if (message.isCommand) {
          await this.handleCommand(message);
        }
        
        this.emit('message', message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      } else if (update.inline_query) {
        await this.handleInlineQuery(update.inline_query);
      }
    } catch (error) {
      console.error('Error handling update:', error);
      this.emit('error', error);
    }
  }

  parseMessage(msg) {
    let content = '';
    let type = 'text';
    let mediaUrl = null;
    let fileId = null;

    if (msg.text) {
      content = msg.text;
      type = 'text';
      
      // Check for commands
      if (content.startsWith('/')) {
        const parts = content.split(' ');
        const command = parts[0].substring(1);
        const args = parts.slice(1);
        return {
          id: msg.message_id,
          from: msg.from.id,
          chatId: msg.chat.id,
          chatType: msg.chat.type,
          chatTitle: msg.chat.title || msg.chat.username || 'Private',
          sender: msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : ''),
          username: msg.from.username,
          content,
          command,
          args,
          isCommand: true,
          type,
          mediaUrl,
          fileId,
          timestamp: msg.date * 1000,
          isGroup: msg.chat.type === 'group' || msg.chat.type === 'supergroup',
          replyTo: msg.reply_to_message?.message_id || null,
          raw: msg
        };
      }
    } else if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1]; // Get largest
      content = msg.caption || '[صورة]';
      type = 'image';
      fileId = photo.file_id;
    } else if (msg.video) {
      content = msg.caption || '[فيديو]';
      type = 'video';
      fileId = msg.video.file_id;
    } else if (msg.audio) {
      content = `[صوتي: ${msg.audio.title || 'Unknown'}]`;
      type = 'audio';
      fileId = msg.audio.file_id;
    } else if (msg.voice) {
      content = '[رسالة صوتية]';
      type = 'voice';
      fileId = msg.voice.file_id;
    } else if (msg.document) {
      content = `[مستند: ${msg.document.file_name}]`;
      type = 'document';
      fileId = msg.document.file_id;
    } else if (msg.location) {
      content = `[موقع: ${msg.location.latitude}, ${msg.location.longitude}]`;
      type = 'location';
    } else if (msg.contact) {
      content = `[جهة اتصال: ${msg.contact.first_name}]`;
      type = 'contact';
    } else if (msg.sticker) {
      content = '[ملصق]';
      type = 'sticker';
      fileId = msg.sticker.file_id;
    }

    return {
      id: msg.message_id,
      from: msg.from.id,
      chatId: msg.chat.id,
      chatType: msg.chat.type,
      chatTitle: msg.chat.title || msg.chat.username || 'Private',
      sender: msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : ''),
      username: msg.from.username,
      content,
      isCommand: false,
      type,
      mediaUrl,
      fileId,
      timestamp: msg.date * 1000,
      isGroup: msg.chat.type === 'group' || msg.chat.type === 'supergroup',
      replyTo: msg.reply_to_message?.message_id || null,
      raw: msg
    };
  }

  async handleCommand(message) {
    const handler = this.commandHandlers.get(message.command);
    if (handler) {
      try {
        await handler(message);
      } catch (error) {
        console.error(`Error handling command ${message.command}:`, error);
        await this.sendMessage(message.chatId, 'عذراً، حدث خطأ أثناء معالجة الأمر.');
      }
    }
  }

  async handleCallbackQuery(query) {
    this.emit('callback_query', {
      id: query.id,
      from: query.from.id,
      data: query.data,
      message: query.message
    });
    
    // Answer the callback query
    await this.request('answerCallbackQuery', { callback_query_id: query.id });
  }

  async handleInlineQuery(query) {
    this.emit('inline_query', {
      id: query.id,
      from: query.from.id,
      query: query.query,
      offset: query.offset
    });
  }

  onCommand(command, handler) {
    this.commandHandlers.set(command, handler);
  }

  async sendMessage(chatId, text, options = {}) {
    const params = {
      chat_id: chatId,
      text,
      parse_mode: options.parseMode || 'HTML',
      disable_web_page_preview: options.disablePreview || false,
      reply_to_message_id: options.replyTo || null
    };

    if (options.keyboard) {
      params.reply_markup = {
        keyboard: options.keyboard,
        resize_keyboard: true,
        one_time_keyboard: options.oneTime || false
      };
    } else if (options.inlineKeyboard) {
      params.reply_markup = {
        inline_keyboard: options.inlineKeyboard
      };
    } else if (options.removeKeyboard) {
      params.reply_markup = { remove_keyboard: true };
    }

    return await this.request('sendMessage', params);
  }

  async sendPhoto(chatId, photo, caption = '', options = {}) {
    const params = {
      chat_id: chatId,
      photo,
      caption,
      parse_mode: options.parseMode || 'HTML'
    };

    if (options.inlineKeyboard) {
      params.reply_markup = { inline_keyboard: options.inlineKeyboard };
    }

    return await this.request('sendPhoto', params);
  }

  async sendDocument(chatId, document, caption = '', options = {}) {
    const params = {
      chat_id: chatId,
      document,
      caption,
      parse_mode: options.parseMode || 'HTML'
    };

    return await this.request('sendDocument', params);
  }

  async sendAudio(chatId, audio, caption = '', options = {}) {
    const params = {
      chat_id: chatId,
      audio,
      caption,
      parse_mode: options.parseMode || 'HTML'
    };

    return await this.request('sendAudio', params);
  }

  async sendVoice(chatId, voice, caption = '', options = {}) {
    const params = {
      chat_id: chatId,
      voice,
      caption,
      parse_mode: options.parseMode || 'HTML'
    };

    return await this.request('sendVoice', params);
  }

  async sendChatAction(chatId, action) {
    return await this.request('sendChatAction', {
      chat_id: chatId,
      action
    });
  }

  async editMessageText(chatId, messageId, text, options = {}) {
    const params = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options.parseMode || 'HTML'
    };

    if (options.inlineKeyboard) {
      params.reply_markup = { inline_keyboard: options.inlineKeyboard };
    }

    return await this.request('editMessageText', params);
  }

  async deleteMessage(chatId, messageId) {
    return await this.request('deleteMessage', {
      chat_id: chatId,
      message_id: messageId
    });
  }

  async getFile(fileId) {
    return await this.request('getFile', { file_id: fileId });
  }

  async getFileUrl(fileId) {
    const file = await this.getFile(fileId);
    if (file.ok) {
      return `https://api.telegram.org/file/bot${this.token}/${file.result.file_path}`;
    }
    return null;
  }

  async downloadFile(fileId, destPath) {
    const fs = require('fs');
    const fileUrl = await this.getFileUrl(fileId);
    
    if (!fileUrl) return null;

    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
    
    return destPath;
  }

  async getChat(chatId) {
    return await this.request('getChat', { chat_id: chatId });
  }

  async getChatAdministrators(chatId) {
    return await this.request('getChatAdministrators', { chat_id: chatId });
  }

  async getChatMemberCount(chatId) {
    return await this.request('getChatMemberCount', { chat_id: chatId });
  }

  async banChatMember(chatId, userId) {
    return await this.request('banChatMember', {
      chat_id: chatId,
      user_id: userId
    });
  }

  async unbanChatMember(chatId, userId) {
    return await this.request('unbanChatMember', {
      chat_id: chatId,
      user_id: userId
    });
  }

  setConversationContext(userId, context) {
    this.conversationContexts.set(userId, {
      ...context,
      lastUpdate: Date.now()
    });
  }

  getConversationContext(userId) {
    return this.conversationContexts.get(userId);
  }

  clearConversationContext(userId) {
    this.conversationContexts.delete(userId);
  }

  stop() {
    this.isRunning = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }
    this.emit('stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      botInfo: this.botInfo,
      offset: this.offset,
      hasWebhook: !!this.webhookUrl,
      activeContexts: this.conversationContexts.size
    };
  }
}

module.exports = TelegramConnector;
