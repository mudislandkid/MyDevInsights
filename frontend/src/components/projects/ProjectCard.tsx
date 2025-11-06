import { useState } from 'react'
import type { Project } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate, formatProjectName } from '@/lib/utils'
import {
  RefreshCw,
  Code2,
  Calendar,
  FileCode,
  Layers,
  Target,
  Pencil,
  Trash2
} from 'lucide-react'

interface ProjectCardProps {
  project: Project
  onEdit?: (projectId: string) => void
  onDelete?: (projectId: string) => void
  onAnalyze?: (projectId: string) => void
  onViewDetails?: (projectId: string) => void
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onAnalyze,
  onViewDetails,
}: ProjectCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    if (onAnalyze) {
      setIsAnalyzing(true)
      try {
        await onAnalyze(project.id)
      } finally {
        setIsAnalyzing(false)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISCOVERED':
        return 'bg-blue-500/25 text-blue-200 border-blue-400/60 shadow-sm'
      case 'ANALYZING':
        return 'bg-yellow-500/25 text-yellow-200 border-yellow-400/60 animate-pulse shadow-sm'
      case 'ANALYZED':
        return 'bg-green-500/25 text-green-200 border-green-400/60 shadow-sm'
      case 'ERROR':
        return 'bg-red-500/25 text-red-200 border-red-400/60 shadow-sm'
      case 'ARCHIVED':
        return 'bg-gray-500/25 text-gray-300 border-gray-400/60 shadow-sm'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getFrameworkColor = (name?: string) => {
    if (!name) return 'text-muted-foreground'

    const lowerName = name.toLowerCase()

    // Framework colors
    if (lowerName.includes('next')) return 'text-white'
    if (lowerName.includes('react')) return 'text-cyan-400'
    if (lowerName.includes('vue')) return 'text-green-400'
    if (lowerName.includes('angular')) return 'text-red-400'
    if (lowerName.includes('svelte')) return 'text-orange-400'
    if (lowerName.includes('nuxt')) return 'text-green-300'

    // Language colors
    if (lowerName.includes('typescript')) return 'text-blue-400'
    if (lowerName.includes('javascript')) return 'text-yellow-300'
    if (lowerName.includes('python')) return 'text-blue-300'
    if (lowerName.includes('java')) return 'text-orange-300'
    if (lowerName.includes('go')) return 'text-cyan-300'
    if (lowerName.includes('rust')) return 'text-orange-400'
    if (lowerName.includes('php')) return 'text-purple-300'
    if (lowerName.includes('ruby')) return 'text-red-300'
    if (lowerName.includes('c#') || lowerName.includes('csharp')) return 'text-purple-400'

    // Backend frameworks
    if (lowerName.includes('node')) return 'text-green-400'
    if (lowerName.includes('express')) return 'text-gray-300'
    if (lowerName.includes('fastify')) return 'text-gray-200'
    if (lowerName.includes('django')) return 'text-green-500'
    if (lowerName.includes('flask')) return 'text-gray-100'
    if (lowerName.includes('laravel')) return 'text-red-400'

    return 'text-primary'
  }

  const getFrameworkIcon = (framework?: string) => {
    if (!framework) return <Code2 className="h-5 w-5 text-muted-foreground" />

    const colorClass = getFrameworkColor(framework)
    return <Code2 className={`h-5 w-5 ${colorClass}`} />
  }

  return (
    <div className="card-glow-border transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1">
      <Card
        className="glass cursor-pointer group h-full flex flex-col transition-all duration-300"
        onClick={() => onViewDetails?.(project.id)}
      >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getFrameworkIcon(project.primaryFramework)}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                {formatProjectName(project.name)}
              </CardTitle>
              <CardDescription className="text-xs truncate mt-1">
                {project.path}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className={`${getStatusColor(project.status)}`}
            >
              {project.status}
            </Badge>
            {project.estimatedValue && (
              <div className="text-right">
                <div className="text-xs font-semibold text-green-400">
                  £{project.estimatedValue.saasMonthly.min.toLocaleString()}-£{project.estimatedValue.saasMonthly.max.toLocaleString()}/mo
                </div>
                <div className="text-[10px] text-muted-foreground">
                  IP: £{(project.estimatedValue.ipSale.min / 1000).toFixed(0)}k-£{(project.estimatedValue.ipSale.max / 1000).toFixed(0)}k
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Tech Stack Info */}
        <div className="space-y-2">
          {project.primaryFramework && (
            <div className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className={`font-medium ${getFrameworkColor(project.primaryFramework)}`}>
                {project.primaryFramework}
              </span>
            </div>
          )}

          {project.primaryLanguage && (
            <div className="flex items-center gap-2 text-sm">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <span className={getFrameworkColor(project.primaryLanguage)}>
                {project.primaryLanguage}
                {project.languagePercentages &&
                  ` (${project.languagePercentages[project.primaryLanguage]?.toFixed(0)}%)`
                }
              </span>
            </div>
          )}

          {project.linesOfCode != null && (
            <div className="flex items-center gap-2 text-sm">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                {project.linesOfCode.toLocaleString()} lines
              </span>
            </div>
          )}

          {project.lastAnalyzedAt && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">
                Analyzed {formatDate(project.lastAnalyzedAt)}
              </span>
            </div>
          )}

          {/* Maturity & Completion */}
          {(project.maturityLevel || project.completionScore !== undefined || project.complexity) && (
            <div className="flex items-center gap-2 text-sm pt-1 border-t border-border/30">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap items-center gap-2">
                {project.maturityLevel && (
                  <Badge
                    className={`text-xs capitalize ${
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
                )}
                {project.complexity && (
                  <Badge
                    className={`text-xs capitalize ${
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
                )}
                {project.completionScore !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {project.completionScore}% complete
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs"
              >
                {tag.name}
              </Badge>
            ))}
            {project.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{project.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* AI Summary Preview */}
        {project.aiSummary && (
          <p className="text-sm text-muted-foreground line-clamp-2 italic">
            "{project.aiSummary.substring(0, 100)}..."
          </p>
        )}

        {/* Action Buttons */}
        <TooltipProvider>
          <div className="flex flex-wrap gap-2 pt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    handleAnalyze()
                  }}
                  disabled={isAnalyzing || project.status === 'ANALYZING'}
                  className="flex-1"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  Analyze
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Analyze with AI</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    onEdit?.(project.id)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Project</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    onDelete?.(project.id)
                  }}
                  className="hover:bg-destructive/10 hover:border-destructive/50"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Project</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
    </div>
  )
}
