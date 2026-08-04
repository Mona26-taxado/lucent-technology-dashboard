import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authApi } from '../api'
import { getErrorMessage } from '../api/client'
import InstallAppButton from '../components/InstallAppButton'

export default function LoginPage() {
  const { loginWithOtp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('Lucenttechnology01@gmail.com')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [devOtpMode, setDevOtpMode] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const cfg = await authApi.loginConfig()
        if (cfg.login_email) setEmail(cfg.login_email)
        setDevOtpMode(Boolean(cfg.dev_otp_mode))
      } catch {
        /* keep default */
      }
    }
    void load()
  }, [])

  const sendOtp = async () => {
    setError('')
    setInfo('')
    setSending(true)
    try {
      const res = await authApi.requestOtp(email.trim())
      setOtpSent(true)
      if (res.dev_otp) {
        setOtp(res.dev_otp)
        setInfo(`Local mode OTP: ${res.dev_otp} (auto-filled — email not sent)`)
      } else {
        setInfo(res.message || 'OTP sent to your email')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send OTP'))
    } finally {
      setSending(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!otpSent) {
      await sendOtp()
      return
    }
    setLoading(true)
    try {
      await loginWithOtp(email.trim(), otp.trim())
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/backgrounds/truck-simulator.png')" }}
        aria-hidden
      />
      {/* Soft dark veil only — no blue gradient */}
      <div className="pointer-events-none absolute inset-0 bg-black/35" aria-hidden />

      <div className="absolute right-3 top-3 z-10 sm:right-5 sm:top-5">
        <InstallAppButton />
      </div>

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white/95 shadow-2xl backdrop-blur-sm">
        <div className="bg-[#0b2a5b] px-6 py-6 text-center text-white">
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
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Email</label>
            <input
              type="email"
              className="lt-input bg-slate-50"
              value={email}
              readOnly
              autoComplete="username"
              required
            />
          </div>

          {otpSent && (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">OTP</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                className="lt-input tracking-[0.35em]"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit OTP"
                autoComplete="one-time-code"
                required
              />
              <button
                type="button"
                disabled={sending}
                onClick={() => void sendOtp()}
                className="mt-2 text-xs font-semibold text-[#1d6fd8] hover:underline disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          )}

          {info && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {info}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || sending}
            className="lt-action-btn w-full bg-[#1d6fd8] py-3 text-sm"
          >
            {otpSent
              ? loading
                ? 'Verifying...'
                : 'Verify OTP & Sign in'
              : sending
                ? 'Sending OTP...'
                : 'Send OTP'}
          </button>
          <p className="text-center text-[11px] text-slate-500">
            {devOtpMode
              ? 'Local mode: OTP will appear on this screen (no email needed).'
              : 'An OTP will be sent to your registered email. Password login is disabled.'}
          </p>
        </form>
      </div>
    </div>
  )
}
