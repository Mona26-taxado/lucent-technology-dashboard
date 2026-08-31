export const CERTIFICATE_PAGE = {
  // Design artwork aspect (on-screen preview). PDF fills the Settings paper size edge-to-edge.
  aspectW: 686,
  aspectH: 938,
  // Reference width for cqw font scaling (A4 width).
  widthMm: 210,
  // Overscale background to crop white margin in template artwork (corners).
  bgBleedScale: 1.08,
}

/** Public fallback certificate artwork (no auth required) */
export const FALLBACK_CERTIFICATE_BG = '/certificate-bg.png'

export const PAPER_SIZES = {
  a4: {
    key: 'a4',
    label: 'A4 (210 × 297 mm)',
    widthMm: 210,
    heightMm: 297,
  },
  '8.5x12': {
    key: '8.5x12',
    label: '8.5 × 12 in',
    widthMm: 215.9,
    heightMm: 304.8,
  },
  '9.5x13': {
    key: '9.5x13',
    label: '9.5 × 13 in',
    widthMm: 241.3,
    heightMm: 330.2,
  },
} as const

export type PaperSizeKey = keyof typeof PAPER_SIZES

/** Must match backend/app/core/page_size.py DEFAULT_PAPER_SIZE */
export const DEFAULT_PAPER_SIZE: PaperSizeKey = '9.5x13'


export function formatDate(value?: string | null, fallback = '—') {
  if (!value) return fallback
  try {
    // Prefer ISO date YYYY-MM-DD without timezone shift
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (iso) {
      return `${iso[3]}.${iso[2]}.${iso[1]}`
    }
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}.${mm}.${yyyy}`
  } catch {
    return value
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

export const CERTIFICATE_TYPES = [
  'Training Certificate',
  'Safety Training',
  'Skills Assessment',
  'Completion Certificate',
  'Simulator Based Defensive Driving Training',
  'Other',
]

export const DEFAULT_FIELD_POSITIONS = {
  candidate_name: {
    x: 50,
    y: 45.5,
    width: 75,
    font_size: 38.86,
    font_family: "'Great Vibes', cursive",
    font_weight: '600',
    text_color: '#1A2B56',
    text_align: 'center',
  },
  driving_licence_number: {
    x: 50,
    y: 55.5,
    width: 50,
    font_size: 18,
    font_family: 'Arial, Helvetica, sans-serif',
    font_weight: '700',
    text_color: '#1A2B56',
    text_align: 'center',
  },
  address: {
    x: 37,
    y: 67,
    width: 60,
    font_size: 12.5,
    font_family: "'Open Sans', sans-serif",
    font_weight: '600',
    text_color: '#1A2B56',
    text_align: 'left',
    text_decoration: 'underline',
  },
  training_date: {
    x: 74,
    y: 86.5,
    width: 22,
    font_size: 10.5,
    font_family: "'Open Sans', Arial, Helvetica, sans-serif",
    font_weight: '700',
    text_color: '#1A2B56',
    text_align: 'left',
  },
  certificate_number: {
    x: 73,
    y: 92.5,
    width: 22,
    font_size: 12.7,
    font_family: "'Open Sans', Arial, Helvetica, sans-serif",
    font_weight: '700',
    text_color: '#1A2B56',
    text_align: 'left',
  },
  signature: { x: 28, y: 83, width: 18, height: 6 },
  logo: { x: 80, y: 13, width: 16, height: 10 },
  company_name: {
    x: 50,
    y: -20,
    width: 60,
    font_size: 14,
    font_family: "'Open Sans', sans-serif",
    font_weight: '700',
    text_color: '#1A2B56',
    text_align: 'center',
  },
  training_centre_name: {
    x: 50,
    y: -20,
    width: 60,
    font_size: 12,
    font_family: "'Open Sans', sans-serif",
    font_weight: '400',
    text_color: '#1A2B56',
    text_align: 'center',
  },
  authorized_person_name: {
    x: 28,
    y: 88,
    width: 22,
    font_size: 10,
    font_family: "'Open Sans', sans-serif",
    font_weight: '600',
    text_color: '#1A2B56',
    text_align: 'center',
  },
  certificate_title: {
    x: 50,
    y: -20,
    width: 70,
    font_size: 20,
    font_family: "'Playfair Display', serif",
    font_weight: '700',
    text_color: '#1A2B56',
    text_align: 'center',
  },
  certificate_description: {
    x: 50,
    y: -20,
    width: 70,
    font_size: 12,
    font_family: "'Open Sans', sans-serif",
    font_weight: '400',
    text_color: '#1A2B56',
    text_align: 'center',
  },
}
