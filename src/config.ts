// API Configuration
// For local development: http://localhost:3001
// For production: Set VITE_API_URL env var or change this
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Feature flags
export const FEATURES = {
  ENABLE_TOOLS: true,
  ENABLE_CHANNELS: true,
  ENABLE_MEMORY: true,
};

// Default settings
export const DEFAULTS = {
  MODEL: 'zidni-general',
  LANGUAGE: 'ar',
};
