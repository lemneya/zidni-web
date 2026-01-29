/**
 * WhatsApp Channel Connector for Zidni
 * Integrates with WhatsApp Web via Baileys library
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class WhatsAppConnector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sessionDir = options.sessionDir || path.join(require('os').homedir(), '.zidni', 'whatsapp-sessions');
    this.sessionName = options.sessionName || 'zidni-default';
    this.sock = null;
    this.qrCode = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.messageQueue = [];
    this.processingQueue = false;
    
    this.ensureSessionDir();
  }

  ensureSessionDir() {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  async initialize() {
    try {
      // Dynamic import for Baileys (ES module)
      const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = await import('@whiskeysockets/baileys');
      
      const { state, saveCreds } = await useMultiFileAuthState(
        path.join(this.sessionDir, this.sessionName)
      );

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Zidni AI', 'Chrome', '1.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: true,
        keepAliveIntervalMs: 30000,
      });

      this.sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          this.qrCode = qr;
          this.emit('qr', qr);
        }

        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          this.isConnected = false;
          this.emit('disconnected', { shouldReconnect, reason: lastDisconnect?.error });
          
          if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.initialize(), this.reconnectDelay);
          }
        } else if (connection === 'open') {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.qrCode = null;
          this.emit('connected');
          this.processMessageQueue();
        }
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        if (!message.key.fromMe && m.type === 'notify') {
          const parsedMessage = this.parseMessage(message);
          if (parsedMessage) {
            this.emit('message', parsedMessage);
          }
        }
      });

      return { success: true, message: 'WhatsApp initializing...' };
    } catch (error) {
      this.emit('error', error);
      return { success: false, error: error.message };
    }
  }

  parseMessage(message) {
    try {
      const msgContent = message.message;
      let content = '';
      let type = 'text';
      let mediaUrl = null;

      if (msgContent?.conversation) {
        content = msgContent.conversation;
      } else if (msgContent?.extendedTextMessage?.text) {
        content = msgContent.extendedTextMessage.text;
      } else if (msgContent?.imageMessage) {
        content = msgContent.imageMessage.caption || '[صورة]';
        type = 'image';
      } else if (msgContent?.videoMessage) {
        content = msgContent.videoMessage.caption || '[فيديو]';
        type = 'video';
      } else if (msgContent?.audioMessage) {
        content = '[رسالة صوتية]';
        type = 'audio';
      } else if (msgContent?.documentMessage) {
        content = `[مستند: ${msgContent.documentMessage.fileName}]`;
        type = 'document';
      } else if (msgContent?.locationMessage) {
        content = `[موقع: ${msgContent.locationMessage.degreesLatitude}, ${msgContent.locationMessage.degreesLongitude}]`;
        type = 'location';
      }

      return {
        id: message.key.id,
        from: message.key.remoteJid,
        sender: message.pushName || 'Unknown',
        content,
        type,
        mediaUrl,
        timestamp: message.messageTimestamp * 1000,
        isGroup: message.key.remoteJid?.endsWith('@g.us'),
        groupName: null,
        replyTo: msgContent?.extendedTextMessage?.contextInfo?.stanzaId || null,
        raw: message
      };
    } catch (error) {
      console.error('Error parsing WhatsApp message:', error);
      return null;
    }
  }

  async sendMessage(to, content, options = {}) {
    try {
      if (!this.isConnected) {
        this.messageQueue.push({ to, content, options });
        return { success: false, queued: true, message: 'Message queued - WhatsApp not connected' };
      }

      const jid = this.formatJid(to);
      
      if (options.media) {
        // Send media message
        const { buffer, mimetype, filename } = options.media;
        await this.sock.sendMessage(jid, {
          document: buffer,
          mimetype,
          fileName: filename,
          caption: content
        });
      } else if (options.image) {
        await this.sock.sendMessage(jid, {
          image: options.image,
          caption: content
        });
      } else {
        // Send text message
        await this.sock.sendMessage(jid, { text: content });
      }

      return { success: true, message: 'Message sent' };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTyping(to) {
    if (!this.isConnected) return;
    try {
      const jid = this.formatJid(to);
      await this.sock.sendPresenceUpdate('composing', jid);
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  async stopTyping(to) {
    if (!this.isConnected) return;
    try {
      const jid = this.formatJid(to);
      await this.sock.sendPresenceUpdate('paused', jid);
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
    }
  }

  formatJid(phone) {
    // Convert phone number to WhatsApp JID format
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.includes('@')) return cleaned;
    return `${cleaned}@s.whatsapp.net`;
  }

  async processMessageQueue() {
    if (this.processingQueue || this.messageQueue.length === 0) return;
    
    this.processingQueue = true;
    while (this.messageQueue.length > 0 && this.isConnected) {
      const msg = this.messageQueue.shift();
      await this.sendMessage(msg.to, msg.content, msg.options);
      await new Promise(r => setTimeout(r, 1000)); // Rate limiting
    }
    this.processingQueue = false;
  }

  async getContacts() {
    if (!this.isConnected) return [];
    try {
      const contacts = await this.sock.contactQuery('');
      return contacts.map(c => ({
        jid: c.id,
        name: c.name || c.notify || c.verifiedName,
        phone: c.id.split('@')[0]
      }));
    } catch (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
  }

  async getChats() {
    if (!this.isConnected) return [];
    try {
      const chats = await this.sock.groupFetchAllParticipating();
      return Object.values(chats).map(g => ({
        id: g.id,
        name: g.subject,
        isGroup: true,
        participants: g.participants.length
      }));
    } catch (error) {
      console.error('Error getting chats:', error);
      return [];
    }
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      this.isConnected = false;
      this.emit('disconnected', { shouldReconnect: false, reason: 'manual' });
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      hasQR: !!this.qrCode,
      sessionName: this.sessionName,
      reconnectAttempts: this.reconnectAttempts,
      queueSize: this.messageQueue.length
    };
  }
}

module.exports = WhatsAppConnector;
