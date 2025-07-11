// Application constants
export const APP_CONFIG = {
  name: 'NaatiNuggets',
  version: '1.0.0',
  description: 'NAATI CCL Exam Preparation Platform',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  supportedFileTypes: ['.csv', '.txt'],
  maxFlashcardsPerSet: 1000,
  maxVocabListItems: 500,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  rateLimitWindow: 60 * 1000, // 1 minute
  maxRequestsPerWindow: 100
} as const;

// API endpoints
export const API_ENDPOINTS = {
  flashcards: '/api/flashcards',
  vocabulary: '/api/vocabulary',
  analytics: '/api/analytics',
  advertisements: '/api/advertisements'
} as const;

// User roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
} as const;

// Advertisement types
export const AD_TYPES = {
  BANNER: 'banner',
  BLOCK: 'block',
  POPOVER: 'popover'
} as const;

// Advertisement placements
export const AD_PLACEMENTS = {
  HEADER: 'header',
  FOOTER: 'footer',
  SIDEBAR_LEFT: 'sidebar_left',
  SIDEBAR_RIGHT: 'sidebar_right',
  CONTENT: 'content',
  MODAL: 'modal',
  BETWEEN_SESSIONS: 'between_sessions',
  AFTER_PRACTICE: 'after_practice',
  CATEGORY_LIST: 'category_list'
} as const;

// Progress status
export const PROGRESS_STATUS = {
  NEW: 'new',
  LEARNING: 'learning',
  KNOWN: 'known',
  NEEDS_PRACTICE: 'needs_practice'
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_CONTENT_LENGTH: 10000,
  MAX_NOTES_LENGTH: 1000,
  MIN_PASSWORD_LENGTH: 6,
  MAX_FILE_NAME_LENGTH: 255
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet.',
  AUTH_ERROR: 'Authentication failed. Please log in again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  SAVED: 'Saved successfully',
  UPLOADED: 'Uploaded successfully'
} as const; 