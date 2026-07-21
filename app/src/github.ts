export interface GitHubCommit {
  sha: string
  message: string
  author: string
  timestamp: string
  url: string
}

export function isGitHubRepository(value: string): boolean {
  return /^[\w.-]+\/[\w.-]+$/.test(value.trim())
}

export function isGitHubCommitReference(
  url: string,
  repository: string,
  sha: string,
): boolean {
  if (!isGitHubRepository(repository) || !/^[a-f0-9]{7,64}$/i.test(sha.trim())) {
    return false
  }

  try {
    const parsed = new URL(url)
    const [owner, name] = repository.trim().split('/')
    const expectedPath = `/${owner}/${name}/commit/`
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') return false
    if (!parsed.pathname.toLowerCase().startsWith(expectedPath.toLowerCase())) return false
    const referencedSha = parsed.pathname.slice(expectedPath.length)
    return /^[a-f0-9]{7,64}$/i.test(referencedSha) &&
      (referencedSha.toLowerCase().startsWith(sha.trim().toLowerCase()) ||
        sha.trim().toLowerCase().startsWith(referencedSha.toLowerCase()))
  } catch {
    return false
  }
}

function loadError(response: Pick<Response, 'status' | 'headers'>): Error {
  if (response.status === 401) {
    return new Error('GitHub requires authentication before recent commits can be loaded.')
  }
  if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    return new Error('GitHub’s public request limit has been reached. Try again later.')
  }
  if (response.status === 404) {
    return new Error('This GitHub repository is unavailable or is not public.')
  }
  return new Error('GitHub could not load recent commits for this repository.')
}

export async function fetchRecentCommits(
  repository: string,
  request: typeof fetch = fetch,
): Promise<GitHubCommit[]> {
  if (!isGitHubRepository(repository)) {
    throw new Error('Enter a repository as owner/repository.')
  }
  let response: Response
  try {
    response = await request(`https://api.github.com/repos/${repository.trim()}/commits?per_page=8`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
  } catch {
    throw new Error('GitHub is unavailable right now. Check your connection and try again.')
  }
  if (!response.ok) throw loadError(response)

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('GitHub returned an unreadable commit list.')
  }
  if (!Array.isArray(payload)) throw new Error('GitHub returned an unexpected commit list.')
  return payload.flatMap((item): GitHubCommit[] => {
    if (!item || typeof item !== 'object') return []
    const commit = item as { sha?: unknown; html_url?: unknown; commit?: { message?: unknown; author?: { name?: unknown; date?: unknown } } }
    const sha = typeof commit.sha === 'string' ? commit.sha : ''
    const url = typeof commit.html_url === 'string' ? commit.html_url : ''
    const message = typeof commit.commit?.message === 'string' ? commit.commit.message.split('\n')[0] : ''
    const author = typeof commit.commit?.author?.name === 'string' ? commit.commit.author.name : 'Unknown author'
    const timestamp = typeof commit.commit?.author?.date === 'string' ? commit.commit.author.date : ''
    return sha && url && message && timestamp ? [{ sha, url, message, author, timestamp }] : []
  })
}
