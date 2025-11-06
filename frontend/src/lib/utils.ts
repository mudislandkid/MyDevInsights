import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

// Common tech acronyms that should stay uppercase
const ACRONYMS = new Set([
  'ai',
  'api',
  'apis',
  'ip',
  'ipl',
  'ui',
  'ux',
  'pdf',
  'tts',
  'mcp',
  'osint',
  'vllm',
  'llm',
  'sql',
  'nosql',
  'html',
  'css',
  'json',
  'xml',
  'yaml',
  'yml',
  'http',
  'https',
  'ssh',
  'ftp',
  'smtp',
  'dns',
  'tcp',
  'udp',
  'url',
  'uri',
  'jwt',
  'oauth',
  'saml',
  'sso',
  'cli',
  'sdk',
  'ide',
])

// Words that should stay lowercase (articles, prepositions, conjunctions)
const LOWERCASE_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
])

/**
 * Format project name from kebab-case to Title Case
 * Handles special cases like acronyms and mixed case
 *
 * Examples:
 * - "secure-ip-register" → "Secure IP Register"
 * - "AI-DVOCATE" → "AI-DVOCATE" (preserves existing caps)
 * - "vLLM-Testing" → "vLLM Testing"
 * - "project-viewer" → "Project Viewer"
 * - "inflation-monitor" → "Inflation Monitor"
 */
export function formatProjectName(name: string): string {
  // If the name has mixed case already (not all lowercase), preserve it
  if (name !== name.toLowerCase() && name !== name.toUpperCase()) {
    // Just handle hyphens/spaces but preserve the case
    return name
      .split(/[-_\s]+/)
      .map(word => word.trim())
      .filter(word => word.length > 0)
      .join(' ')
  }

  // Split on hyphens, underscores, and spaces
  const words = name.split(/[-_\s]+/).filter(word => word.length > 0)

  // Format each word
  const formatted = words.map((word, index) => {
    const lowerWord = word.toLowerCase()

    // Keep acronyms uppercase
    if (ACRONYMS.has(lowerWord)) {
      return lowerWord.toUpperCase()
    }

    // Keep small words lowercase (except first word)
    if (index > 0 && LOWERCASE_WORDS.has(lowerWord)) {
      return lowerWord
    }

    // Capitalize first letter
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  })

  return formatted.join(' ')
}
