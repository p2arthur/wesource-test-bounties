import React, { useEffect, useMemo, useState } from 'react'
import AppCalls from './components/AppCalls'
import BountyCard from './components/BountyCard'
import LoadingPair from './components/LoadingPair'
import ProjectCard from './components/ProjectCard'
import SubmitProjectForm from './components/SubmitProjectForm'
import Transact from './components/Transact'
import WonBountiesSidebar from './components/WonBountiesSidebar'
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
        <div className="card p-6 mb-6">
          <h2 className="text-3xl font-bold text-black">Open Source, Incentivized.</h2>
          <p className="text-sm text-muted mt-2">
            Bridge the gap between critical code and fair rewards with decentralized bounties that power software sustainability.
          </p>
        </div>

        {/* Main Layout with Sidebar */}
        <div className={`flex gap-6 ${isConnected ? 'flex-col lg:flex-row' : ''}`}>
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <div className="flex gap-4 items-center justify-between glass h-16 p-4">
          <div className="flex gap-2">
            {(['projects', 'bounties'] as Tab[]).map((tab) => (
              <button
                key={tab}
                className={`btn-secondary px-4 py-2 text-sm ${tab === activeTab ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm font-medium text-black">Filter:</span>
            <button
              className={`btn-secondary px-3 py-2 text-sm ${category === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setCategory('ALL')}
            >
              All
            </button>
            {categoryFilters.map((cat) => (
              <button
                key={cat}
                className={`btn-secondary px-3 py-2 text-sm ${category === cat ? 'is-active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
            <button className="btn-primary flex items-center gap-2 ml-auto" onClick={() => setOpenSubmitProjectModal(true)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Submit Project
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="card p-8 text-center">
              <LoadingPair size="lg" label="Loading projects..." />
            </div>
          ) : error ? (
            <div className="card p-8 text-center space-y-4">
              <div className="text-red-600">{error}</div>
              <p className="text-muted text-sm">
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
              <div className="card p-8 text-center space-y-2">
                <div className="text-black font-medium">No projects yet</div>
                <p className="text-muted text-sm">Submit your first project using the button above!</p>
              </div>
            )
          ) : (
            <>
              {bountiesLoading ? (
                <div className="card p-8 text-center">
                  <LoadingPair size="lg" label="Loading bounties..." />
                </div>
              ) : bountiesError ? (
                <div className="card p-8 text-center space-y-4">
                  <div className="text-red-600">{bountiesError}</div>
                  <p className="text-muted text-sm">
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
                <div className="card p-8 text-center space-y-2">
                  <div className="text-black font-medium">No bounties yet</div>
                  <p className="text-muted text-sm">Create a bounty on a project issue to get started.</p>
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
