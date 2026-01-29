/**
 * Clawdbot Integration for Zidni
 * 
 * This module provides integration with Clawdbot (Moltbot) - an open-source AI assistant framework.
 * It includes:
 * - Gateway connector for WebSocket communication
 * - Skill loader for executing Clawdbot skills
 * - Memory system for persistent storage
 * - Channel connectors for WhatsApp, Telegram, and Discord
 */

const { ClawdGateway } = require('./gateway.cjs');
const { SkillLoader } = require('./skills.cjs');
const { ZidniMemory } = require('./memory.cjs');
const ChannelManager = require('../channels/index.cjs');

module.exports = {
  ClawdGateway,
  SkillLoader,
  ZidniMemory,
  ChannelManager
};
