import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/fetchers/stats.js', () => ({
  fetchStats: vi.fn(),
}))

vi.mock('../src/fetchers/top-languages.js', () => ({
  fetchTopLanguages: vi.fn(),
}))

vi.mock('../src/fetchers/repo.js', () => ({
  fetchRepo: vi.fn(),
}))

vi.mock('../src/fetchers/streak.js', () => ({
  fetchStreak: vi.fn(),
}))

const { fetchStats } = await import('../src/fetchers/stats.js')
const { fetchTopLanguages } = await import('../src/fetchers/top-languages.js')
const { fetchRepo } = await import('../src/fetchers/repo.js')
const { fetchStreak } = await import('../src/fetchers/streak.js')
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

const mockRepoData = {
  name: 'test-repo',
  nameWithOwner: 'testuser/test-repo',
  description: 'A test repository',
  primaryLanguage: { color: '#f1e05a', id: 'lang1', name: 'JavaScript' },
  isArchived: false,
  isTemplate: false,
  starCount: 42,
  forkCount: 10,
}

const mockStreakData = {
  totalContributions: 1234,
  firstContribution: '2020-01-15',
  longestStreak: { start: '2024-03-01', end: '2024-04-15', length: 46 },
  currentStreak: { start: '2026-03-20', end: '2026-04-06', length: 18 },
}

const createRequest = (path) => new Request(`https://stats.example.com${path}`)

const createCtx = () => ({ waitUntil: vi.fn() })

const mockAnalytics = {
  writeDataPoint: vi.fn(),
}

const mockCache = {
  match: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
}

describe('Worker fetch handler', () => {
  const env = { GH_PAT_1: 'test-token', ANALYTICS: mockAnalytics }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchStats.mockResolvedValue(mockStats)
    fetchTopLanguages.mockResolvedValue(mockTopLangs)
    fetchRepo.mockResolvedValue(mockRepoData)
    fetchStreak.mockResolvedValue(mockStreakData)
    mockCache.match.mockResolvedValue(undefined)
    mockCache.put.mockResolvedValue(undefined)
    mockAnalytics.writeDataPoint.mockClear()
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

  describe('/api/pin route', () => {
    it('routes /api/pin to pin handler', async () => {
      const response = await worker.fetch(
        createRequest('/api/pin?username=testuser&repo=test-repo'),
        env,
        createCtx(),
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
      const body = await response.text()
      expect(body).toContain('<svg')
    })

    it('routes /api/pin/ with trailing slash', async () => {
      const response = await worker.fetch(
        createRequest('/api/pin/?username=testuser&repo=test-repo'),
        env,
        createCtx(),
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
    })

    it('renders error SVG when fetchRepo rejects', async () => {
      fetchRepo.mockRejectedValue(new Error('Repo not found'))
      const response = await worker.fetch(
        createRequest('/api/pin?username=testuser&repo=nonexistent'),
        env,
        createCtx(),
      )
      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('Something went wrong')
    })

    it('renders error for invalid locale', async () => {
      const response = await worker.fetch(
        createRequest('/api/pin?username=test&repo=test-repo&locale=zz-ZZ'),
        env,
        createCtx(),
      )
      const body = await response.text()
      expect(body).toContain('Locale not found')
    })

    it('passes query params to fetchRepo', async () => {
      await worker.fetch(
        createRequest('/api/pin?username=testuser&repo=test-repo'),
        env,
        createCtx(),
      )
      expect(fetchRepo).toHaveBeenCalledWith('testuser', 'test-repo', env)
    })

    it('sets cache headers on success', async () => {
      const response = await worker.fetch(
        createRequest('/api/pin?username=testuser&repo=test-repo'),
        env,
        createCtx(),
      )
      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toBeTruthy()
    })

    it('caches pin route responses', async () => {
      const ctx = createCtx()
      await worker.fetch(createRequest('/api/pin?username=testuser&repo=test-repo'), env, ctx)
      expect(ctx.waitUntil).toHaveBeenCalledTimes(1)
      expect(mockCache.put).toHaveBeenCalledTimes(1)
    })
  })

  describe('/api/streak route', () => {
    it('routes /api/streak to streak handler', async () => {
      const response = await worker.fetch(
        createRequest('/api/streak?username=testuser'),
        env,
        createCtx(),
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
      const body = await response.text()
      expect(body).toContain('<svg')
    })

    it('routes /api/streak/ with trailing slash', async () => {
      const response = await worker.fetch(
        createRequest('/api/streak/?username=testuser'),
        env,
        createCtx(),
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
    })

    it('renders error SVG when fetchStreak rejects', async () => {
      fetchStreak.mockRejectedValue(new Error('GitHub API down'))
      const response = await worker.fetch(
        createRequest('/api/streak?username=testuser'),
        env,
        createCtx(),
      )
      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('Something went wrong')
    })

    it('renders error for invalid locale', async () => {
      const response = await worker.fetch(
        createRequest('/api/streak?username=test&locale=zz-ZZ'),
        env,
        createCtx(),
      )
      const body = await response.text()
      expect(body).toContain('Locale not found')
    })

    it('passes username to fetchStreak', async () => {
      await worker.fetch(createRequest('/api/streak?username=testuser'), env, createCtx())
      expect(fetchStreak).toHaveBeenCalledWith('testuser', env)
    })

    it('sets cache headers on success', async () => {
      const response = await worker.fetch(
        createRequest('/api/streak?username=testuser'),
        env,
        createCtx(),
      )
      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toBeTruthy()
    })

    it('caches streak route responses', async () => {
      const ctx = createCtx()
      await worker.fetch(createRequest('/api/streak?username=testuser'), env, ctx)
      expect(ctx.waitUntil).toHaveBeenCalledTimes(1)
      expect(mockCache.put).toHaveBeenCalledTimes(1)
    })
  })

  describe('/health route', () => {
    it('returns JSON health response', async () => {
      const response = await worker.fetch(createRequest('/health'), env, createCtx())
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      const body = await response.json()
      expect(body.status).toBe('ok')
      expect(body.timestamp).toBeTypeOf('number')
    })

    it('does not hit cache for health endpoint', async () => {
      await worker.fetch(createRequest('/health'), env, createCtx())
      expect(mockCache.match).not.toHaveBeenCalled()
    })

    it('returns health response with trailing slash', async () => {
      const response = await worker.fetch(createRequest('/health/'), env, createCtx())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.status).toBe('ok')
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

  describe('Analytics Engine integration', () => {
    it('writes analytics on cache miss with correct dimensions', async () => {
      await worker.fetch(createRequest('/api?username=testuser&theme=gotham'), env, createCtx())
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledTimes(1)
      const call = mockAnalytics.writeDataPoint.mock.calls[0][0]
      expect(call.blobs[0]).toBe('/api')
      expect(call.blobs[1]).toBe('testuser')
      expect(call.blobs[2]).toBe('gotham')
      expect(call.blobs[3]).toBe('MISS')
      expect(call.doubles).toHaveLength(1)
      expect(call.doubles[0]).toBeTypeOf('number')
      expect(call.indexes).toEqual(['/api'])
    })

    it('writes analytics on cache hit', async () => {
      const cachedResponse = new Response('<svg>cached</svg>', {
        headers: { 'Content-Type': 'image/svg+xml' },
      })
      mockCache.match.mockResolvedValue(cachedResponse)

      await worker.fetch(createRequest('/api?username=testuser&theme=radical'), env, createCtx())
      expect(mockAnalytics.writeDataPoint).toHaveBeenCalledTimes(1)
      const call = mockAnalytics.writeDataPoint.mock.calls[0][0]
      expect(call.blobs[0]).toBe('/api')
      expect(call.blobs[1]).toBe('testuser')
      expect(call.blobs[2]).toBe('radical')
      expect(call.blobs[3]).toBe('HIT')
      expect(call.indexes).toEqual(['/api'])
    })

    it('uses "default" for missing theme param', async () => {
      await worker.fetch(createRequest('/api?username=testuser'), env, createCtx())
      const call = mockAnalytics.writeDataPoint.mock.calls[0][0]
      expect(call.blobs[2]).toBe('default')
    })

    it('uses empty string for missing username param', async () => {
      await worker.fetch(createRequest('/api/top-langs'), env, createCtx())
      const call = mockAnalytics.writeDataPoint.mock.calls[0][0]
      expect(call.blobs[1]).toBe('')
    })

    it('does not write analytics for health endpoint', async () => {
      await worker.fetch(createRequest('/health'), env, createCtx())
      expect(mockAnalytics.writeDataPoint).not.toHaveBeenCalled()
    })

    it('does not write analytics for 404 routes', async () => {
      await worker.fetch(createRequest('/nonexistent'), env, createCtx())
      expect(mockAnalytics.writeDataPoint).not.toHaveBeenCalled()
    })

    it('does not throw when ANALYTICS binding is missing', async () => {
      const envWithoutAnalytics = { GH_PAT_1: 'test-token' }
      const response = await worker.fetch(
        createRequest('/api?username=testuser'),
        envWithoutAnalytics,
        createCtx(),
      )
      expect(response.status).toBe(200)
      expect(mockAnalytics.writeDataPoint).not.toHaveBeenCalled()
    })

    it('writes analytics for all card routes', async () => {
      const routes = [
        '/api?username=testuser',
        '/api/top-langs?username=testuser',
        '/api/pin?username=testuser&repo=test-repo',
        '/api/streak?username=testuser',
      ]
      for (const route of routes) {
        mockAnalytics.writeDataPoint.mockClear()
        await worker.fetch(createRequest(route), env, createCtx())
        expect(mockAnalytics.writeDataPoint).toHaveBeenCalledTimes(1)
      }
    })
  })
})
