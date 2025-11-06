import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  AlertCircle,
  Activity,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'all'

interface QueueJob {
  id: string
  name: string
  data: {
    projectId: string
    projectPath: string
    projectName: string
  }
  state: string
  progress: number
  timestamp: number
  processedOn?: number
  finishedOn?: number
  failedReason?: string
  attemptsMade: number
}

export function Queue() {
  const [statusFilter, setStatusFilter] = useState<JobStatus>('all')
  const [isPausing, setIsPausing] = useState(false)
  const [isResuming, setIsResuming] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<string | null>(null)

  // Fetch queue stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['queue-stats'],
    queryFn: () => apiClient.getQueueStats(),
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  // Fetch queue jobs
  const { data: jobsData, refetch: refetchJobs, isLoading } = useQuery({
    queryKey: ['queue-jobs', statusFilter],
    queryFn: () => apiClient.getQueueJobs({
      status: statusFilter === 'all' ? undefined : statusFilter,
      page: 1,
      limit: 100,
    }),
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  const stats = statsData?.data
  const jobs = jobsData?.data || []

  const handlePause = useCallback(async () => {
    setIsPausing(true)
    try {
      await apiClient.pauseQueue()
      toast.success('Queue paused')
      refetchStats()
    } catch (error) {
      toast.error('Failed to pause queue', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsPausing(false)
    }
  }, [refetchStats])

  const handleResume = useCallback(async () => {
    setIsResuming(true)
    try {
      await apiClient.resumeQueue()
      toast.success('Queue resumed')
      refetchStats()
    } catch (error) {
      toast.error('Failed to resume queue', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsResuming(false)
    }
  }, [refetchStats])

  const handleClear = useCallback(async () => {
    setIsClearing(true)
    try {
      const result = await apiClient.clearQueue()
      toast.success('Queue cleared', {
        description: `Cleared ${result.cleared} jobs (${result.completedCleared} completed, ${result.failedCleared} failed)`
      })
      refetchStats()
      refetchJobs()
    } catch (error) {
      toast.error('Failed to clear queue', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setIsClearing(false)
    }
  }, [refetchStats, refetchJobs])

  const handleDeleteJob = useCallback(async (jobId: string) => {
    try {
      await apiClient.deleteQueueJob(jobId)
      toast.success('Job deleted')
      setJobToDelete(null)
      refetchStats()
      refetchJobs()
    } catch (error) {
      toast.error('Failed to delete job', {
        description: error instanceof Error ? error.message : 'An error occurred'
      })
    }
  }, [refetchStats, refetchJobs])

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'active':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'delayed':
        return <Clock className="h-4 w-4 text-warning" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStateBadge = (state: string) => {
    const colors: Record<string, string> = {
      waiting: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      active: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      completed: 'bg-green-500/10 text-green-500 border-green-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
      delayed: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    }

    return (
      <Badge variant="outline" className={colors[state] || ''}>
        {state}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (start: number, end?: number) => {
    if (!end) return 'N/A'
    const duration = end - start
    if (duration < 1000) return `${duration}ms`
    return `${(duration / 1000).toFixed(1)}s`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="glass border-b border-border">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Queue Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Monitor and manage analysis job queue
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                disabled={isPausing || !stats?.healthy}
                className="gap-2 hover:border-warning hover:bg-warning/10 transition-all"
              >
                <Pause className={`h-4 w-4 ${isPausing ? 'animate-pulse' : ''}`} />
                Pause Queue
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResume}
                disabled={isResuming || !stats?.healthy}
                className="gap-2 hover:border-primary hover:bg-primary/10 transition-all"
              >
                <Play className={`h-4 w-4 ${isResuming ? 'animate-pulse' : ''}`} />
                Resume Queue
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={isClearing}
                className="gap-2 hover:border-destructive hover:bg-destructive/10 transition-all"
              >
                <Trash2 className={`h-4 w-4 ${isClearing ? 'animate-pulse' : ''}`} />
                Clear Old Jobs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchStats()
                  refetchJobs()
                }}
                className="gap-2 hover:border-accent hover:bg-accent/10 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="glass border-border">
              <CardHeader className="pb-3">
                <CardDescription>Waiting</CardDescription>
                <CardTitle className="text-3xl">{stats?.waiting || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Queued
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border">
              <CardHeader className="pb-3">
                <CardDescription>Active</CardDescription>
                <CardTitle className="text-3xl text-primary">{stats?.active || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4 text-primary animate-pulse" />
                  Processing
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border">
              <CardHeader className="pb-3">
                <CardDescription>Completed</CardDescription>
                <CardTitle className="text-3xl text-green-500">{stats?.completed || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Successful
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border">
              <CardHeader className="pb-3">
                <CardDescription>Failed</CardDescription>
                <CardTitle className="text-3xl text-destructive">{stats?.failed || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Errors
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border">
              <CardHeader className="pb-3">
                <CardDescription>Status</CardDescription>
                <CardTitle className="text-3xl">
                  {stats?.healthy ? (
                    <span className="text-green-500">OK</span>
                  ) : (
                    <span className="text-destructive">Down</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {stats?.healthy ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  {stats?.healthy ? 'Healthy' : 'Unhealthy'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Jobs Table */}
          <Card className="glass border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Analysis Jobs</CardTitle>
                  <CardDescription>View and manage analysis jobs in the queue</CardDescription>
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as JobStatus)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && jobs.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Activity className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No jobs found</p>
                  <p className="text-sm">
                    {statusFilter === 'all'
                      ? 'The queue is empty'
                      : `No ${statusFilter} jobs`}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job: QueueJob) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStateIcon(job.state)}
                              {getStateBadge(job.state)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {job.data.projectName}
                            {job.failedReason && (
                              <p className="text-xs text-destructive mt-1">
                                Error: {job.failedReason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {job.id}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatTimestamp(job.timestamp)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {job.state === 'active' && job.processedOn
                              ? `${formatDuration(job.processedOn, Date.now())} (running)`
                              : job.finishedOn
                              ? formatDuration(job.processedOn || job.timestamp, job.finishedOn)
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setJobToDelete(job.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Delete Job Dialog */}
      <AlertDialog open={!!jobToDelete} onOpenChange={() => setJobToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this job? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => jobToDelete && handleDeleteJob(jobToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
