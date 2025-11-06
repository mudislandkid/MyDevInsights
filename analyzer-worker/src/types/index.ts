/**
 * Analyzer Worker Types
 * Type definitions for job processing, AI analysis, and caching
 */

export interface AnalysisJobData {
  projectId: string;
  projectPath: string;
  projectName: string;
  priority?: 'low' | 'normal' | 'high';
  forceRefresh?: boolean; // Skip cache
}

export interface ProjectContext {
  name: string;
  path: string;
  readme?: string;
  packageJson?: Record<string, any>;
  mainFiles: FileContent[];
  fileCount: number;
  linesOfCode: number;
  totalSize: number;
  estimatedTokens: number;
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface AnalysisResult {
  projectId: string;
  summary: string;
  techStack: TechStack;
  complexity: 'simple' | 'moderate' | 'complex' | 'very-complex';
  recommendations: Recommendation[];
  completionScore: number; // 0-100
  maturityLevel: 'poc' | 'mvp' | 'production-ready' | 'enterprise';
  productionGaps: string[]; // What's needed to reach production
  estimatedValue: EstimatedValue;
  metadata: AnalysisMetadata;
}

export interface EstimatedValue {
  currency: 'GBP';
  saasMonthly: {
    min: number;
    max: number;
    confidence: 'low' | 'medium' | 'high';
  };
  ipSale: {
    min: number;
    max: number;
    confidence: 'low' | 'medium' | 'high';
  };
  reasoning: string;
}

export interface TechStack {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  devOps?: string[];
  testing?: string[];
  other?: string[];
}

export interface Recommendation {
  type: 'security' | 'performance' | 'architecture' | 'tooling' | 'documentation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AnalysisMetadata {
  model: string;
  tokensUsed: number;
  cacheHit: boolean;
  cacheRead?: number;
  cacheCreation?: number;
  duration: number; // milliseconds
  timestamp: Date;
}

export interface CachedAnalysis {
  result: AnalysisResult;
  projectHash: string;
  lastModified: Date;
  createdAt: Date;
  expiresAt: Date;
}

export interface JobProgress {
  projectId: string;
  status: 'queued' | 'extracting' | 'analyzing' | 'caching' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  error?: string;
}

export interface RateLimitConfig {
  maxConcurrent: number;
  requestsPerMinute: number;
  backoffMultiplier: number;
  maxRetries: number;
  initialDelayMs: number;
}

export interface WorkerConfig {
  redisUrl: string;
  anthropicApiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  cacheTTL: number;
  maxContextTokens: number;
  concurrency: number;
  rateLimit: RateLimitConfig;
}

export interface WorkerStats {
  jobsProcessed: number;
  jobsFailed: number;
  cacheHits: number;
  cacheMisses: number;
  totalTokensUsed: number;
  averageDuration: number;
  uptime: number;
}
