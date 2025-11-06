import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { useProjectStore } from '@/stores/useProjectStore'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { SearchFilters, type FilterState } from '@/components/projects/SearchFilters'
import { ProjectDetailModal } from '@/components/projects/ProjectDetailModal'
import { ProjectGridSkeleton } from '@/components/projects/ProjectCardSkeleton'
import { RefreshCw, Inbox, AlertCircle, FolderSearch, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export function Dashboard() {
  const { projects, setProjects } = useProjectStore()
  const [filters, setFilters] = useState<FilterState>({
    search: '',
  })
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showScanDialog, setShowScanDialog] = useState(false)
  const [resetDeleted, setResetDeleted] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Fetch projects (no pagination - fetch all)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['projects', filters],
    queryFn: () =>
      apiClient.fetchProjects({
        page: 1,
        limit: 1000, // High limit to fetch all projects
        search: filters.search || undefined,
        framework: filters.framework || undefined,
        language: filters.language || undefined,
        status: filters.status || undefined,
      }),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Update store when data changes
  useEffect(() => {
    if (data?.data) {
      setProjects(data.data)
    }
  }, [data?.data, setProjects])

  // Get unique frameworks and languages for filters
  const { frameworks, languages } = useMemo(() => {
    const fwSet = new Set<string>()
    const langSet = new Set<string>()

    projects.forEach((project) => {
      if (project.primaryFramework) fwSet.add(project.primaryFramework)
      if (project.primaryLanguage) langSet.add(project.primaryLanguage)
    })

    return {
      frameworks: Array.from(fwSet).sort(),
      languages: Array.from(langSet).sort(),
    }
  }, [projects])

  // Filter projects client-side for immediate feedback
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter (already applied server-side, but for immediate feedback)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          project.name.toLowerCase().includes(searchLower) ||
          project.path.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Framework filter
      if (filters.framework && project.primaryFramework !== filters.framework) {
        return false
      }

      // Language filter
      if (filters.language && project.primaryLanguage !== filters.language) {
        return false
      }

      // Status filter
      if (filters.status && project.status !== filters.status) {
        return false
      }

      return true
    })
  }, [projects, filters])

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
  }, [])

  const handleAnalyzeProject = useCallback(async (projectId: string) => {
    try {
      await apiClient.triggerAnalysis(projectId, true)
      toast.success('Analysis started', {
        description: 'The project will be analyzed in the background'
      })
      // Refetch to get updated status
      setTimeout(() => refetch(), 1000)
    } catch (error) {
      console.error('Failed to analyze project:', error)
      toast.error('Failed to start analysis', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    }
  }, [refetch])

  const handleEditProject = useCallback((projectId: string) => {
    // Open edit modal via details view
    setSelectedProjectId(projectId)
  }, [])

  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await apiClient.deleteProject(projectId)
      toast.success('Project deleted')
      // Refetch to update list
      refetch()
    } catch (error) {
      console.error('Failed to delete project:', error)
      toast.error('Failed to delete project', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    }
  }, [refetch])

  const handleViewDetails = useCallback((projectId: string) => {
    setSelectedProjectId(projectId)
  }, [])

  const handleScanProjects = useCallback(async () => {
    setIsScanning(true)
    setShowScanDialog(false)

    try {
      const result = await apiClient.scanProjects(resetDeleted)

      toast.success('Scan completed successfully', {
        description: `Found ${result.scanned} directories. Created ${result.created}, updated ${result.updated}, skipped ${result.skipped}, failed ${result.failed}.`
      })

      // Reset the checkbox for next time
      setResetDeleted(false)

      // Refetch projects to show updated list
      refetch()
    } catch (error) {
      console.error('Failed to scan projects:', error)
      toast.error('Failed to scan projects', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsScanning(false)
    }
  }, [resetDeleted, refetch])

  const handleResetStuck = useCallback(async () => {
    setIsResetting(true)

    try {
      const result = await apiClient.resetStuckProjects()

      toast.success('Reset completed successfully', {
        description: `Reset ${result.projectsReset} stuck projects and cleared ${result.jobsCleared} queued jobs.`
      })

      // Refetch projects to show updated status
      refetch()
    } catch (error) {
      console.error('Failed to reset stuck projects:', error)
      toast.error('Failed to reset stuck projects', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsResetting(false)
    }
  }, [refetch])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-50 backdrop-blur-lg shadow-lg">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="MyDevInsights Logo"
                className="h-25 w-25"
              />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  MyDevInsights
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  AI-powered project discovery and analysis
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetStuck}
                disabled={isResetting}
                className="gap-2 hover:border-warning hover:bg-warning/10 transition-all"
                title="Reset stuck projects and clear analysis queues"
              >
                <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
                Reset Stuck
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScanDialog(true)}
                disabled={isScanning}
                className="gap-2 hover:border-primary hover:bg-primary/10 transition-all"
              >
                <FolderSearch className={`h-4 w-4 ${isScanning ? 'animate-pulse' : ''}`} />
                Scan Projects
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="gap-2 hover:border-accent hover:bg-accent/10 transition-all"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Search and Filters */}
          <SearchFilters
            onFilterChange={handleFilterChange}
            frameworks={frameworks}
            languages={languages}
          />

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data?.pagination?.total === 1
                ? '1 project found'
                : `${data?.pagination?.total ?? 0} projects found`}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && projects.length === 0 && (
            <ProjectGridSkeleton count={12} />
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="glass border-destructive/50 rounded-lg p-8 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <p className="text-lg font-medium text-destructive">Failed to load projects</p>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : 'Unknown error occurred'}
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => refetch()} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button onClick={() => window.location.reload()} variant="ghost">
                    Reload Page
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Inbox className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No projects found</p>
              <p className="text-sm">
                {projects.length === 0
                  ? 'Start discovering projects to see them here'
                  : 'Try adjusting your search filters'}
              </p>
            </div>
          )}

          {/* Project Grid */}
          {!isLoading && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProject}
                  onAnalyze={handleAnalyzeProject}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Project Detail Modal */}
      <ProjectDetailModal
        projectId={selectedProjectId}
        open={!!selectedProjectId}
        onOpenChange={(open) => !open && setSelectedProjectId(null)}
        onAnalyze={handleAnalyzeProject}
        onDelete={handleDeleteProject}
      />

      {/* Scan Projects Dialog */}
      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan for Projects</DialogTitle>
            <DialogDescription>
              This will scan the projects directory for new or updated projects.
              Existing projects will be updated with the latest information.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="reset-deleted"
              checked={resetDeleted}
              onCheckedChange={(checked: boolean) => setResetDeleted(checked === true)}
            />
            <Label
              htmlFor="reset-deleted"
              className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include previously deleted projects in scan
            </Label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowScanDialog(false)
                setResetDeleted(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleScanProjects} disabled={isScanning}>
              {isScanning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <FolderSearch className="h-4 w-4 mr-2" />
                  Start Scan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
