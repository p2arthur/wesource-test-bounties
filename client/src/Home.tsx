import React, { useEffect, useMemo, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import AppCalls from './components/AppCalls'
import BountyCard from './components/BountyCard'
import LoadingPair from './components/LoadingPair'
import ProjectCard from './components/ProjectCard'
import SubmitProjectForm from './components/SubmitProjectForm'
import Transact from './components/Transact'
import WonBountiesSidebar from './components/WonBountiesSidebar'
import { Button } from './components/ui/button'
import { useProjects } from './contexts/ProjectContext'
import { useUnifiedWallet } from './hooks/useUnifiedWallet'
import { Bounty, ProjectCategory } from './interfaces/entities'
import { listBounties } from './services/api'

type Tab = 'projects' | 'bounties'

const categoryFilters: ProjectCategory[] = ['DeFi', 'DAO', 'NFT']

const Home: React.FC = () => {
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState<boolean>(false)
  const [openSubmitProjectModal, setOpenSubmitProjectModal] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<Tab>('projects')
  const [category, setCategory] = useState<ProjectCategory | 'ALL'>('ALL')
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [bountiesLoading, setBountiesLoading] = useState(false)
  const [bountiesError, setBountiesError] = useState<string | null>(null)

  const { projects, loading, error } = useProjects()
  const { isConnected } = useUnifiedWallet()

  useEffect(() => {
    let isActive = true
    const loadBounties = async () => {
      setBountiesLoading(true)
      setBountiesError(null)
      try {
        const data = await listBounties()
        if (isActive) {
          setBounties(data)
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
  }, [])

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
        if (category === 'ALL') return true
        const key = `${bounty.repoOwner.toLowerCase()}/${bounty.repoName.toLowerCase()}`
        return projectRepoMap.get(key)?.category === category
      })
  }, [bounties, category, projectRepoMap])

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
            <div className="flex gap-4 items-center justify-between rounded-lg border border-border-default bg-bg-surface h-16 px-4">
              <div className="flex gap-1">
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

              <div className="flex gap-2 items-center flex-wrap">
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
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
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
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredBounties.map((bounty) => (
                        <BountyCard key={bounty.id} bounty={bounty} />
                      ))}
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
