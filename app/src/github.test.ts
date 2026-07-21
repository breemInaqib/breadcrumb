import { describe, expect, it } from 'vitest'
import { fetchRecentCommits, isGitHubCommitReference, isGitHubRepository } from './github'

describe('GitHub repository references', () => {
  it('accepts a single owner/repository association only', () => {
    expect(isGitHubRepository('openai/openai-cookbook')).toBe(true)
    expect(isGitHubRepository('https://github.com/openai/openai-cookbook')).toBe(false)
    expect(isGitHubRepository('openai')).toBe(false)
  })

  it('accepts only a canonical commit URL from that repository', () => {
    expect(isGitHubCommitReference(
      'https://github.com/openai/openai-cookbook/commit/ab12cd34ef56',
      'openai/openai-cookbook',
      'ab12cd3',
    )).toBe(true)
    expect(isGitHubCommitReference(
      'https://github.com/other/project/commit/ab12cd34ef56',
      'openai/openai-cookbook',
      'ab12cd3',
    )).toBe(false)
  })

  it('explains public GitHub authentication and availability failures', async () => {
    const unauthenticated = async () => ({
      ok: false,
      status: 401,
      headers: new Headers(),
    }) as Response
    const unavailable = async () => ({
      ok: false,
      status: 404,
      headers: new Headers(),
    }) as Response

    await expect(fetchRecentCommits('openai/openai-cookbook', unauthenticated as typeof fetch))
      .rejects.toThrow('authentication')
    await expect(fetchRecentCommits('openai/openai-cookbook', unavailable as typeof fetch))
      .rejects.toThrow('unavailable or is not public')
  })

  it('filters incomplete GitHub activity instead of treating it as evidence', async () => {
    const request = async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => [
        { sha: 'a1b2c3d4', html_url: 'https://github.com/openai/openai-cookbook/commit/a1b2c3d4', commit: { message: 'Keep this', author: { name: 'Ada', date: '2026-07-20T12:00:00Z' } } },
        { sha: 'missing-url', commit: { message: 'Do not keep', author: { name: 'Ada', date: '2026-07-20T12:00:00Z' } } },
      ],
    }) as Response

    await expect(fetchRecentCommits('openai/openai-cookbook', request as typeof fetch)).resolves.toEqual([
      expect.objectContaining({ sha: 'a1b2c3d4', message: 'Keep this' }),
    ])
  })
})
