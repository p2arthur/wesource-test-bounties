const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Types matching the API response
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

export interface Project {
  id: number
  name: string
  description?: string | null
  creator?: string
  createdAt: string
  updatedAt?: string
  repositories: Repository[]
}

export interface ProjectsResponse {
  data: Project[]
  total: number
}

export interface CreateProjectPayload {
  name: string
  description?: string
  category: string
  repoUrls: string[]
  creator: string
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
}

export interface CreateBountyPayload {
  repoOwner: string
  repoName: string
  issueNumber: number
  amount: number
  creatorWallet: string
}

export type CreateBountyResponse = Bounty
export type ListBountiesResponse = Bounty[]

/**
 * Parsed x402 payment requirements returned by a 402 response.
 */
export interface X402PaymentAccept {
  scheme: string
  network: string
  payTo: string
  price: string
  resource?: string
  description?: string
  maxAmountRequired?: string
  asset?: string | number
  extra?: Record<string, unknown>
}

export interface X402PaymentRequirements {
  x402Version: number
  accepts: X402PaymentAccept[]
}

/**
 * Sends a plain fetch (no x402 handling) to trigger a 402 response and extract
 * the payment requirements the server demands.
 *
 * Returns `null` when the endpoint does NOT require payment (e.g. middleware is
 * disabled) — in that case the bounty was already created.
 */
export async function preflightBountyCreation(
  payload: CreateBountyPayload,
): Promise<{ requirements: X402PaymentRequirements | null; alreadyCreated: CreateBountyResponse | null }> {
  const response = await fetch(`${API_BASE_URL}/api/bounties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  // If the server returns 201, x402 middleware was not active — bounty was created
  if (response.status === 201) {
    const bounty: CreateBountyResponse = await response.json()
    return { requirements: null, alreadyCreated: bounty }
  }

  if (response.status === 402) {
    // Try V2 header first
    const headerValue = response.headers.get('X-PAYMENT-REQUIRED')
    if (headerValue) {
      try {
        const requirements: X402PaymentRequirements = JSON.parse(headerValue)
        return { requirements, alreadyCreated: null }
      } catch {
        // Fall through to body parsing
      }
    }

    // Try response body
    try {
      const body = await response.json()
      if (body && (body.x402Version || body.accepts)) {
        return { requirements: body as X402PaymentRequirements, alreadyCreated: null }
      }
    } catch {
      // Unable to parse — return generic info from what we know
    }

    // Fallback: we know it's 402 but can't parse requirements
    return {
      requirements: {
        x402Version: 0,
        accepts: [],
      },
      alreadyCreated: null,
    }
  }

  // Unexpected status — throw
  const error = await response.json().catch(() => ({ message: `Unexpected status ${response.status}` }))
  throw new Error(error.message || `Failed to preflight bounty creation (status ${response.status})`)
}

// API functions
export async function fetchProjects(): Promise<ProjectsResponse> {
  const response = await fetch(`${API_BASE_URL}/projects`)
  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }
  return response.json()
}

export async function fetchProjectById(id: number): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`)
  console.log('fetchProjectById response:', response)
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Project not found')
    }
    throw new Error('Failed to fetch project')
  }
  return response.json()
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create project' }))
    throw new Error(error.message || 'Failed to create project')
  }

  return response.json()
}

export async function deleteProject(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete project')
  }
}

export async function createBounty(payload: CreateBountyPayload, customFetch?: typeof fetch): Promise<CreateBountyResponse> {
  if (!payload.repoOwner || !payload.repoName || !payload.creatorWallet) {
    throw new Error('Missing required bounty fields')
  }
  if (!Number.isInteger(payload.issueNumber) || payload.issueNumber <= 0) {
    throw new Error('Issue number must be a positive integer')
  }
  if (typeof payload.amount !== 'number' || payload.amount <= 0) {
    throw new Error('Amount must be a positive number')
  }

  // Use the x402-aware fetch when provided – it automatically handles
  // 402 Payment Required responses by signing an Algorand USDC payment
  // and retrying the request with the X-PAYMENT header.
  const fetchFn = customFetch ?? fetch

  const response = await fetchFn(`${API_BASE_URL}/api/bounties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (response.status !== 201) {
    const error = await response.json().catch(() => ({ message: 'Failed to create bounty' }))
    throw new Error(error.message || `Failed to create bounty (status ${response.status})`)
  }

  return response.json()
}

export async function listBounties(): Promise<ListBountiesResponse> {
  const response = await fetch(`${API_BASE_URL}/api/bounties`)
  if (!response.ok) {
    throw new Error('Failed to fetch bounties')
  }
  return response.json()
}

export async function checkBountyExists(repoOwner: string, repoName: string, issueNumber: number): Promise<Bounty | undefined> {
  const bounties = await listBounties()
  const issueUrl = `https://github.com/${repoOwner}/${repoName}/issues/${issueNumber}`
  return bounties.find((b) => b.issueUrl === issueUrl)
}

export interface WonBounty extends Bounty {
  claimedAt?: string | null
}

export async function listWonBounties(githubUsername: string): Promise<WonBounty[]> {
  if (!githubUsername) {
    return []
  }
  const response = await fetch(`${API_BASE_URL}/api/bounties/winner/${encodeURIComponent(githubUsername)}`)
  if (!response.ok) {
    throw new Error('Failed to fetch won bounties')
  }
  return response.json()
}
