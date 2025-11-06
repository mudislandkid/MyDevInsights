import type { Project, ProjectAnalysis } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  async fetchProjects(params?: {
    page?: number
    limit?: number
    status?: string
    framework?: string
    language?: string
    search?: string
  }): Promise<{ data: Project[]; pagination: any }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value))
      })
    }

    const response = await fetch(
      `${this.baseUrl}/projects?${queryParams.toString()}`
    )
    if (!response.ok) throw new Error('Failed to fetch projects')
    return response.json()
  }

  async fetchProject(id: string): Promise<{ data: Project }> {
    const response = await fetch(`${this.baseUrl}/projects/${id}`)
    if (!response.ok) throw new Error('Failed to fetch project')
    return response.json()
  }

  async updateProject(
    id: string,
    updates: Partial<Project>
  ): Promise<{ data: Project }> {
    const response = await fetch(`${this.baseUrl}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) throw new Error('Failed to update project')
    return response.json()
  }

  async deleteProject(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/projects/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete project')
  }

  async revealProject(id: string): Promise<{ path: string }> {
    const response = await fetch(`${this.baseUrl}/projects/${id}/reveal`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to get project path')
    return response.json()
  }

  async openProject(
    id: string,
    action: 'open' | 'terminal' | 'reveal',
    editor?: 'vscode' | 'cursor'
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/projects/${id}/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, editor }),
    })
    if (!response.ok) throw new Error('Failed to open project')
  }

  async triggerAnalysis(id: string, force = false): Promise<void> {
    const response = await fetch(`${this.baseUrl}/projects/${id}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    })
    if (!response.ok) throw new Error('Failed to trigger analysis')
  }

  async fetchAnalysisHistory(
    id: string
  ): Promise<{ data: ProjectAnalysis[] }> {
    const response = await fetch(`${this.baseUrl}/projects/${id}/analysis`)
    if (!response.ok) throw new Error('Failed to fetch analysis history')
    return response.json()
  }

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/health`)
    if (!response.ok) throw new Error('Health check failed')
    return response.json()
  }

  async scanProjects(resetDeleted: boolean = false): Promise<{
    success: boolean
    message: string
    scanned: number
    created: number
    updated: number
    skipped: number
    failed: number
    resetDeleted: boolean
  }> {
    const queryParams = new URLSearchParams()
    if (resetDeleted) queryParams.append('resetDeleted', 'true')

    const response = await fetch(
      `${this.baseUrl}/projects/scan?${queryParams.toString()}`,
      { method: 'POST' }
    )
    if (!response.ok) throw new Error('Failed to scan projects')
    return response.json()
  }

  async resetStuckProjects(): Promise<{
    success: boolean
    message: string
    projectsReset: number
    jobsCleared: number
  }> {
    const response = await fetch(`${this.baseUrl}/projects/reset-stuck`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to reset stuck projects')
    return response.json()
  }

  // Queue management methods
  async getQueueStats(): Promise<{
    data: {
      waiting: number
      active: number
      completed: number
      failed: number
      delayed: number
      healthy: boolean
    }
  }> {
    const response = await fetch(`${this.baseUrl}/queue/stats`)
    if (!response.ok) throw new Error('Failed to fetch queue stats')
    return response.json()
  }

  async getQueueJobs(params?: {
    status?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
    page?: number
    limit?: number
  }): Promise<{
    data: Array<{
      id: string
      name: string
      data: any
      state: string
      progress: number
      timestamp: number
      processedOn?: number
      finishedOn?: number
      failedReason?: string
      attemptsMade: number
    }>
    pagination: {
      page: number
      limit: number
      total: number
    }
  }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value))
      })
    }

    const response = await fetch(`${this.baseUrl}/queue/jobs?${queryParams.toString()}`)
    if (!response.ok) throw new Error('Failed to fetch queue jobs')
    return response.json()
  }

  async getQueueJob(id: string): Promise<{
    data: {
      id: string
      name: string
      data: any
      state: string
      progress: number
      timestamp: number
      processedOn?: number
      finishedOn?: number
      failedReason?: string
      stacktrace?: string[]
      attemptsMade: number
      logs?: string[]
    }
  }> {
    const response = await fetch(`${this.baseUrl}/queue/jobs/${id}`)
    if (!response.ok) throw new Error('Failed to fetch queue job')
    return response.json()
  }

  async deleteQueueJob(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/queue/jobs/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete queue job')
  }

  async clearQueue(): Promise<{
    success: boolean
    message: string
    cleared: number
    completedCleared: number
    failedCleared: number
  }> {
    const response = await fetch(`${this.baseUrl}/queue/clear`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to clear queue')
    return response.json()
  }

  async pauseQueue(): Promise<{
    success: boolean
    message: string
  }> {
    const response = await fetch(`${this.baseUrl}/queue/pause`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to pause queue')
    return response.json()
  }

  async resumeQueue(): Promise<{
    success: boolean
    message: string
  }> {
    const response = await fetch(`${this.baseUrl}/queue/resume`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to resume queue')
    return response.json()
  }
}

export const apiClient = new ApiClient()
