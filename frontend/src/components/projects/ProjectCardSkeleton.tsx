import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function ProjectCardSkeleton() {
  return (
    <Card className="glass border-border/50 animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="h-5 w-5 bg-muted rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          </div>
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Tech Stack Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-24" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-32" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-3 bg-muted rounded w-28" />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          <div className="h-5 w-16 bg-muted rounded-full" />
          <div className="h-5 w-20 bg-muted rounded-full" />
          <div className="h-5 w-12 bg-muted rounded-full" />
        </div>

        {/* Summary */}
        <div className="space-y-1">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-4/5" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <div className="h-8 flex-1 min-w-[100px] bg-primary/20 rounded" />
          <div className="h-8 w-10 bg-muted rounded" />
          <div className="h-8 w-10 bg-muted rounded" />
          <div className="h-8 w-10 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ProjectGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  )
}
