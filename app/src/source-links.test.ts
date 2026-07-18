import { describe, expect, it } from 'vitest'
import { formatSourceLinkLabel, parseSourceLinks } from './source-links'

describe('source link parsing', () => {
  it('accepts complete web links and normalizes them', () => {
    expect(parseSourceLinks('https://example.com/research, http://example.org')).toEqual({
      links: ['https://example.com/research', 'http://example.org/'],
      invalidLinks: [],
    })
  })

  it('deduplicates equivalent links', () => {
    expect(parseSourceLinks('https://example.com, https://example.com/')).toEqual({
      links: ['https://example.com/'],
      invalidLinks: [],
    })
  })

  it('keeps malformed and unsupported entries visible for recovery', () => {
    expect(
      parseSourceLinks('research-notes, mailto:team@example.com, http:example.com'),
    ).toEqual({
      links: [],
      invalidLinks: [
        'research-notes',
        'mailto:team@example.com',
        'http:example.com',
      ],
    })
  })

  it('separates valid links from invalid entries without losing either', () => {
    expect(parseSourceLinks('https://example.com/evidence\nmissing-scheme')).toEqual({
      links: ['https://example.com/evidence'],
      invalidLinks: ['missing-scheme'],
    })
  })

  it('treats an empty optional field as valid', () => {
    expect(parseSourceLinks('')).toEqual({ links: [], invalidLinks: [] })
  })
})

describe('source link labels', () => {
  it('uses the destination host for a root link', () => {
    expect(formatSourceLinkLabel('https://www.example.com/')).toBe('example.com')
  })

  it('keeps the meaningful path while omitting query details', () => {
    expect(
      formatSourceLinkLabel(
        'https://example.com/research/pilot-evidence?view=review#findings',
      ),
    ).toBe('example.com/research/pilot-evidence')
  })

  it('decodes readable path segments', () => {
    expect(formatSourceLinkLabel('https://example.com/Research%20Notes')).toBe(
      'example.com/Research Notes',
    )
  })

  it('falls back safely for legacy malformed values', () => {
    expect(formatSourceLinkLabel('research-notes')).toBe('research-notes')
  })
})
