import { create } from 'zustand'
import type { Project } from '../types'

interface ProjectStore {
  projects: Project[]
  selectedProject: Project | null
  searchQuery: string
  filters: {
    framework?: string
    language?: string
    status?: string
  }
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  setSelectedProject: (project: Project | null) => void
  setSearchQuery: (query: string) => void
  setFilters: (filters: ProjectStore['filters']) => void
  clearFilters: () => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  selectedProject: null,
  searchQuery: '',
  filters: {},

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    })),

  setSelectedProject: (project) => set({ selectedProject: project }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  clearFilters: () => set({ filters: {} }),
}))
