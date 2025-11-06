import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface FilterState {
  search: string
  framework?: string
  language?: string
  status?: string
}

interface SearchFiltersProps {
  onFilterChange: (filters: FilterState) => void
  frameworks?: string[]
  languages?: string[]
}

export function SearchFilters({
  onFilterChange,
  frameworks = [],
  languages = [],
}: SearchFiltersProps) {
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    framework: undefined,
    language: undefined,
    status: undefined,
  })

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }))
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: string | undefined) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setFilters({
      search: '',
      framework: undefined,
      language: undefined,
      status: undefined,
    })
  }, [])

  const hasActiveFilters =
    filters.search ||
    filters.framework ||
    filters.language ||
    filters.status

  const removeFilter = (key: keyof FilterState) => {
    if (key === 'search') {
      setSearchInput('')
    }
    handleFilterChange(key, undefined)
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search projects by name or path..."
          value={searchInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
          className="pl-10 pr-10 glass border-border/50 focus:border-primary/50 transition-colors"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status || 'all'}
          onValueChange={(value: string) =>
            handleFilterChange('status', value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="w-[160px] glass border-border/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DISCOVERED">Discovered</SelectItem>
            <SelectItem value="ANALYZING">Analyzing</SelectItem>
            <SelectItem value="ANALYZED">Analyzed</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>

        {frameworks.length > 0 && (
          <Select
            value={filters.framework || 'all'}
            onValueChange={(value: string) =>
              handleFilterChange('framework', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[160px] glass border-border/50">
              <SelectValue placeholder="Framework" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frameworks</SelectItem>
              {frameworks.map((fw) => (
                <SelectItem key={fw} value={fw}>
                  {fw}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {languages.length > 0 && (
          <Select
            value={filters.language || 'all'}
            onValueChange={(value: string) =>
              handleFilterChange('language', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[160px] glass border-border/50">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => removeFilter('search')}
            >
              Search: {filters.search}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.framework && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => removeFilter('framework')}
            >
              Framework: {filters.framework}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.language && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => removeFilter('language')}
            >
              Language: {filters.language}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.status && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => removeFilter('status')}
            >
              Status: {filters.status}
              <X className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
