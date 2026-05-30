// Core Application Types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
  isActive: boolean;
}

export enum UserRole {
  ADMIN = 'admin',
  PARENT = 'parent',
  CHILD = 'child',
  USER = 'user'
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  filtering: FilteringPreferences;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  desktop: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface PrivacySettings {
  dataCollection: boolean;
  analytics: boolean;
  crashReporting: boolean;
  dataRetention: number; // days
}

export interface FilteringPreferences {
  strictness: FilteringLevel;
  categories: ContentCategory[];
  customRules: CustomRule[];
  schedule: FilteringSchedule;
}

// Content Filtering Types
export enum FilteringLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  MAXIMUM = 'maximum'
}

export enum ContentCategory {
  ADULT = 'adult',
  VIOLENCE = 'violence',
  GAMBLING = 'gambling',
  SOCIAL_MEDIA = 'social_media',
  GAMING = 'gaming',
  SHOPPING = 'shopping',
  NEWS = 'news',
  ENTERTAINMENT = 'entertainment',
  PRODUCTIVITY = 'productivity',
  EDUCATION = 'education'
}

export interface CustomRule {
  id: string;
  name: string;
  pattern: string;
  action: RuleAction;
  category: ContentCategory;
  isActive: boolean;
  createdAt: Date;
}

export enum RuleAction {
  BLOCK = 'block',
  ALLOW = 'allow',
  WARN = 'warn',
  LOG = 'log'
}

export interface FilteringSchedule {
  isEnabled: boolean;
  timezone: string;
  rules: ScheduleRule[];
}

export interface ScheduleRule {
  id: string;
  name: string;
  daysOfWeek: number[]; // 0-6, Sunday = 0
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  level: FilteringLevel;
}

// Content Analysis Types
export interface ContentAnalysis {
  id: string;
  url: string;
  content: string;
  contentType: ContentType;
  category: ContentCategory;
  riskScore: number;
  isBlocked: boolean;
  analysisTime: Date;
  metadata: ContentMetadata;
}

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  APPLICATION = 'application',
  UNKNOWN = 'unknown'
}

export interface ContentMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  publisher?: string;
  fileSize?: number;
  duration?: number;
  dimensions?: { width: number; height: number };
}

// Network and System Types
export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  timestamp: Date;
  sourceIp: string;
  userAgent: string;
  isBlocked: boolean;
  blockReason?: string;
}

export interface SystemEvent {
  id: string;
  type: SystemEventType;
  timestamp: Date;
  userId?: string;
  details: Record<string, any>;
  severity: EventSeverity;
}

export enum SystemEventType {
  FILTERING_ENABLED = 'filtering_enabled',
  FILTERING_DISABLED = 'filtering_disabled',
  CONTENT_BLOCKED = 'content_blocked',
  BYPASS_ATTEMPT = 'bypass_attempt',
  SYSTEM_ERROR = 'system_error',
  CONFIGURATION_CHANGED = 'configuration_changed',
  USER_ACTIVITY = 'user_activity'
}

export enum EventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Security Types
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  timestamp: Date;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  isResolved: boolean;
}

export enum SecurityEventType {
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  TAMPERING_ATTEMPT = 'tampering_attempt',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MALWARE_DETECTED = 'malware_detected'
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Configuration Types
export interface AppConfiguration {
  version: string;
  environment: 'development' | 'staging' | 'production';
  database: DatabaseConfig;
  security: SecurityConfig;
  filtering: FilteringConfig;
  notifications: NotificationConfig;
  logging: LoggingConfig;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql';
  path?: string;
  host?: string;
  port?: number;
  name?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
}

export interface FilteringConfig {
  defaultLevel: FilteringLevel;
  cacheTimeout: number;
  analysisTimeout: number;
  maxContentSize: number;
  enableRealTimeAnalysis: boolean;
}

export interface NotificationConfig {
  email: EmailConfig;
  push: PushConfig;
  sms?: SMSConfig;
}

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface PushConfig {
  enabled: boolean;
  serverKey: string;
  senderId: string;
}

export interface SMSConfig {
  enabled: boolean;
  accountSid: string;
  authToken: string;
  from: string;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  file: string;
  maxSize: string;
  maxFiles: number;
}

// Platform-specific Types
export interface PlatformCapabilities {
  platform: PlatformType;
  canFilterNetwork: boolean;
  canFilterApplications: boolean;
  canMonitorProcesses: boolean;
  canBlockWebsites: boolean;
  requiresRoot: boolean;
  persistenceLevel: PersistenceLevel;
}

export enum PlatformType {
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web'
}

export enum PersistenceLevel {
  NONE = 'none',
  USER = 'user',
  SYSTEM = 'system',
  KERNEL = 'kernel'
}

// Error Types
export class ContentFilterError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ContentFilterError';
  }
}

export class ValidationError extends ContentFilterError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ContentFilterError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ContentFilterError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ContentFilterError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404);
    this.name = 'NotFoundError';
  }
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

// Constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const FILTERING_LEVELS = [
  FilteringLevel.NONE,
  FilteringLevel.LOW,
  FilteringLevel.MEDIUM,
  FilteringLevel.HIGH,
  FilteringLevel.MAXIMUM
] as const;

export const CONTENT_CATEGORIES = Object.values(ContentCategory);

export const PLATFORM_TYPES = Object.values(PlatformType);