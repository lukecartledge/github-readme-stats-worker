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

describe('Worker fetch handler', () => {
  const env = { GH_PAT_1: 'test-token' }

  beforeEach(() => {
    vi.clearAllMocks()
    fetchStats.mockResolvedValue(mockStats)
    fetchTopLanguages.mockResolvedValue(mockTopLangs)
  })

  describe('routing', () => {
    it('returns 404 for unknown paths', async () => {
      const response = await worker.fetch(createRequest('/unknown'), env)
      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Not Found')
    })

    it('routes /api to stats handler', async () => {
      const response = await worker.fetch(createRequest('/api?username=testuser'), env)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
      const body = await response.text()
      expect(body).toContain('<svg')
    })

    it('routes /api/top-langs to top languages handler', async () => {
      const response = await worker.fetch(createRequest('/api/top-langs?username=testuser'), env)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
      const body = await response.text()
      expect(body).toContain('<svg')
    })
  })

  describe('/api stats route', () => {
    it('renders error SVG when fetchStats rejects', async () => {
      fetchStats.mockRejectedValue(new Error('Something broke'))
      const response = await worker.fetch(createRequest('/api?username=testuser'), env)
      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('Something went wrong')
    })

    it('renders error for invalid locale', async () => {
      const response = await worker.fetch(createRequest('/api?username=test&locale=zz-ZZ'), env)
      const body = await response.text()
      expect(body).toContain('Language not found')
    })

    it('passes query params to fetchStats', async () => {
      await worker.fetch(
        createRequest('/api?username=testuser&include_all_commits=true&exclude_repo=repo1,repo2'),
        env,
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
      const response = await worker.fetch(createRequest('/api?username=testuser'), env)
      const cacheControl = response.headers.get('Cache-Control')
      expect(cacheControl).toBeTruthy()
    })
  })

  describe('/api/top-langs route', () => {
    it('renders error for invalid layout', async () => {
      const response = await worker.fetch(
        createRequest('/api/top-langs?username=test&layout=invalid'),
        env,
      )
      const body = await response.text()
      expect(body).toContain('Incorrect layout input')
    })

    it('renders error for invalid stats_format', async () => {
      const response = await worker.fetch(
        createRequest('/api/top-langs?username=test&stats_format=invalid'),
        env,
      )
      const body = await response.text()
      expect(body).toContain('Incorrect stats_format input')
    })

    it('accepts valid layout values', async () => {
      for (const layout of ['compact', 'normal', 'donut', 'donut-vertical', 'pie']) {
        const response = await worker.fetch(
          createRequest(`/api/top-langs?username=test&layout=${layout}`),
          env,
        )
        const body = await response.text()
        expect(body).toContain('<svg')
      }
    })

    it('renders error for invalid locale', async () => {
      const response = await worker.fetch(
        createRequest('/api/top-langs?username=test&locale=zz-ZZ'),
        env,
      )
      const body = await response.text()
      expect(body).toContain('Locale not found')
    })
  })
})
