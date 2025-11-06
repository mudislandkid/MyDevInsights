export type ProjectStatus = 'DISCOVERED' | 'QUEUED' | 'ANALYZING' | 'ANALYZED' | 'ERROR' | 'ARCHIVED'

export interface Project {
  id: string
  name: string
  path: string
  description?: string

  // Framework and language info
  framework?: string
  frameworks?: string[]
  primaryFramework?: string
  language?: string
  languages?: string[]
  primaryLanguage?: string
  languagePercentages?: Record<string, number>
  packageManager?: string

  // File info
  fileCount?: number
  linesOfCode?: number
  size?: number
  totalSize?: number

  // Status and dates
  status: ProjectStatus
  createdAt?: Date
  discoveredAt?: Date
  updatedAt?: Date
  analyzedAt?: Date
  lastAnalyzedAt?: Date

  // AI Analysis
  aiSummary?: string
  tags?: Tag[]
  recommendations?: Recommendation[]
  latestAnalysis?: ProjectAnalysis
  techStack?: Record<string, string[]>
  complexity?: string
  completionScore?: number
  maturityLevel?: 'poc' | 'mvp' | 'production-ready' | 'enterprise'
  productionGaps?: string[]
  estimatedValue?: EstimatedValue
}

export interface Tag {
  id: string
  name: string
  color?: string
}

export interface ProjectAnalysis {
  id: string
  projectId: string
  summary: string
  techStack: Record<string, string[]>
  complexity?: string
  recommendations?: Recommendation[]
  completionScore?: number
  maturityLevel?: 'poc' | 'mvp' | 'production-ready' | 'enterprise'
  productionGaps?: string[]
  estimatedValue?: EstimatedValue
  model: string
  tokensUsed?: number
  cacheHit: boolean
  createdAt: Date
}

export interface EstimatedValue {
  currency: 'GBP'
  saasMonthly: {
    min: number
    max: number
    confidence: 'low' | 'medium' | 'high'
  }
  ipSale: {
    min: number
    max: number
    confidence: 'low' | 'medium' | 'high'
  }
  reasoning: string
}

export interface Recommendation {
  type: 'security' | 'performance' | 'architecture' | 'tooling' | 'documentation'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
}

export interface WebSocketMessage {
  type: 'project:added' | 'project:updated' | 'project:removed' | 'analysis:started' | 'analysis:progress' | 'analysis:completed' | 'analysis:failed'
  projectId: string
  data?: any
  timestamp: Date
}
