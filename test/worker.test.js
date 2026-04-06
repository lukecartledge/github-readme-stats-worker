import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/fetchers/stats.js', () => ({
  fetchStats: vi.fn(),
}))

vi.mock('../src/fetchers/top-languages.js', () => ({
  fetchTopLanguages: vi.fn(),
}))

const { fetchStats } = await import('../src/fetchers/stats.js')
const { fetchTopLanguages } = await import('../src/fetchers/top-languages.js')
const worker = (await import('../src/worker.js')).default

const mockStats = {
  name: 'Test User',
  totalPRs: 100,
  totalPRsMerged: 0,
  mergedPRsPercentage: 0,
  totalReviews: 20,
  totalCommits: 500,
  totalIssues: 25,
  totalStars: 150,
  totalDiscussionsStarted: 0,
  totalDiscussionsAnswered: 0,
  contributedTo: 30,
  rank: { level: 'A+', percentile: 5 },
}

const mockTopLangs = {
  JavaScript: { name: 'JavaScript', color: '#f1e05a', size: 5000, count: 3 },
  CSS: { name: 'CSS', color: '#563d7c', size: 2000, count: 2 },
}

const createRequest = (path) => new Request(`https://stats.example.com${path}`)

const createCtx = () => ({ waitUntil: vi.fn() })

const mockCache = {
  match: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
}

describe('Worker fetch handler', () => {
  const env = { GH_PAT_1: 'test-token' }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchStats.mockResolvedValue(mockStats)
    fetchTopLanguages.mockResolvedValue(mockTopLangs)
    mockCache.match.mockResolvedValue(undefined)
    mockCache.put.mockResolvedValue(undefined)
    globalThis.caches = { default: mockCache }
  })

  describe('routing', () => {
    it('returns 404 for unknown paths', async () => {
      const response = await worker.fetch(createRequest('/unknown'), env, createCtx())
      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Not Found')
    })

    it('routes /api to stats handler', async () => {
      const response = await worker.fetch(createRequest('/api?username=testuser'), env, createCtx())
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
      const body = await response.text()
      expect(body).toContain('<svg')
    })

    it('routes /api/top-langs to top languages handler', async () => {
      const response = await worker.fetch(
        createRequest('/api/top-langs?username=testuser'),
        env,
        createCtx(),
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
      const body = await response.text()
      expect(body).toContain('<svg')
    })

    it('routes /api/ with trailing slash to stats handler', async () => {
      const response = await worker.fetch(
        createRequest('/api/?username=testuser'),
        env,
        createCtx(),
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
    })

    it('routes /api/top-langs/ with trailing slash to top languages handler', async () => {
      const response = await worker.fetch(
        createRequest('/api/top-langs/?username=testuser'),
        env,
        createCtx(),
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
    })
  })

  describe('/api stats route', () => {
    it('renders error SVG when fetchStats rejects', async () => {
      fetchStats.mockRejectedValue(new Error('Something broke'))
      const response = await worker.fetch(createRequest('/api?username=testuser'), env, createCtx())
      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('Something went wrong')
    })

    it('renders error for invalid locale', async () => {
      const response = await worker.fetch(
        createRequest('/api?username=test&locale=zz-ZZ'),
        env,
        createCtx(),
      )
      const body = await response.text()
      expect(body).toContain('Language not found')
    })

    it('passes query params to fetchStats', async () => {
      await worker.fetch(
        createRequest('/api?username=testuser&include_all_commits=true&exclude_repo=repo1,repo2'),
        env,
        createCtx(),
      )
      expect(fetchStats).toHaveBeenCalledWith(
        'testuser',
        true,
        ['repo1', 'repo2'],
        expect.any(Boolean),
        expect.any(Boolean),
        expect.any(Boolean),
        expect.any(Number),
        env,
      )
    })

    it('sets cache headers on success', async () => {
      const response = await worker.fetch(createRequest('/api?username=testuser'), env, createCtx())
      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toBeTruthy()
    })
  })

  describe('/api/top-langs route', () => {
    it('renders error for invalid layout', async () => {
      const response = await worker.fetch(
        createRequest('/api/top-langs?username=test&layout=invalid'),
        env,
        createCtx(),
      )
      const body = await response.text()
      expect(body).toContain('Incorrect layout input')
    })

    it('renders error for invalid stats_format', async () => {
      const response = await worker.fetch(
        createRequest('/api/top-langs?username=test&stats_format=invalid'),
        env,
        createCtx(),
      )
      const body = await response.text()
      expect(body).toContain('Incorrect stats_format input')
    })

    it('accepts valid layout values', async () => {
      for (const layout of ['compact', 'normal', 'donut', 'donut-vertical', 'pie']) {
        const response = await worker.fetch(
          createRequest(`/api/top-langs?username=test&layout=${layout}`),
          env,
          createCtx(),
        )
        const body = await response.text()
        expect(body).toContain('<svg')
      }
    })

    it('renders error for invalid locale', async () => {
      const response = await worker.fetch(
        createRequest('/api/top-langs?username=test&locale=zz-ZZ'),
        env,
        createCtx(),
      )
      const body = await response.text()
      expect(body).toContain('Locale not found')
    })
  })

  describe('Cache API integration', () => {
    it('returns cached response on cache hit with X-Cache: HIT', async () => {
      const cachedBody = '<svg>cached</svg>'
      const cachedResponse = new Response(cachedBody, {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=86400' },
      })
      mockCache.match.mockResolvedValue(cachedResponse)

      const response = await worker.fetch(createRequest('/api?username=testuser'), env, createCtx())
      expect(response.headers.get('X-Cache')).toBe('HIT')
      expect(await response.text()).toBe(cachedBody)
      expect(fetchStats).not.toHaveBeenCalled()
    })

    it('sets X-Cache: MISS on cache miss', async () => {
      const response = await worker.fetch(createRequest('/api?username=testuser'), env, createCtx())
      expect(response.headers.get('X-Cache')).toBe('MISS')
    })

    it('stores response in cache via ctx.waitUntil on miss', async () => {
      const ctx = createCtx()
      await worker.fetch(createRequest('/api?username=testuser'), env, ctx)
      expect(ctx.waitUntil).toHaveBeenCalledTimes(1)
      expect(mockCache.put).toHaveBeenCalledTimes(1)
    })

    it('does not cache error responses (non-200 from route handler)', async () => {
      const ctx = createCtx()
      await worker.fetch(createRequest('/unknown'), env, ctx)
      expect(mockCache.put).not.toHaveBeenCalled()
    })

    it('normalizes trailing slashes for cache key consistency', async () => {
      const ctx = createCtx()
      await worker.fetch(createRequest('/api/top-langs/?username=testuser'), env, ctx)

      const putCall = mockCache.put.mock.calls[0]
      const cacheKeyUrl = new URL(putCall[0].url)
      expect(cacheKeyUrl.pathname).toBe('/api/top-langs')
    })

    it('sorts query params for cache key consistency', async () => {
      const ctx = createCtx()
      await worker.fetch(
        createRequest('/api?username=testuser&theme=gotham&hide_border=false'),
        env,
        ctx,
      )

      const putCall = mockCache.put.mock.calls[0]
      const cacheKeyUrl = new URL(putCall[0].url)
      const params = [...cacheKeyUrl.searchParams.keys()]
      const sorted = [...params].sort()
      expect(params).toEqual(sorted)
    })

    it('skips cache for 404 routes', async () => {
      await worker.fetch(createRequest('/nonexistent'), env, createCtx())
      expect(mockCache.match).not.toHaveBeenCalled()
    })
  })
})
