import { useEffect, useState, type CSSProperties } from 'react'
import api from '../api/client'

interface AuthImageProps {
  path?: string | null
  alt: string
  className?: string
  style?: CSSProperties
}

/** Loads protected /api/files/* assets with the JWT and renders via blob URL. */
export default function AuthImage({ path, alt, className, style }: AuthImageProps) {
  const [src, setSrc] = useState<string | undefined>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | undefined
    let cancelled = false

    const load = async () => {
      setFailed(false)
      if (!path) {
        setSrc(undefined)
        return
      }
      if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
        setSrc(path)
        return
      }

      try {
        const clean = path.replace(/^\//, '')
        const response = await api.get(`/files/${clean}`, { responseType: 'blob' })
        objectUrl = URL.createObjectURL(response.data)
        if (!cancelled) setSrc(objectUrl)
      } catch {
        if (!cancelled) {
          setSrc(undefined)
          setFailed(true)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  if (!src) {
    if (!path && !failed) return null
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

  return <img src={src} alt={alt} className={className} style={style} />
}
