import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

export interface RepositoryMetadata {
  name: string;
  description: string | null;
  stars: number;
  githubUrl: string;
}

export interface ContributorData {
  githubHandle: string;
  avatarUrl: string;
}

export interface IssueData {
  id: number;
  number: number;
  title: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  user: {
    login: string;
    avatarUrl: string;
  };
  labels: { name: string; color: string }[];
}

export interface FullRepositoryData {
  name: string;
  description: string | null;
  stars: number;
  githubUrl: string;
  contributors: ContributorData[];
  issues: IssueData[];
}

export interface IssueClosureInfo {
  issueId: string;
  issueNumber: number;
  issueTitle: string;
  isClosed: boolean;
  closedByPrAuthor: { databaseId: number; login: string } | null;
  rateLimit?: { remaining: number; resetAt: string } | null;
}

export interface IssueEventData {
  id: number; // Event ID
  event: string; // "closed", "reopened", etc.
  created_at: string;
  actor: {
    id: number;
    login: string;
  } | null;
  commit_id: string | null;
  commit_url: string | null;
  state_reason?: 'completed' | 'not_planned' | 'reopened' | null;
}

export interface CommitAuthorData {
  sha: string;
  author: {
    id: number;
    login: string;
  } | null;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly baseUrl = 'https://api.github.com';

  /**
   * Parse a GitHub URL to extract owner and repo name
   * Supports formats:
   * - https://github.com/owner/repo
   * - https://github.com/owner/repo.git
   * - github.com/owner/repo
   */
  parseGithubUrl(url: string): { owner: string; repo: string } | null {
    try {
      // Remove trailing slashes and .git suffix
      let cleanUrl = url
        .trim()
        .replace(/\/+$/, '')
        .replace(/\.git$/, '');

      // Handle URLs without protocol
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const urlObj = new URL(cleanUrl);

      // Validate it's a GitHub URL
      if (!urlObj.hostname.includes('github.com')) {
        return null;
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      if (pathParts.length < 2) {
        return null;
      }

      return {
        owner: pathParts[0],
        repo: pathParts[1],
      };
    } catch {
      return null;
    }
  }

  /**
   * Get authorization headers if GITHUB_TOKEN is set
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'WeSource-App',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
  }

  private getGraphqlHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'WeSource-App',
    };

    if (!process.env.GITHUB_TOKEN) {
      throw new HttpException('GITHUB_TOKEN is required for GitHub GraphQL requests.', HttpStatus.UNAUTHORIZED);
    }

    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;

    return headers;
  }

  /**
   * Fetch issue closure status and the PR author who closed it (if any).
   */
  async getIssueClosureInfo(params: { owner: string; repo: string; issueNumber: number }): Promise<IssueClosureInfo> {
    const { owner, repo, issueNumber } = params;
    const headers = this.getGraphqlHeaders();

    const query = `
      query($owner: String!, $repo: String!, $issueNumber: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $issueNumber) {
            id
            number
            title
            closed
            timelineItems(last: 20, itemTypes: CLOSED_EVENT) {
              nodes {
                __typename
                ... on ClosedEvent {
                  closer {
                    __typename
                    ... on PullRequest {
                      author {
                        __typename
                        ... on User {
                          databaseId
                          login
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        rateLimit {
          remaining
          resetAt
        }
      }
    `;

    try {
      const response = await axios.post(
        `${this.baseUrl}/graphql`,
        {
          query,
          variables: { owner, repo, issueNumber },
        },
        { headers },
      );

      const { data, errors } = response.data as {
        data?: {
          repository?: {
            issue?: {
              id: string;
              number: number;
              title: string;
              closed: boolean;
              timelineItems?: {
                nodes?: Array<{
                  __typename?: string;
                  closer?: {
                    __typename?: string;
                    author?: {
                      __typename?: string;
                      databaseId?: number;
                      login?: string;
                    };
                  };
                } | null>;
              };
            } | null;
          } | null;
          rateLimit?: { remaining: number; resetAt: string } | null;
        };
        errors?: { message: string }[];
      };

      if (errors && errors.length > 0) {
        const message = errors.map((err) => err.message).join('; ');
        if (message.includes('Could not resolve to a Repository') || message.includes('Could not resolve to an Issue')) {
          throw new HttpException(message, HttpStatus.NOT_FOUND);
        }
        throw new HttpException(message, HttpStatus.BAD_GATEWAY);
      }

      const issue = data?.repository?.issue;
      if (!issue) {
        throw new HttpException(`Issue ${owner}/${repo}#${issueNumber} not found.`, HttpStatus.NOT_FOUND);
      }

      const rateLimit = data?.rateLimit ?? null;
      if (rateLimit?.remaining === 0) {
        this.logger.warn(`GitHub GraphQL rate limit exceeded. Resets at: ${rateLimit.resetAt}`);
        throw new HttpException('GitHub API rate limit exceeded. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
      }

      const nodes = issue.timelineItems?.nodes ?? [];
      const closedEvent = nodes.find(
        (node) =>
          node?.__typename === 'ClosedEvent' &&
          node?.closer?.__typename === 'PullRequest' &&
          node?.closer?.author?.__typename === 'User' &&
          typeof node?.closer?.author?.databaseId === 'number' &&
          typeof node?.closer?.author?.login === 'string',
      );

      const closedByPrAuthor = closedEvent?.closer?.author?.databaseId
        ? {
            databaseId: closedEvent.closer.author.databaseId,
            login: closedEvent.closer.author.login ?? 'unknown',
          }
        : null;

      return {
        issueId: issue.id,
        issueNumber: issue.number,
        issueTitle: issue.title,
        isClosed: issue.closed,
        closedByPrAuthor,
        rateLimit,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `GitHub GraphQL error for ${owner}/${repo}#${issueNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new HttpException('GitHub GraphQL request failed.', HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * Validate a GitHub URL without fetching data
   */
  async validateUrl(githubUrl: string): Promise<boolean> {
    const parsed = this.parseGithubUrl(githubUrl);
    if (!parsed) return false;

    const { owner, repo } = parsed;
    const headers = this.getHeaders();

    try {
      await axios.head(`${this.baseUrl}/repos/${owner}/${repo}`, { headers });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch full repository data including metadata, contributors, and issues
   */
  async getFullRepositoryData(githubUrl: string): Promise<FullRepositoryData> {
    const parsed = this.parseGithubUrl(githubUrl);

    if (!parsed) {
      throw new HttpException(`Invalid GitHub URL: ${githubUrl}. Expected format: https://github.com/owner/repo`, HttpStatus.BAD_REQUEST);
    }

    const { owner, repo } = parsed;
    let headers = this.getHeaders();

    const fetchAll = async (h: Record<string, string>) => {
      const [repoResponse, contributorsResponse, issuesResponse] = await Promise.all([
        axios.get(`${this.baseUrl}/repos/${owner}/${repo}`, { headers: h }),
        axios.get(`${this.baseUrl}/repos/${owner}/${repo}/contributors`, {
          headers: h,
          params: { per_page: 10 },
        }),
        axios.get(`${this.baseUrl}/repos/${owner}/${repo}/issues`, {
          headers: h,
          params: { state: 'all', per_page: 30 },
        }),
      ]);
      return { repoResponse, contributorsResponse, issuesResponse };
    };

    try {
      let result;
      try {
        // Fetch repository metadata, contributors, and issues in parallel
        result = await fetchAll(headers);
      } catch (firstError) {
        // If the request failed with 401 and we had a token, retry without it
        const axiosErr = firstError as AxiosError;
        if (axiosErr.response?.status === 401 && headers['Authorization']) {
          this.logger.warn(`GitHub token appears invalid (401). Retrying without authentication for ${githubUrl}`);
          const { Authorization: _, ...headersWithoutAuth } = headers;
          headers = headersWithoutAuth;
          result = await fetchAll(headers);
        } else {
          throw firstError;
        }
      }

      const { repoResponse, contributorsResponse, issuesResponse } = result;

      const repoData = repoResponse.data;
      const contributorsData = contributorsResponse.data;
      const issuesData = issuesResponse.data;

      const contributors: ContributorData[] = Array.isArray(contributorsData)
        ? contributorsData.map((contributor: { login: string; avatar_url: string }) => ({
            githubHandle: contributor.login,
            avatarUrl: contributor.avatar_url,
          }))
        : [];

      const issues: IssueData[] = Array.isArray(issuesData)
        ? issuesData.map(
            (issue: {
              id: number;
              number: number;
              title: string;
              state: string;
              created_at: string;
              updated_at: string;
              html_url: string;
              user: { login: string; avatar_url: string };
              labels: { name: string; color: string }[];
            }) => ({
              id: issue.id,
              number: issue.number,
              title: issue.title,
              state: issue.state,
              createdAt: issue.created_at,
              updatedAt: issue.updated_at,
              htmlUrl: issue.html_url,
              user: {
                login: issue.user.login,
                avatarUrl: issue.user.avatar_url,
              },
              labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
            }),
          )
        : [];

      return {
        name: repoData.name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        githubUrl: repoData.html_url,
        contributors,
        issues,
      };
    } catch (error) {
      this.handleGithubError(error as AxiosError, githubUrl);
      throw error;
    }
  }

  /**
   * Handle GitHub API errors with appropriate HTTP exceptions
   */
  private handleGithubError(error: AxiosError, url: string): never {
    if (!error.response) {
      this.logger.error(`Network error fetching ${url}: ${error.message}`);
      throw new HttpException('Unable to connect to GitHub API. Please try again later.', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const status = error.response.status;
    const data = error.response.data as { message?: string };

    switch (status) {
      case 404:
        throw new HttpException(
          `Repository not found: ${url}. Please verify the URL is correct and the repository is public.`,
          HttpStatus.NOT_FOUND,
        );

      case 403:
        // Check for rate limiting
        const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
        if (rateLimitRemaining === '0') {
          const resetTime = error.response.headers['x-ratelimit-reset'];
          const resetDate = resetTime ? new Date(parseInt(resetTime as string) * 1000).toISOString() : 'unknown';
          this.logger.warn(`GitHub API rate limit exceeded. Resets at: ${resetDate}`);
          throw new HttpException(
            `GitHub API rate limit exceeded. Please try again later or set a GITHUB_TOKEN environment variable.`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        throw new HttpException(`Access forbidden for ${url}: ${data?.message || 'Unknown reason'}`, HttpStatus.FORBIDDEN);

      case 401:
        throw new HttpException('GitHub authentication failed. Please check your GITHUB_TOKEN.', HttpStatus.UNAUTHORIZED);

      default:
        this.logger.error(`GitHub API error (${status}) for ${url}: ${data?.message || 'Unknown error'}`);
        throw new HttpException(`GitHub API error: ${data?.message || 'Unknown error'}`, HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * Fetch issue events using REST API with If-Modified-Since support
   * This is more efficient for checking issue closure status.
   */
  async getIssueEvents(params: { owner: string; repo: string; issueNumber: number; ifModifiedSince?: Date }): Promise<IssueEventData[]> {
    const { owner, repo, issueNumber, ifModifiedSince } = params;
    const headers = this.getHeaders();

    if (ifModifiedSince) {
      headers['If-Modified-Since'] = ifModifiedSince.toUTCString();
    }

    const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}/events`;

    try {
      const response = await this.retryWithBackoff(async () => {
        return await axios.get(url, { headers, validateStatus: (status) => status < 500 });
      });

      // 304 Not Modified - no new events
      if (response.status === 304) {
        return [];
      }

      // Handle rate limiting
      if (response.status === 403) {
        const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
        if (rateLimitRemaining === '0') {
          const resetTime = response.headers['x-ratelimit-reset'];
          const resetDate = resetTime ? new Date(parseInt(resetTime as string) * 1000).toISOString() : 'unknown';
          this.logger.warn(`GitHub API rate limit exceeded. Resets at: ${resetDate}`);
          throw new HttpException('GitHub API rate limit exceeded. Oracle will retry later.', HttpStatus.TOO_MANY_REQUESTS);
        }
      }

      if (response.status !== 200) {
        throw new HttpException(`GitHub API returned status ${response.status}`, HttpStatus.BAD_GATEWAY);
      }

      const events = response.data as Array<{
        id: number;
        event: string;
        created_at: string;
        actor: { id: number; login: string } | null;
        commit_id: string | null;
        commit_url: string | null;
        state_reason?: 'completed' | 'not_planned' | 'reopened' | null;
      }>;

      return events.map((event) => ({
        id: event.id,
        event: event.event,
        created_at: event.created_at,
        actor: event.actor,
        commit_id: event.commit_id,
        commit_url: event.commit_url,
        state_reason: event.state_reason,
      }));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.handleGithubError(error as AxiosError, url);
      throw error;
    }
  }

  /**
   * Get commit author information from a commit SHA
   * Used to verify the actual commit author when an issue is closed by a commit
   */
  async getCommitAuthor(params: { owner: string; repo: string; commitSha: string }): Promise<CommitAuthorData | null> {
    const { owner, repo, commitSha } = params;
    const headers = this.getHeaders();
    const url = `${this.baseUrl}/repos/${owner}/${repo}/commits/${commitSha}`;

    try {
      const response = await this.retryWithBackoff(async () => {
        return await axios.get(url, { headers, validateStatus: (status) => status < 500 });
      });

      if (response.status === 404) {
        this.logger.warn(`Commit ${commitSha} not found in ${owner}/${repo}`);
        return null;
      }

      if (response.status !== 200) {
        throw new HttpException(`GitHub API returned status ${response.status}`, HttpStatus.BAD_GATEWAY);
      }

      const data = response.data as {
        sha: string;
        author: { id: number; login: string } | null;
        commit: {
          author: {
            name: string;
            email: string;
            date: string;
          };
        };
      };

      return {
        sha: data.sha,
        author: data.author,
        commit: data.commit,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.warn(`Failed to fetch commit ${commitSha}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Retry mechanism with exponential backoff
   * Handles transient errors and rate limiting
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 3, baseDelayMs: number = 1000): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on certain errors
        if (error instanceof HttpException) {
          const status = error.getStatus();
          if (status === HttpStatus.NOT_FOUND || status === HttpStatus.BAD_REQUEST) {
            throw error;
          }
        }

        // If this was the last attempt, throw
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * delayMs; // Add 0-30% jitter
        const totalDelay = delayMs + jitter;

        this.logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(totalDelay)}ms: ${lastError.message}`);

        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      }
    }

    throw lastError;
  }
}
