import { useEffect, useState, type CSSProperties } from 'react'
import api from '../api/client'

interface AuthImageProps {
  path?: string | null
  alt: string
  className?: string
  style?: CSSProperties
  onError?: () => void
  /** Shown when JWT file load fails (e.g. missing upload on server) */
  fallbackSrc?: string
}

/** Loads protected /api/files/* assets with the JWT and renders via blob URL. */
export default function AuthImage({
  path,
  alt,
  className,
  style,
  onError,
  fallbackSrc,
}: AuthImageProps) {
  const [src, setSrc] = useState<string | undefined>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | undefined
    let cancelled = false

    const load = async () => {
      setFailed(false)
      if (!path) {
        setSrc(fallbackSrc)
        return
      }
      // Public absolute path or remote/data URL
      if (
        path.startsWith('http') ||
        path.startsWith('data:') ||
        path.startsWith('blob:') ||
        (path.startsWith('/') && !path.startsWith('//uploads'))
      ) {
        setSrc(path)
        return
      }

      try {
        const clean = path.replace(/^\//, '')
        const response = await api.get(`/files/${clean}`, { responseType: 'blob' })
        if (response.data?.type?.includes('application/json')) {
          throw new Error('File not found')
        }
        objectUrl = URL.createObjectURL(response.data)
        if (!cancelled) setSrc(objectUrl)
      } catch {
        if (!cancelled) {
          setFailed(true)
          setSrc(fallbackSrc)
          onError?.()
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, fallbackSrc])

  if (!src) {
    if (!path && !failed && !fallbackSrc) return null
    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#94a3b8',
          fontSize: 12,
        }}
      >
        {failed ? 'Image unavailable' : alt}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        if (fallbackSrc && src !== fallbackSrc) {
          setSrc(fallbackSrc)
          return
        }
        setFailed(true)
        setSrc(undefined)
        onError?.()
      }}
    />
  )
}
