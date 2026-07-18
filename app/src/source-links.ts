export interface SourceLinkParseResult {
  links: string[]
  invalidLinks: string[]
}

export function parseSourceLinks(value: string): SourceLinkParseResult {
  const entries = value
    .split(/[\n,]/)
    .map((link) => link.trim())
    .filter(Boolean)
  const links: string[] = []
  const invalidLinks: string[] = []
  const seenLinks = new Set<string>()

  entries.forEach((entry) => {
    try {
      const url = new URL(entry)
      if (
        (url.protocol !== 'http:' && url.protocol !== 'https:')
        || !url.hostname
        || !/^https?:\/\//i.test(entry)
      ) {
        invalidLinks.push(entry)
        return
      }

      if (!seenLinks.has(url.href)) {
        seenLinks.add(url.href)
        links.push(url.href)
      }
    } catch {
      invalidLinks.push(entry)
    }
  })

  return { links, invalidLinks }
}

export function formatSourceLinkLabel(link: string): string {
  try {
    const url = new URL(link)
    const host = url.host.replace(/^www\./i, '')
    const path = url.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => {
        try {
          return decodeURIComponent(segment)
        } catch {
          return segment
        }
      })
      .join('/')

    return path ? `${host}/${path}` : host
  } catch {
    return link
  }
}
