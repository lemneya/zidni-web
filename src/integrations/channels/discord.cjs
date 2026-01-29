/**
 * Discord Channel Connector for Zidni
 * Integrates with Discord using discord.js
 */

const { EventEmitter } = require('events');

class DiscordConnector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.token = options.token || process.env.DISCORD_BOT_TOKEN;
    this.client = null;
    this.intents = options.intents || [
      'Guilds',
      'GuildMessages',
      'GuildMembers',
      'MessageContent',
      'DirectMessages',
      'GuildVoiceStates'
    ];
    this.isConnected = false;
    this.commandHandlers = new Map();
    this.conversationContexts = new Map();
    this.messageQueue = [];
  }

  async start() {
    if (!this.token) {
      throw new Error('Discord bot token is required');
    }

    try {
      // Dynamic import for discord.js (ES module)
      const { Client, GatewayIntentBits, Partials } = await import('discord.js');
      
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.GuildVoiceStates
        ],
        partials: [Partials.Channel, Partials.Message]
      });

      this.setupEventHandlers();
      await this.client.login(this.token);
      
      return { success: true, message: 'Discord bot starting...' };
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  setupEventHandlers() {
    this.client.on('ready', () => {
      this.isConnected = true;
      this.emit('ready', {
        tag: this.client.user.tag,
        id: this.client.user.id,
        guilds: this.client.guilds.cache.size
      });
      console.log(`Discord bot logged in as ${this.client.user.tag}`);
    });

    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      const parsedMessage = this.parseMessage(message);
      
      // Handle commands
      if (parsedMessage.isCommand) {
        await this.handleCommand(parsedMessage, message);
      }

      this.emit('message', parsedMessage);
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isCommand()) return;

      this.emit('slashCommand', {
        id: interaction.id,
        command: interaction.commandName,
        options: interaction.options,
        user: {
          id: interaction.user.id,
          username: interaction.user.username,
          tag: interaction.user.tag
        },
        guild: interaction.guild?.name || 'DM',
        channel: interaction.channel?.name || 'DM',
        interaction
      });
    });

    this.client.on('guildCreate', (guild) => {
      this.emit('guildCreate', {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount
      });
    });

    this.client.on('guildDelete', (guild) => {
      this.emit('guildDelete', {
        id: guild.id,
        name: guild.name
      });
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
      this.emit('error', error);
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
      this.emit('disconnect');
    });
  }

  parseMessage(message) {
    const content = message.content;
    const isCommand = content.startsWith('!') || content.startsWith('/');
    let command = null;
    let args = [];

    if (isCommand) {
      const parts = content.slice(1).trim().split(/\s+/);
      command = parts[0].toLowerCase();
      args = parts.slice(1);
    }

    // Determine message type
    let type = 'text';
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (attachment.contentType?.startsWith('image/')) type = 'image';
      else if (attachment.contentType?.startsWith('video/')) type = 'video';
      else if (attachment.contentType?.startsWith('audio/')) type = 'audio';
      else type = 'file';
    }

    return {
      id: message.id,
      from: message.author.id,
      username: message.author.username,
      tag: message.author.tag,
      avatar: message.author.displayAvatarURL(),
      content: content || (message.attachments.size > 0 ? '[ملف مرفق]' : ''),
      isCommand,
      command,
      args,
      type,
      attachments: Array.from(message.attachments.values()).map(a => ({
        id: a.id,
        url: a.url,
        name: a.name,
        size: a.size,
        contentType: a.contentType
      })),
      channelId: message.channel.id,
      channelName: message.channel.name || 'DM',
      isDM: message.channel.type === 1,
      isGroup: message.channel.type === 3,
      guildId: message.guild?.id || null,
      guildName: message.guild?.name || null,
      timestamp: message.createdTimestamp,
      replyTo: message.reference?.messageId || null,
      mentions: {
        users: Array.from(message.mentions.users.values()).map(u => ({
          id: u.id,
          username: u.username,
          tag: u.tag
        })),
        roles: Array.from(message.mentions.roles.values()).map(r => ({
          id: r.id,
          name: r.name
        })),
        everyone: message.mentions.everyone
      },
      raw: message
    };
  }

  async handleCommand(parsedMessage, originalMessage) {
    const handler = this.commandHandlers.get(parsedMessage.command);
    if (handler) {
      try {
        const context = {
          message: originalMessage,
          reply: (content) => originalMessage.reply(content),
          send: (content) => originalMessage.channel.send(content),
          author: parsedMessage.username,
          args: parsedMessage.args
        };
        await handler(parsedMessage, context);
      } catch (error) {
        console.error(`Error handling command ${parsedMessage.command}:`, error);
        await originalMessage.reply('عذراً، حدث خطأ أثناء معالجة الأمر.');
      }
    }
  }

  onCommand(command, handler) {
    this.commandHandlers.set(command.toLowerCase(), handler);
  }

  async sendMessage(channelId, content, options = {}) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel) {
        throw new Error('Channel not found');
      }

      const messageOptions = {};

      if (typeof content === 'string') {
        messageOptions.content = content;
      } else if (content.embeds) {
        messageOptions.embeds = content.embeds;
      }

      if (options.components) {
        messageOptions.components = options.components;
      }

      if (options.files) {
        messageOptions.files = options.files;
      }

      if (options.replyTo) {
        messageOptions.reply = { messageReference: options.replyTo };
      }

      const sentMessage = await channel.send(messageOptions);
      return {
        success: true,
        messageId: sentMessage.id,
        channelId: sentMessage.channel.id
      };
    } catch (error) {
      console.error('Error sending Discord message:', error);
      return { success: false, error: error.message };
    }
  }

  async sendEmbed(channelId, embedData, options = {}) {
    try {
      const { EmbedBuilder } = await import('discord.js');
      
      const embed = new EmbedBuilder();
      
      if (embedData.title) embed.setTitle(embedData.title);
      if (embedData.description) embed.setDescription(embedData.description);
      if (embedData.color) embed.setColor(embedData.color);
      if (embedData.url) embed.setURL(embedData.url);
      if (embedData.image) embed.setImage(embedData.image);
      if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
      if (embedData.footer) embed.setFooter(embedData.footer);
      if (embedData.timestamp) embed.setTimestamp();
      if (embedData.author) embed.setAuthor(embedData.author);
      if (embedData.fields) {
        embedData.fields.forEach(field => {
          embed.addFields({
            name: field.name,
            value: field.value,
            inline: field.inline || false
          });
        });
      }

      return await this.sendMessage(channelId, { embeds: [embed] }, options);
    } catch (error) {
      console.error('Error sending embed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendDM(userId, content, options = {}) {
    try {
      const user = await this.client.users.fetch(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const messageOptions = {};

      if (typeof content === 'string') {
        messageOptions.content = content;
      } else if (content.embeds) {
        messageOptions.embeds = content.embeds;
      }

      if (options.files) {
        messageOptions.files = options.files;
      }

      const sentMessage = await user.send(messageOptions);
      return {
        success: true,
        messageId: sentMessage.id
      };
    } catch (error) {
      console.error('Error sending DM:', error);
      return { success: false, error: error.message };
    }
  }

  async replyToMessage(messageId, channelId, content, options = {}) {
    return await this.sendMessage(channelId, content, { ...options, replyTo: messageId });
  }

  async editMessage(channelId, messageId, newContent) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      
      if (typeof newContent === 'string') {
        await message.edit(newContent);
      } else if (newContent.embeds) {
        await message.edit({ embeds: newContent.embeds });
      }

      return { success: true };
    } catch (error) {
      console.error('Error editing message:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteMessage(channelId, messageId) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      await message.delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { success: false, error: error.message };
    }
  }

  async addReaction(channelId, messageId, emoji) {
    try {
      const channel = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      await message.react(emoji);
      return { success: true };
    } catch (error) {
      console.error('Error adding reaction:', error);
      return { success: false, error: error.message };
    }
  }

  async getGuild(guildId) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        createdAt: guild.createdAt
      };
    } catch (error) {
      console.error('Error getting guild:', error);
      return null;
    }
  }

  async getGuilds() {
    return this.client.guilds.cache.map(guild => ({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount
    }));
  }

  async getChannels(guildId) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      return guild.channels.cache.map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId
      }));
    } catch (error) {
      console.error('Error getting channels:', error);
      return [];
    }
  }

  async getMembers(guildId) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      await guild.members.fetch();
      return guild.members.cache.map(member => ({
        id: member.id,
        username: member.user.username,
        tag: member.user.tag,
        nickname: member.nickname,
        avatar: member.user.displayAvatarURL(),
        roles: member.roles.cache.map(r => ({ id: r.id, name: r.name })),
        joinedAt: member.joinedAt
      }));
    } catch (error) {
      console.error('Error getting members:', error);
      return [];
    }
  }

  async kickMember(guildId, userId, reason = '') {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      await member.kick(reason);
      return { success: true };
    } catch (error) {
      console.error('Error kicking member:', error);
      return { success: false, error: error.message };
    }
  }

  async banMember(guildId, userId, reason = '', deleteMessageDays = 0) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      await guild.members.ban(userId, { reason, deleteMessageDays });
      return { success: true };
    } catch (error) {
      console.error('Error banning member:', error);
      return { success: false, error: error.message };
    }
  }

  async unbanMember(guildId, userId) {
    try {
      const guild = await this.client.guilds.fetch(guildId);
      await guild.members.unban(userId);
      return { success: true };
    } catch (error) {
      console.error('Error unbanning member:', error);
      return { success: false, error: error.message };
    }
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

  async stop() {
    if (this.client) {
      this.client.destroy();
      this.isConnected = false;
      this.emit('stopped');
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      tag: this.client?.user?.tag,
      id: this.client?.user?.id,
      guilds: this.client?.guilds?.cache?.size || 0,
      uptime: this.client?.uptime,
      activeContexts: this.conversationContexts.size
    };
  }
}

module.exports = DiscordConnector;
