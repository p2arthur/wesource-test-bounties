import React, { useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiPlus, FiSearch } from 'react-icons/fi'
import { useSearchParams } from 'react-router-dom'
import AppCalls from './components/AppCalls'
import BountyCard from './components/BountyCard'
import LoadingPair from './components/LoadingPair'
import ProjectCard from './components/ProjectCard'
import SubmitProjectForm from './components/SubmitProjectForm'
import Transact from './components/Transact'
import WonBountiesSidebar from './components/WonBountiesSidebar'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { useProjects } from './contexts/ProjectContext'
import { useUnifiedWallet } from './hooks/useUnifiedWallet'
import { Bounty, ProjectCategory } from './interfaces/entities'
import { listBountiesPaginated, fetchProjectsPaginated, PaginatedResponse } from './services/api'

type Tab = 'projects' | 'bounties'
type BountyStatus = 'OPEN' | 'READY_FOR_CLAIM' | 'CLAIMED' | 'REFUNDABLE' | 'ALL'

const categoryFilters: ProjectCategory[] = ['DeFi', 'DAO', 'NFT']
const bountyStatusFilters: BountyStatus[] = ['OPEN', 'READY_FOR_CLAIM', 'CLAIMED', 'REFUNDABLE', 'ALL']

const Home: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState<boolean>(false)
  const [openSubmitProjectModal, setOpenSubmitProjectModal] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<Tab>('projects')
  const [category, setCategory] = useState<ProjectCategory | 'ALL'>('ALL')
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [bountiesLoading, setBountiesLoading] = useState(false)
  const [bountiesError, setBountiesError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [bountyStatus, setBountyStatus] = useState<BountyStatus>(
    (searchParams.get('status') as BountyStatus) || 'ALL'
  )
  const [bountiesPage, setBountiesPage] = useState(parseInt(searchParams.get('bounty_page') || '1'))
  const [bountiesTotalPages, setBountiesTotalPages] = useState(1)
  const [projectsPage, setProjectsPage] = useState(parseInt(searchParams.get('project_page') || '1'))

  const { projects, loading, error, totalPages: projectsTotalPagesContext, refreshProjects } = useProjects()
  const { isConnected } = useUnifiedWallet()

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams)
      if (searchInput) {
        newParams.set('search', searchInput)
      } else {
        newParams.delete('search')
      }
      setSearchParams(newParams)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, searchParams, setSearchParams])

  // Update status filter in URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams)
    if (bountyStatus !== 'ALL') {
      newParams.set('status', bountyStatus)
    } else {
      newParams.delete('status')
    }
    setSearchParams(newParams)
  }, [bountyStatus, searchParams, setSearchParams])

  // Load projects when page changes
  useEffect(() => {
    refreshProjects(projectsPage)
  }, [projectsPage, refreshProjects])

  // Sync bounties pagination with URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams)
    if (bountiesPage > 1) {
      newParams.set('bounty_page', bountiesPage.toString())
    } else {
      newParams.delete('bounty_page')
    }
    setSearchParams(newParams)
  }, [bountiesPage, searchParams, setSearchParams])

  // Sync projects pagination with URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams)
    if (projectsPage > 1) {
      newParams.set('project_page', projectsPage.toString())
    } else {
      newParams.delete('project_page')
    }
    setSearchParams(newParams)
  }, [projectsPage, searchParams, setSearchParams])

  useEffect(() => {
    let isActive = true
    const loadBounties = async () => {
      setBountiesLoading(true)
      setBountiesError(null)
      try {
        const data = await listBountiesPaginated(bountiesPage, 20)
        if (isActive) {
          setBounties(data.data)
          setBountiesTotalPages(data.totalPages)
        }
      } catch (err) {
        if (isActive) {
          setBountiesError(err instanceof Error ? err.message : 'Failed to fetch bounties')
        }
      } finally {
        if (isActive) {
          setBountiesLoading(false)
        }
      }
    }
    loadBounties()
    return () => {
      isActive = false
    }
  }, [bountiesPage])

  const parseGithubRepoInfo = (repoUrl: string) => {
    try {
      const url = new URL(repoUrl)
      const [owner, rawName] = url.pathname.replace(/^\/+/, '').split('/')
      const name = rawName?.replace(/\.git$/, '')
      if (!owner || !name) return null
      return { owner, name }
    } catch {
      return null
    }
  }

  const projectRepoMap = useMemo(() => {
    const map = new Map<string, { name: string; category?: ProjectCategory }>()
    projects.forEach((project) => {
      project.repositories?.forEach((repo) => {
        const info = parseGithubRepoInfo(repo.githubUrl)
        if (!info) return
        const key = `${info.owner.toLowerCase()}/${info.name.toLowerCase()}`
        map.set(key, { name: project.name, category: project.category })
      })
    })
    return map
  }, [projects])

  const filteredProjects = useMemo(() => {
    if (category === 'ALL') return projects
    return projects.filter((p) => p.category === category)
  }, [category, projects])

  const filteredBounties: Bounty[] = useMemo(() => {
    return bounties
      .map((bounty) => {
        const key = `${bounty.repoOwner.toLowerCase()}/${bounty.repoName.toLowerCase()}`
        const projectInfo = projectRepoMap.get(key)
        return projectInfo ? { ...bounty, projectName: projectInfo.name } : bounty
      })
      .filter((bounty) => {
        // Filter by category
        if (category !== 'ALL') {
          const key = `${bounty.repoOwner.toLowerCase()}/${bounty.repoName.toLowerCase()}`
          const projectInfo = projectRepoMap.get(key)
          if (projectInfo?.category !== category) return false
        }

        // Filter by status
        if (bountyStatus !== 'ALL' && bounty.status !== bountyStatus) return false

        // Filter by search term (repo name, issue number, or repo owner)
        if (searchInput.trim()) {
          const searchLower = searchInput.toLowerCase()
          return (
            bounty.repoName.toLowerCase().includes(searchLower) ||
            bounty.repoOwner.toLowerCase().includes(searchLower) ||
            bounty.issueNumber.toString().includes(searchLower)
          )
        }

        return true
      })
  }, [bounties, category, projectRepoMap, bountyStatus, searchInput])

  return (
    <div className="min-h-screen">
      <div className="mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="rounded-lg border border-border-default bg-bg-surface p-6 mb-6">
          <h2 className="text-3xl font-bold text-text-primary">Open Source, Incentivized.</h2>
          <p className="text-sm text-text-secondary mt-2">
            Bridge the gap between critical code and fair rewards with decentralized bounties that power software sustainability.
          </p>
        </div>

        {/* Main Layout with Sidebar */}
        <div className={`flex gap-6 ${isConnected ? 'flex-col lg:flex-row' : ''}`}>
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Tabs + Filter Bar */}
            <div className="rounded-lg border border-border-default bg-bg-surface p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex gap-1 flex-shrink-0">
                {(['projects', 'bounties'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      tab === activeTab
                        ? 'bg-bg-hover text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {activeTab === 'projects' ? (
                <div className="flex gap-2 items-center flex-wrap flex-1">
                  <span className="text-sm text-text-muted">Filter:</span>
                  <button
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      category === 'ALL'
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border-default text-text-secondary hover:border-accent/50 hover:text-text-primary'
                    }`}
                    onClick={() => setCategory('ALL')}
                  >
                    All
                  </button>
                  {categoryFilters.map((cat) => (
                    <button
                      key={cat}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        category === cat
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-border-default text-text-secondary hover:border-accent/50 hover:text-text-primary'
                      }`}
                      onClick={() => setCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                  <Button size="sm" className="ml-2 gap-1" onClick={() => setOpenSubmitProjectModal(true)}>
                    <FiPlus className="w-4 h-4" />
                    Submit Project
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3 items-center flex-wrap flex-1">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <Input
                        placeholder="Search repo, owner, or issue..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-text-muted">Status:</span>
                    <select
                      value={bountyStatus}
                      onChange={(e) => setBountyStatus(e.target.value as BountyStatus)}
                      className="px-3 py-1.5 text-xs rounded-md border border-border-default bg-bg-elevated text-text-primary focus:outline-none focus:border-accent"
                    >
                      {bountyStatusFilters.map((status) => (
                        <option key={status} value={status}>
                          {status === 'ALL' ? 'All Statuses' : status.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-6">
              {loading ? (
                <div className="rounded-lg border border-border-default bg-bg-surface p-8 text-center">
                  <LoadingPair size="lg" label="Loading projects..." />
                </div>
              ) : error ? (
                <div className="rounded-lg border border-border-default bg-bg-surface p-8 text-center space-y-4">
                  <div className="text-danger">{error}</div>
                  <p className="text-text-secondary text-sm">
                    Make sure the API server is running at {import.meta.env.VITE_API_URL || 'http://localhost:3000'}
                  </p>
                </div>
              ) : activeTab === 'projects' ? (
                filteredProjects.length > 0 ? (
                  <div className="space-y-5">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                      {filteredProjects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                      ))}
                    </div>
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProjectsPage(Math.max(1, projectsPage - 1))}
                        disabled={projectsPage === 1}
                        className="gap-1"
                      >
                        <FiChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-text-secondary">
                        Page {projectsPage} of {projectsTotalPagesContext}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProjectsPage(Math.min(projectsTotalPagesContext, projectsPage + 1))}
                        disabled={projectsPage >= projectsTotalPagesContext}
                        className="gap-1"
                      >
                        Next
                        <FiChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border-default bg-bg-surface p-8 text-center space-y-2">
                    <div className="text-text-primary font-medium">No projects yet</div>
                    <p className="text-text-secondary text-sm">Submit your first project using the button above!</p>
                  </div>
                )
              ) : (
                <>
                  {bountiesLoading ? (
                    <div className="rounded-lg border border-border-default bg-bg-surface p-8 text-center">
                      <LoadingPair size="lg" label="Loading bounties..." />
                    </div>
                  ) : bountiesError ? (
                    <div className="rounded-lg border border-border-default bg-bg-surface p-8 text-center space-y-4">
                      <div className="text-danger">{bountiesError}</div>
                      <p className="text-text-secondary text-sm">
                        Make sure the API server is running at {import.meta.env.VITE_API_URL || 'http://localhost:3000'}
                      </p>
                    </div>
                  ) : filteredBounties.length > 0 ? (
                    <div className="space-y-5">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                        {filteredBounties.map((bounty) => (
                          <BountyCard key={bounty.id} bounty={bounty} />
                        ))}
                      </div>
                      {/* Pagination Controls */}
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBountiesPage(Math.max(1, bountiesPage - 1))}
                          disabled={bountiesPage === 1}
                          className="gap-1"
                        >
                          <FiChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <span className="text-sm text-text-secondary">
                          Page {bountiesPage} of {bountiesTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBountiesPage(Math.min(bountiesTotalPages, bountiesPage + 1))}
                          disabled={bountiesPage >= bountiesTotalPages}
                          className="gap-1"
                        >
                          Next
                          <FiChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border-default bg-bg-surface p-8 text-center space-y-2">
                      <div className="text-text-primary font-medium">No bounties yet</div>
                      <p className="text-text-secondary text-sm">Create a bounty on a project issue to get started.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Won Bounties Sidebar */}
          {isConnected && (
            <div className="w-full lg:w-80 lg:flex-shrink-0">
              <div className="lg:sticky lg:top-4">
                <WonBountiesSidebar />
              </div>
            </div>
          )}
        </div>
      </div>

      <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
      <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
      <SubmitProjectForm openModal={openSubmitProjectModal} closeModal={() => setOpenSubmitProjectModal(false)} />
    </div>
  )
}

export default Home
