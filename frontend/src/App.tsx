import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { wsClient } from './lib/websocket'
import { useProjectStore } from './stores/useProjectStore'
import { Dashboard } from './pages/Dashboard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useOnlineStatus } from './hooks/useOnlineStatus'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const { addProject, updateProject, removeProject } = useProjectStore()
  const isOnline = useOnlineStatus()

  // Show toast when going offline/online
  useEffect(() => {
    if (!isOnline) {
      toast.error('You are offline', {
        description: 'Some features may not work properly',
        duration: Infinity,
        id: 'offline-status',
      })
    } else {
      toast.dismiss('offline-status')
      toast.success('You are back online!', {
        duration: 3000,
      })
    }
  }, [isOnline])

  useEffect(() => {
    // Connect WebSocket
    wsClient.connect()

    // Listen to project events
    const unsubAdd = wsClient.on('project:added', (message) => {
      console.log('Project added:', message)

      toast.success('New project discovered!', {
        description: message.data?.name || 'A new project has been added',
      })
    })

    const unsubUpdate = wsClient.on('project:updated', (message) => {
      console.log('Project updated:', message)
      if (message.data) {
        updateProject(message.projectId, message.data)
      }

      toast.info('Project updated', {
        description: message.data?.name || 'Project has been updated',
      })
    })

    const unsubRemove = wsClient.on('project:removed', (message) => {
      console.log('Project removed:', message)
      removeProject(message.projectId)

      toast.warning('Project removed', {
        description: 'A project has been removed',
      })
    })

    // Listen to analysis events
    const unsubAnalysisStarted = wsClient.on('analysis:started', (message) => {
      console.log('Analysis started:', message)

      toast.loading('Analyzing project...', {
        id: `analysis-${message.projectId}`,
        description: message.data?.projectName || 'AI analysis in progress',
      })
    })

    const unsubAnalysisCompleted = wsClient.on('analysis:completed', (message) => {
      console.log('Analysis completed:', message)

      toast.success('Analysis complete!', {
        id: `analysis-${message.projectId}`,
        description: message.data?.summary?.substring(0, 100) || 'AI analysis finished',
      })
    })

    const unsubAnalysisFailed = wsClient.on('analysis:failed', (message) => {
      console.log('Analysis failed:', message)

      toast.error('Analysis failed', {
        id: `analysis-${message.projectId}`,
        description: message.data?.error || 'Failed to analyze project',
      })
    })

    return () => {
      unsubAdd()
      unsubUpdate()
      unsubRemove()
      unsubAnalysisStarted()
      unsubAnalysisCompleted()
      unsubAnalysisFailed()
      wsClient.disconnect()
    }
  }, [addProject, updateProject, removeProject])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Dashboard />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
