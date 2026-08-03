import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import InstallAppButton from '../components/InstallAppButton'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b2a5b] px-4">
      {/* Truck simulator background */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/backgrounds/truck-simulator.png')" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[#0b2a5b]/70" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 15%, rgba(29,111,216,0.35) 0%, transparent 40%), radial-gradient(circle at 85% 85%, rgba(11,42,91,0.55) 0%, transparent 45%)',
        }}
        aria-hidden
      />

      <div className="absolute right-3 top-3 z-10 sm:right-5 sm:top-5">
        <InstallAppButton />
      </div>

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white/95 shadow-2xl backdrop-blur-sm">
        <div className="bg-gradient-to-r from-[#0b2a5b] to-[#1a4b96] px-6 py-6 text-center text-white">
          <img
            src="/lucent-logo-light.png"
            alt="Lucent Technology"
            className="mx-auto mb-3 h-16 w-auto object-contain"
          />
          <h1 className="text-xl font-extrabold tracking-wide">LUCENT TECHNOLOGY</h1>
          <p className="mt-1 text-xs font-bold tracking-[0.16em] text-[#f1c40f]">
            CERTIFICATE PRINTING SYSTEM
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Username</label>
            <input
              className="lt-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Password</label>
            <input
              type="password"
              className="lt-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="lt-action-btn w-full bg-[#1d6fd8] py-3 text-sm"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-[11px] text-slate-500">
            Tip: Use <strong>Install App</strong> (top right) to download this web app to your device.
          </p>
        </form>
      </div>
    </div>
  )
}
