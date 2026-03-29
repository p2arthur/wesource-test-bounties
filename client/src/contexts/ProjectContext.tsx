import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { createProject, CreateProjectPayload, deleteProject, fetchProjectById, fetchProjects, fetchProjectsPaginated, Project, PaginatedResponse } from '../services/api'

interface ProjectContextType {
  projects: Project[]
  loading: boolean
  error: string | null
  totalPages: number
  currentPage: number
  // Actions
  refreshProjects: (page?: number) => Promise<void>
  getProjectById: (id: number) => Promise<Project | null>
  addProject: (payload: CreateProjectPayload) => Promise<Project>
  removeProject: (id: number) => Promise<void>
  clearError: () => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

interface ProjectProviderProps {
  children: ReactNode
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  const refreshProjects = useCallback(async (page: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetchProjectsPaginated(page, 20)
      setProjects(response.data)
      setTotalPages(response.totalPages)
      setCurrentPage(response.page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }, [])

  const getProjectById = useCallback(async (id: number): Promise<Project | null> => {
    try {
      const project = await fetchProjectById(id)
      return project
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project')
      return null
    }
  }, [])

  const addProject = useCallback(async (payload: CreateProjectPayload): Promise<Project> => {
    const newProject = await createProject(payload)
    setProjects((prev) => [...prev, newProject])
    return newProject
  }, [])

  const removeProject = useCallback(async (id: number) => {
    await deleteProject(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  const value: ProjectContextType = {
    projects,
    loading,
    error,
    totalPages,
    currentPage,
    refreshProjects,
    getProjectById,
    addProject,
    removeProject,
    clearError,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjects() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider')
  }
  return context
}
