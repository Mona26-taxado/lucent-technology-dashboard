import { useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Certificate, CertificateTemplate, FieldPositions } from '../types'
import AuthImage from './AuthImage'
import { CERTIFICATE_PAGE, DEFAULT_FIELD_POSITIONS, formatDate } from '../utils'
import { companyLogoPublicUrl } from '../utils/companyLogos'

interface PreviewData {
  candidate_name?: string
  address?: string
  training_date?: string
  certificate_number?: string
  driving_licence_number?: string
  company_name?: string
  training_centre_name?: string
  authorized_person_name?: string
  certificate_title?: string
  certificate_description?: string
  logo_path?: string | null
  signature_path?: string | null
}

interface CertificatePreviewProps {
  data: PreviewData | Certificate
  template?: CertificateTemplate | null
  fieldPositions?: FieldPositions
  showControls?: boolean
  className?: string
}

function FieldText({
  value,
  style,
  nowrap = false,
}: {
  value?: string | null
  style?: FieldPositions[string]
  nowrap?: boolean
}) {
  if (!value || !style || (style.y ?? 0) < 0) return null
  // Scale pt against certificate page width so preview matches print size
  const pt = style.font_size ?? 14
  const fontSizeCqw = (pt * 0.352778 * 100) / CERTIFICATE_PAGE.widthMm
  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 leading-[1.375] ${nowrap ? 'whitespace-nowrap' : 'break-words'}`}
      style={{
        left: `${style.x}%`,
        top: `${style.y}%`,
        width: nowrap ? 'auto' : `${style.width}%`,
        maxWidth: nowrap ? `${style.width}%` : undefined,
        fontSize: `${fontSizeCqw}cqw`,
        fontFamily: style.font_family,
        fontWeight: style.font_weight as CSSProperties['fontWeight'],
        color: style.text_color,
        textAlign: (style.text_align as CSSProperties['textAlign']) || 'center',
        textDecoration: style.text_decoration || 'none',
        textUnderlineOffset: style.text_decoration === 'underline' ? '0.18em' : undefined,
      }}
    >
      {value}
    </div>
  )
}

export default function CertificatePreview({
  data,
  template,
  fieldPositions,
  showControls = true,
  className = '',
}: CertificatePreviewProps) {
  const [zoom, setZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  const positions = useMemo(() => {
    const base = { ...DEFAULT_FIELD_POSITIONS } as FieldPositions
    const fromTemplate = template?.field_positions_json || fieldPositions || {}
    for (const [key, val] of Object.entries(fromTemplate)) {
      base[key] = { ...(base[key] || {}), ...val }
    }
    return base
  }, [template, fieldPositions])

  const backgroundPath = template?.background_image_path
  const dateText = data.training_date ? formatDate(data.training_date) : ''
  const publicLogo = companyLogoPublicUrl(data.logo_path)

  const enterFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (el.requestFullscreen) void el.requestFullscreen()
  }

  return (
    <div className={className}>
      {showControls && (
        <div className="no-print mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Zoom out
          </button>
          <span className="text-sm text-slate-500">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Zoom in
          </button>
          <button
            type="button"
            onClick={enterFullscreen}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Full screen
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-4"
      >
        <div
          className="mx-auto origin-top transition-transform"
          style={{
            width: 'min(100%, 420px)',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          <div
            className="relative w-full overflow-hidden bg-white shadow-md"
            style={{
              aspectRatio: `${CERTIFICATE_PAGE.aspectW} / ${CERTIFICATE_PAGE.aspectH}`,
              containerType: 'inline-size',
            }}
          >
            {backgroundPath ? (
              <AuthImage
                path={backgroundPath}
                alt="Certificate background"
                className="absolute inset-0 h-full w-full object-fill"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-sm text-slate-400">
                No template background
              </div>
            )}

            {data.logo_path && positions.logo && (positions.logo.y ?? 0) >= 0 && (
              publicLogo ? (
                <img
                  src={publicLogo}
                  alt="Logo"
                  className="absolute -translate-x-1/2 -translate-y-1/2 object-contain"
                  style={{
                    left: `${positions.logo.x}%`,
                    top: `${positions.logo.y}%`,
                    width: `${positions.logo.width}%`,
                    height: positions.logo.height ? `${positions.logo.height}%` : undefined,
                  }}
                />
              ) : (
                <AuthImage
                  path={data.logo_path}
                  alt="Logo"
                  className="absolute -translate-x-1/2 -translate-y-1/2 object-contain"
                  style={{
                    left: `${positions.logo.x}%`,
                    top: `${positions.logo.y}%`,
                    width: `${positions.logo.width}%`,
                    height: positions.logo.height ? `${positions.logo.height}%` : undefined,
                  }}
                />
              )
            )}

            <FieldText value={data.certificate_title} style={positions.certificate_title} />
            <FieldText value={data.company_name} style={positions.company_name} />
            <FieldText value={data.training_centre_name} style={positions.training_centre_name} />
            <FieldText value={data.candidate_name} style={positions.candidate_name} />
            <FieldText value={data.certificate_description} style={positions.certificate_description} />
            <FieldText value={data.address} style={positions.address} />
            <FieldText value={data.driving_licence_number} style={positions.driving_licence_number} nowrap />
            <FieldText value={dateText} style={positions.training_date} nowrap />
            <FieldText value={data.certificate_number} style={positions.certificate_number} nowrap />
            <FieldText value={data.authorized_person_name} style={positions.authorized_person_name} />

            {data.signature_path && positions.signature && (positions.signature.y ?? 0) >= 0 && (
              <AuthImage
                path={data.signature_path}
                alt="Signature"
                className="absolute -translate-x-1/2 -translate-y-1/2 object-contain"
                style={{
                  left: `${positions.signature.x}%`,
                  top: `${positions.signature.y}%`,
                  width: `${positions.signature.width}%`,
                  height: positions.signature.height ? `${positions.signature.height}%` : undefined,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
