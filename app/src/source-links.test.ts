import { describe, expect, it } from 'vitest'
import { parseSourceLinks } from './source-links'

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
