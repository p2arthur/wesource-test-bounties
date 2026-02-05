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
      throw new HttpException(
        'GITHUB_TOKEN is required for GitHub GraphQL requests.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;

    return headers;
  }

  /**
   * Fetch issue closure status and the PR author who closed it (if any).
   */
  async getIssueClosureInfo(params: {
    owner: string;
    repo: string;
    issueNumber: number;
  }): Promise<IssueClosureInfo> {
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
        throw new HttpException(
          `Issue ${owner}/${repo}#${issueNumber} not found.`,
          HttpStatus.NOT_FOUND,
        );
      }

      const rateLimit = data?.rateLimit ?? null;
      if (rateLimit?.remaining === 0) {
        this.logger.warn(
          `GitHub GraphQL rate limit exceeded. Resets at: ${rateLimit.resetAt}`,
        );
        throw new HttpException(
          'GitHub API rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
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
      throw new HttpException(
        'GitHub GraphQL request failed.',
        HttpStatus.BAD_GATEWAY,
      );
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
      throw new HttpException(
        `Invalid GitHub URL: ${githubUrl}. Expected format: https://github.com/owner/repo`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const { owner, repo } = parsed;
    const headers = this.getHeaders();

    try {
      // Fetch repository metadata, contributors, and issues in parallel
      const [repoResponse, contributorsResponse, issuesResponse] =
        await Promise.all([
          axios.get(`${this.baseUrl}/repos/${owner}/${repo}`, { headers }),
          axios.get(`${this.baseUrl}/repos/${owner}/${repo}/contributors`, {
            headers,
            params: { per_page: 10 },
          }),
          axios.get(`${this.baseUrl}/repos/${owner}/${repo}/issues`, {
            headers,
            params: { state: 'all', per_page: 30 },
          }),
        ]);

      const repoData = repoResponse.data;
      const contributorsData = contributorsResponse.data;
      const issuesData = issuesResponse.data;

      const contributors: ContributorData[] = Array.isArray(contributorsData)
        ? contributorsData.map(
            (contributor: { login: string; avatar_url: string }) => ({
              githubHandle: contributor.login,
              avatarUrl: contributor.avatar_url,
            }),
          )
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
      throw new HttpException(
        'Unable to connect to GitHub API. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
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
        const rateLimitRemaining =
          error.response.headers['x-ratelimit-remaining'];
        if (rateLimitRemaining === '0') {
          const resetTime = error.response.headers['x-ratelimit-reset'];
          const resetDate = resetTime
            ? new Date(parseInt(resetTime as string) * 1000).toISOString()
            : 'unknown';
          this.logger.warn(
            `GitHub API rate limit exceeded. Resets at: ${resetDate}`,
          );
          throw new HttpException(
            `GitHub API rate limit exceeded. Please try again later or set a GITHUB_TOKEN environment variable.`,
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        throw new HttpException(
          `Access forbidden for ${url}: ${data?.message || 'Unknown reason'}`,
          HttpStatus.FORBIDDEN,
        );

      case 401:
        throw new HttpException(
          'GitHub authentication failed. Please check your GITHUB_TOKEN.',
          HttpStatus.UNAUTHORIZED,
        );

      default:
        this.logger.error(
          `GitHub API error (${status}) for ${url}: ${data?.message || 'Unknown error'}`,
        );
        throw new HttpException(
          `GitHub API error: ${data?.message || 'Unknown error'}`,
          HttpStatus.BAD_GATEWAY,
        );
    }
  }
}
