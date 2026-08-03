import axios from 'axios'

function resolveApiUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const isLocalHost = host === 'localhost' || host === '127.0.0.1'

  // Built with local API URL but opened on live domain → use same-origin /api
  if (envUrl && (envUrl.includes('127.0.0.1') || envUrl.includes('localhost'))) {
    if (typeof window !== 'undefined' && !isLocalHost) {
      return `${window.location.origin}/api`
    }
  }

  if (envUrl) return envUrl.replace(/\/$/, '')

  if (typeof window !== 'undefined' && !isLocalHost) {
    return `${window.location.origin}/api`
  }

  return 'http://127.0.0.1:8000/api'
}

export const API_URL = resolveApiUrl()

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Network Error — API server unreachable. Check backend / CORS / API URL.'
    }
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
    }
  }
  if (error instanceof Error) return error.message
  return fallback
}

export function fileUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http') || path.startsWith('data:')) return path
  const clean = path.replace(/^\//, '')
  return `${API_URL}/files/${clean}`
}

export default api
