import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

export default function InstallAppButton({ className = '' }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [hint, setHint] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())

    const onBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        setDeferred(null)
        setInstalled(true)
      }
      return
    }
    // Safari / browsers without beforeinstallprompt — show brief hint
    setHint(true)
    window.setTimeout(() => setHint(false), 5000)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => void onClick()}
        title="Download / Install App"
        aria-label="Download or install web application"
        className="inline-flex h-10 items-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-2.5 text-sm font-semibold text-white hover:bg-white/20"
      >
        <span aria-hidden className="text-base leading-none">
          ⬇
        </span>
        <span className="hidden sm:inline">Install App</span>
      </button>
      {hint && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-medium text-slate-700 shadow-lg">
          To install this app: open browser menu → <strong>Install App</strong> /{' '}
          <strong>Add to Home Screen</strong>.
        </div>
      )}
    </div>
  )
}
