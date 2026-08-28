import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { getErrorMessage } from '../api/client'
import InstallAppButton from '../components/InstallAppButton'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [devOtpMode, setDevOtpMode] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const cfg = await authApi.loginConfig()
        setDevOtpMode(Boolean(cfg.dev_otp_mode))
      } catch {
        /* keep default */
      }
    }
    void load()
  }, [])

  const sendResetCode = async () => {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Enter your registered email address')
      return
    }
    setSending(true)
    try {
      const res = await authApi.forgotPassword(email.trim())
      setCodeSent(true)
      if (res.dev_otp) {
        setOtp(res.dev_otp)
        setInfo(`Local mode reset code: ${res.dev_otp} (auto-filled — email not sent)`)
      } else {
        setInfo(res.message || 'If this email is registered, a reset code has been sent.')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send reset code'))
    } finally {
      setSending(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (!codeSent) {
      await sendResetCode()
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      navigate('/login', {
        replace: true,
        state: { message: 'Password reset successfully. Sign in with your new password.' },
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset password'))
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
          <h1 className="text-xl font-extrabold tracking-wide">Reset Password</h1>
          <p className="mt-1 text-xs font-bold tracking-[0.16em] text-[#f1c40f]">
            LUCENT TECHNOLOGY
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700">Registered Email</label>
            <input
              type="email"
              className="lt-input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setCodeSent(false)
                setOtp('')
              }}
              placeholder="Enter your registered email"
              autoComplete="username"
              required
              disabled={codeSent && sending}
            />
          </div>

          {codeSent && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">Reset Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  className="lt-input tracking-[0.35em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code from email"
                  autoComplete="one-time-code"
                  required
                />
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => void sendResetCode()}
                  className="mt-2 text-xs font-semibold text-[#1d6fd8] hover:underline disabled:opacity-60"
                >
                  {sending ? 'Sending...' : 'Resend code'}
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">New Password</label>
                <input
                  type="password"
                  className="lt-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="lt-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            </>
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
            {codeSent
              ? loading
                ? 'Resetting...'
                : 'Reset Password'
              : sending
                ? 'Sending code...'
                : 'Send Reset Code'}
          </button>

          <p className="text-center text-sm">
            <Link to="/login" className="font-semibold text-[#1d6fd8] hover:underline">
              Back to Sign in
            </Link>
          </p>

          <p className="text-center text-[11px] text-slate-500">
            {devOtpMode
              ? 'Local mode: reset code appears on screen when email is not configured.'
              : 'A verification code will be sent to your registered email address.'}
          </p>
        </form>
      </div>
    </div>
  )
}
