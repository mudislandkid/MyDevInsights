import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  RefreshCw,
  Layers,
  FileCode,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Target,
  DollarSign,
  ListTodo,
  Code2,
  Trash2,
} from 'lucide-react'
import { formatDate, formatBytes, formatProjectName } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProjectDetailModalProps {
  projectId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAnalyze?: (projectId: string) => void
  onDelete?: (projectId: string) => void
}

export function ProjectDetailModal({
  projectId,
  open,
  onOpenChange,
  onAnalyze,
  onDelete,
}: ProjectDetailModalProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.fetchProject(projectId!),
    enabled: !!projectId && open,
  })

  const project = data?.data

  if (!open || !projectId) return null

  const getFrameworkColor = (name?: string) => {
    if (!name) return ''

    const lowerName = name.toLowerCase()

    // Framework colors
    if (lowerName.includes('next')) return 'bg-white/10 text-white border-white/30'
    if (lowerName.includes('react')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
    if (lowerName.includes('vue')) return 'bg-green-500/10 text-green-400 border-green-500/30'
    if (lowerName.includes('angular')) return 'bg-red-500/10 text-red-400 border-red-500/30'
    if (lowerName.includes('svelte')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
    if (lowerName.includes('nuxt')) return 'bg-green-400/10 text-green-300 border-green-400/30'

    // Language colors
    if (lowerName.includes('typescript')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    if (lowerName.includes('javascript')) return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30'
    if (lowerName.includes('python')) return 'bg-blue-400/10 text-blue-300 border-blue-400/30'
    if (lowerName.includes('java')) return 'bg-orange-400/10 text-orange-300 border-orange-400/30'
    if (lowerName.includes('go')) return 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30'
    if (lowerName.includes('rust')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
    if (lowerName.includes('php')) return 'bg-purple-400/10 text-purple-300 border-purple-400/30'
    if (lowerName.includes('ruby')) return 'bg-red-400/10 text-red-300 border-red-400/30'
    if (lowerName.includes('c#') || lowerName.includes('csharp')) return 'bg-purple-500/10 text-purple-400 border-purple-500/30'

    // Backend frameworks
    if (lowerName.includes('node')) return 'bg-green-500/10 text-green-400 border-green-500/30'
    if (lowerName.includes('express')) return 'bg-gray-500/10 text-gray-300 border-gray-500/30'
    if (lowerName.includes('fastify')) return 'bg-gray-400/10 text-gray-200 border-gray-400/30'
    if (lowerName.includes('django')) return 'bg-green-600/10 text-green-500 border-green-600/30'
    if (lowerName.includes('flask')) return 'bg-gray-300/10 text-gray-100 border-gray-300/30'
    if (lowerName.includes('laravel')) return 'bg-red-500/10 text-red-400 border-red-500/30'

    return ''
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ANALYZED':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'ANALYZING':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />
      case 'ERROR':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto glass border-border">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl mb-2">
                {isLoading ? 'Loading...' : error ? 'Error Loading Project' : formatProjectName(project?.name || 'Project Details')}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-sm">
                {isLoading ? (
                  'Loading project information...'
                ) : error ? (
                  'Failed to load project details'
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    {project?.path}
                  </>
                )}
              </DialogDescription>
            </div>
            {project && (
              <div className="flex items-center gap-2">
                {getStatusIcon(project.status)}
                <Badge variant="outline" className="text-sm">
                  {project.status}
                </Badge>
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12 text-destructive">
            <AlertCircle className="h-6 w-6 mr-2" />
            Failed to load project details
          </div>
        )}

        {project && (
          <>

            <div className="space-y-6 mt-4">
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => onAnalyze?.(project.id)}
                  className="gap-2 flex-1"
                  disabled={project.status === 'ANALYZING'}
                >
                  <RefreshCw className="h-4 w-4" />
                  Re-analyze
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onDelete?.(project.id)
                    onOpenChange(false)
                  }}
                  className="gap-2 hover:bg-destructive/10 hover:border-destructive/50"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                  Delete
                </Button>
              </div>

              {/* AI Summary */}
              {project.aiSummary && (
                <Card className="glass border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">AI Analysis Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed">{project.aiSummary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Maturity & Value Assessment */}
              {(project.completionScore !== undefined || project.maturityLevel || project.estimatedValue) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Completion & Maturity */}
                  {(project.completionScore !== undefined || project.maturityLevel) && (
                    <Card className="glass border-border/50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Project Maturity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {project.completionScore !== undefined && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Completion Score</span>
                              <span className="font-medium">{project.completionScore}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${project.completionScore}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {project.maturityLevel && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Maturity Level:</span>
                            <Badge
                              className={`capitalize ${
                                project.maturityLevel === 'enterprise'
                                  ? 'bg-green-500/20 text-green-300 border-green-500/50'
                                  : project.maturityLevel === 'production-ready'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                                  : project.maturityLevel === 'mvp'
                                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                                  : 'bg-red-500/20 text-red-300 border-red-500/50'
                              }`}
                            >
                              {project.maturityLevel.replace('-', ' ')}
                            </Badge>
                          </div>
                        )}
                        {project.complexity && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Complexity:</span>
                            <Badge
                              className={`capitalize ${
                                project.complexity === 'simple'
                                  ? 'bg-green-500/20 text-green-300 border-green-500/50'
                                  : project.complexity === 'moderate'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                                  : project.complexity === 'complex'
                                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
                                  : 'bg-red-500/20 text-red-300 border-red-500/50'
                              }`}
                            >
                              {project.complexity.replace('-', ' ')}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Estimated Value */}
                  {project.estimatedValue && (
                    <Card className="glass border-border/50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Estimated Value (GBP)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {project.estimatedValue.saasMonthly && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">SaaS Monthly</span>
                              <Badge variant="outline" className="text-xs">
                                {project.estimatedValue.saasMonthly.confidence}
                              </Badge>
                            </div>
                            <p className="font-medium">
                              £{project.estimatedValue.saasMonthly.min.toLocaleString()} -
                              £{project.estimatedValue.saasMonthly.max.toLocaleString()}/mo
                            </p>
                          </div>
                        )}
                        {project.estimatedValue.ipSale && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">IP Sale</span>
                              <Badge variant="outline" className="text-xs">
                                {project.estimatedValue.ipSale.confidence}
                              </Badge>
                            </div>
                            <p className="font-medium">
                              £{project.estimatedValue.ipSale.min.toLocaleString()} -
                              £{project.estimatedValue.ipSale.max.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {project.estimatedValue.reasoning && (
                          <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t">
                            {project.estimatedValue.reasoning}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Production Gaps */}
              {project.productionGaps && project.productionGaps.length > 0 && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />
                      Production Readiness Gaps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {project.productionGaps.map((gap, idx) => (
                        <li key={idx} className="flex gap-2 text-sm">
                          <span className="text-destructive">•</span>
                          <span className="text-foreground">{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Tech Stack Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Framework & Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {project.primaryFramework && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Primary Framework:</span>
                        <Badge className={getFrameworkColor(project.primaryFramework)}>
                          {project.primaryFramework}
                        </Badge>
                      </div>
                    )}
                    {project.frameworks && project.frameworks.length > 0 && (
                      <div>
                        <span className="text-muted-foreground text-sm">All Frameworks:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {project.frameworks.map((fw) => (
                            <Badge key={fw} className={`text-xs ${getFrameworkColor(fw)}`}>
                              {fw}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {project.packageManager && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Package Manager:</span>
                        <Badge variant="outline">{project.packageManager}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileCode className="h-4 w-4" />
                      Languages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {project.primaryLanguage && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Primary Language:</span>
                        <Badge className={getFrameworkColor(project.primaryLanguage)}>
                          {project.primaryLanguage}
                        </Badge>
                      </div>
                    )}
                    {project.languagePercentages && (
                      <div className="space-y-1 mt-2">
                        {Object.entries(project.languagePercentages)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([lang, pct]) => (
                            <div key={lang} className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground flex-1">{lang}</span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {(pct as number).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Project Metadata */}
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Project Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.fileCount !== undefined && (
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Files:</span>{' '}
                        <span className="font-medium">{project.fileCount.toLocaleString()}</span>
                      </span>
                    </div>
                  )}
                  {project.linesOfCode != null && (
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Lines of Code:</span>{' '}
                        <span className="font-medium">{project.linesOfCode.toLocaleString()}</span>
                      </span>
                    </div>
                  )}
                  {project.totalSize !== undefined && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Size:</span>{' '}
                        <span className="font-medium">{formatBytes(project.totalSize)}</span>
                      </span>
                    </div>
                  )}
                  {project.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Discovered:</span>{' '}
                        <span className="font-medium">{formatDate(project.createdAt)}</span>
                      </span>
                    </div>
                  )}
                  {project.lastAnalyzedAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">Last Analyzed:</span>{' '}
                        <span className="font-medium">{formatDate(project.lastAnalyzedAt)}</span>
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {project.recommendations && project.recommendations.length > 0 && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {project.recommendations.map((rec, idx) => (
                        <li key={`${rec.title}-${idx}`} className="flex gap-2 text-sm">
                          <span className="text-primary">•</span>
                          <div>
                            <p className="font-medium">{rec.title}</p>
                            {rec.description && (
                              <p className="text-muted-foreground text-xs mt-0.5">
                                {rec.description}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
