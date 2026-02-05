# WeSource API Documentation

WeSource is a repository portal API that allows users to submit projects by providing GitHub repository URLs. The server stores only the project metadata and repository URLs locally, then fetches contributors and issues dynamically from the GitHub API when requested.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Database Setup](#database-setup)
3. [API Endpoints](#api-endpoints)
4. [Frontend Integration Guide](#frontend-integration-guide)
5. [Error Handling](#error-handling)
6. [Environment Variables](#environment-variables)

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Setup the database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Start the development server
npm run start:dev
```

The API will be available at `http://localhost:3000` and the interactive Swagger documentation at `http://localhost:3000/api`.

---

## Database Setup

WeSource uses SQLite with Prisma ORM. The database file is stored locally as `prisma/dev.db`.

### Initialize Database

```bash
# Push schema to database
npx prisma db push
```

### Database Schema

The database consists of two models (contributors and issues are fetched live from GitHub):

#### Project
| Field       | Type     | Description                    |
|-------------|----------|--------------------------------|
| id          | Int      | Auto-increment primary key     |
| name        | String   | Project name                   |
| creator     | String   | Project creator name           |
| createdAt   | DateTime | Creation timestamp             |
| updatedAt   | DateTime | Last update timestamp          |

#### Repository
| Field       | Type     | Description                    |
|-------------|----------|--------------------------------|
| id          | Int      | Auto-increment primary key     |
| githubUrl   | String   | Unique GitHub repository URL   |
| projectId   | Int      | Foreign key to Project         |
| createdAt   | DateTime | Creation timestamp             |
| updatedAt   | DateTime | Last update timestamp          |

> **Note:** Contributors and issues are NOT stored in the database. They are fetched in real-time from the GitHub API when you request project details via `GET /projects/:id`.

### View Database (Optional)

```bash
# Open Prisma Studio to view/edit data
npx prisma studio
```

---

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Interactive Documentation
Visit `http://localhost:3000/api` for Swagger UI documentation.

---

### POST /projects

Create a new project with GitHub repository URLs. Only the project metadata and repo URLs are stored.

#### Request

```http
POST /projects
Content-Type: application/json
```

```json
{
  "name": "My Full-Stack Project",
  "creator": "Arthur Rabelo",
  "repoUrls": [
    "https://github.com/nestjs/nest",
    "https://github.com/prisma/prisma"
  ]
}
```

#### Request Body

| Field       | Type     | Required | Description                        |
|-------------|----------|----------|------------------------------------|
| name        | string   | ✅       | Project name                       |
| creator     | string   | ✅       | Project creator name               |
| repoUrls    | string[] | ✅       | Array of GitHub repository URLs    |

#### Success Response (201 Created)

```json
{
  "id": 1,
  "name": "My Full-Stack Project",
  "creator": "Arthur Rabelo",
  "createdAt": "2026-01-20T10:30:00.000Z",
  "updatedAt": "2026-01-20T10:30:00.000Z",
  "repositories": [
    {
      "id": 1,
      "githubUrl": "https://github.com/nestjs/nest",
      "projectId": 1,
      "createdAt": "2026-01-20T10:30:00.000Z",
      "updatedAt": "2026-01-20T10:30:00.000Z"
    },
    {
      "id": 2,
      "githubUrl": "https://github.com/prisma/prisma",
      "projectId": 1,
      "createdAt": "2026-01-20T10:30:00.000Z",
      "updatedAt": "2026-01-20T10:30:00.000Z"
    }
  ]
}
```

> **Note:** No GitHub data is fetched during creation. The URLs are validated but data is only fetched when you retrieve the project.

#### Error Responses

| Status | Description                                    |
|--------|------------------------------------------------|
| 400    | Invalid request body or GitHub URL format      |

---

### GET /projects

Retrieve all projects with their repository URLs (no GitHub data).

#### Request

```http
GET /projects
```

#### Success Response (200 OK)

```json
{
  "data": [
    {
      "id": 1,
      "name": "My Full-Stack Project",
      "creator": "Arthur Rabelo",
      "createdAt": "2026-01-20T10:30:00.000Z",
      "updatedAt": "2026-01-20T10:30:00.000Z",
      "repositories": [
        {
          "id": 1,
          "githubUrl": "https://github.com/nestjs/nest"
        },
        {
          "id": 2,
          "githubUrl": "https://github.com/prisma/prisma"
        }
      ]
    }
  ],
  "total": 1
}
```

---

### GET /projects/:id

Retrieve full details of a specific project with **live GitHub data** including repository metadata, top 10 contributors, and up to 30 open issues per repository.

#### Request

```http
GET /projects/1
```

#### Success Response (200 OK)

```json
{
  "id": 1,
  "name": "My Full-Stack Project",
  "creator": "Arthur Rabelo",
  "createdAt": "2026-01-20T10:30:00.000Z",
  "updatedAt": "2026-01-20T10:30:00.000Z",
  "repositories": [
    {
      "id": 1,
      "githubUrl": "https://github.com/nestjs/nest",
      "name": "nest",
      "stars": 65000,
      "description": "A progressive Node.js framework for building efficient, scalable, and enterprise-grade server-side applications",
      "contributors": [
        {
          "githubHandle": "kamilmysliwiec",
          "avatarUrl": "https://avatars.githubusercontent.com/u/23244943?v=4",
          "contributions": 2500
        },
        {
          "githubHandle": "micalevisk",
          "avatarUrl": "https://avatars.githubusercontent.com/u/13461315?v=4",
          "contributions": 150
        }
      ],
      "issues": [
        {
          "number": 12345,
          "title": "Bug: Something is not working",
          "state": "open",
          "htmlUrl": "https://github.com/nestjs/nest/issues/12345",
          "createdAt": "2026-01-15T09:00:00.000Z",
          "updatedAt": "2026-01-18T14:30:00.000Z",
          "user": {
            "login": "someuser",
            "avatarUrl": "https://avatars.githubusercontent.com/u/123456?v=4"
          },
          "labels": [
            {
              "name": "bug",
              "color": "d73a4a"
            }
          ],
          "commentsCount": 5
        }
      ]
    },
    {
      "id": 2,
      "githubUrl": "https://github.com/prisma/prisma",
      "name": "prisma",
      "stars": 38000,
      "description": "Next-generation ORM for Node.js & TypeScript",
      "contributors": [...],
      "issues": [...]
    }
  ]
}
```

#### Response with GitHub Fetch Error

If GitHub data cannot be fetched for a repository (rate limit, repo deleted, etc.), it returns basic info with an error:

```json
{
  "id": 1,
  "name": "My Full-Stack Project",
  "creator": "Arthur Rabelo",
  "repositories": [
    {
      "id": 1,
      "githubUrl": "https://github.com/deleted/repo",
      "error": "Failed to fetch data: Repository not found: deleted/repo"
    }
  ]
}
```

#### Error Responses

| Status | Description                        |
|--------|------------------------------------|
| 404    | Project not found                  |
| 429    | GitHub API rate limit exceeded     |

---

### DELETE /projects/:id

Delete a project and all associated repositories.

#### Request

```http
DELETE /projects/1
```

#### Success Response (200 OK)

```json
{
  "message": "Project with ID 1 successfully deleted"
}
```

---

## Frontend Integration Guide

### Quick Start for Frontend Developers

Here's how to integrate the WeSource API into your frontend application:

#### Fetching the Project Feed

```javascript
// Using fetch API
async function getProjects() {
  const response = await fetch('http://localhost:3000/projects');
  const data = await response.json();
  return data; // { data: [...projects], total: number }
}

// Using axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get all projects (basic info only)
const { data } = await api.get('/projects');
console.log(data.data); // Array of projects
console.log(data.total); // Total count
```

#### Creating a New Project

```javascript
async function createProject(projectData) {
  const response = await fetch('http://localhost:3000/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'My Project',
      creator: 'John Doe',
      repoUrls: [
        'https://github.com/facebook/react',
        'https://github.com/vuejs/vue',
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}
```

#### Getting Project Details with Contributors and Issues

```javascript
async function getProjectDetails(projectId) {
  const response = await fetch(`http://localhost:3000/projects/${projectId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Project not found');
    }
    throw new Error('Failed to fetch project');
  }
  
  const project = await response.json();
  
  // Access contributors and issues
  project.repositories.forEach(repo => {
    console.log(`Repo: ${repo.name}`);
    console.log(`Stars: ${repo.stars}`);
    console.log(`Contributors: ${repo.contributors?.length || 0}`);
    console.log(`Open Issues: ${repo.issues?.length || 0}`);
  });
  
  return project;
}
```

#### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface Project {
  id: number;
  name: string;
  creator: string;
  repositories: Repository[];
}

interface Repository {
  id: number;
  githubUrl: string;
  name?: string;
  stars?: number;
  description?: string;
  contributors?: Contributor[];
  issues?: Issue[];
  error?: string;
}

interface Contributor {
  githubHandle: string;
  avatarUrl: string;
  contributions: number;
}

interface Issue {
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  createdAt: string;
  user: { login: string; avatarUrl: string };
  labels: { name: string; color: string }[];
  commentsCount: number;
}

function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch('http://localhost:3000/projects')
      .then((res) => res.json())
      .then((data) => {
        setProjects(data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { projects, loading, error };
}

// Hook for fetching full project details with GitHub data
function useProjectDetails(projectId: number) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(`http://localhost:3000/projects/${projectId}`)
      .then((res) => res.json())
      .then((data) => {
        setProject(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [projectId]);

  return { project, loading, error };
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

### Common Error Codes

| Code | Meaning                                          |
|------|--------------------------------------------------|
| 400  | Bad Request - Invalid input data                 |
| 404  | Not Found - Resource doesn't exist               |
| 429  | Too Many Requests - GitHub rate limit exceeded   |
| 500  | Internal Server Error                            |
| 502  | Bad Gateway - GitHub API error                   |
| 503  | Service Unavailable - Cannot connect to GitHub   |

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database connection string (required)
DATABASE_URL="file:./dev.db"

# Server port (optional, default: 3000)
PORT=3000

# GitHub Personal Access Token (optional, but recommended)
# Increases rate limit from 60 to 5000 requests/hour
GITHUB_TOKEN=ghp_your_github_token_here
```

### Getting a GitHub Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scope: `public_repo` (for public repositories)
4. Copy the token and add it to your `.env` file

**Important:** Without a token, GitHub API limits you to 60 requests per hour. With a token, this increases to 5,000 requests per hour. Since this API fetches GitHub data on every `GET /projects/:id` request, a token is highly recommended for production use.

---

## Development Commands

```bash
# Start development server with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Push schema to database
npx prisma db push

# View database with Prisma Studio
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate

# Format code
npm run format

# Run linter
npm run lint
```

---

## Architecture Overview

```
src/
├── main.ts                 # Application entry point & Swagger setup
├── app.module.ts           # Root module
├── github/
│   ├── github.module.ts    # GitHub module
│   └── github.service.ts   # GitHub API integration (fetch repos, contributors, issues)
├── prisma/
│   ├── prisma.module.ts    # Prisma module (global)
│   └── prisma.service.ts   # Database connection service
└── projects/
    ├── projects.module.ts  # Projects module
    ├── projects.controller.ts  # HTTP endpoints
    ├── projects.service.ts     # Business logic
    └── dto/
        ├── create-project.dto.ts   # Input validation
        └── project-response.dto.ts # Response types
```

### Data Flow

1. **POST /projects** - Validates GitHub URLs and stores project + repo URLs in SQLite
2. **GET /projects** - Returns stored project data (no GitHub fetch)
3. **GET /projects/:id** - Fetches live data from GitHub API for each stored repo URL, returning contributors (top 10) and issues (up to 30 per repo)

---

## License

MIT
