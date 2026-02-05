export type ProjectCategory = 'DeFi' | 'DAO' | 'NFT' | 'Tooling' | 'Infra' | 'Web Development' | string

export interface Contributor {
  githubHandle: string
  avatarUrl: string | null
}

export interface Issue {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  htmlUrl: string
  createdAt: string
  updatedAt: string
}

export interface Repository {
  id: number
  githubUrl: string
  name: string
  stars: number
  description: string | null
  contributors?: Contributor[]
  issues?: Issue[]
}

export interface Bounty {
  id: number
  bountyKey: string
  repoOwner: string
  repoName: string
  issueNumber: number
  issueUrl: string
  amount: number
  creatorWallet: string
  status: string
  winnerId: number | null
  createdAt: string
  updatedAt: string
  projectName?: string
}

// API Project type (from WeSource API)
export interface Project {
  id: number
  name: string
  description?: string | null
  creator?: string
  createdAt: string
  updatedAt?: string
  repositories: Repository[]
  // Optional fields for UI display
  category?: ProjectCategory
  logo?: string
  techStack?: string[]
  bounties?: Bounty[]
}
