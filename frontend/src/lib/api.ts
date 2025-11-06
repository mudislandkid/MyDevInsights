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
}

export const apiClient = new ApiClient()
