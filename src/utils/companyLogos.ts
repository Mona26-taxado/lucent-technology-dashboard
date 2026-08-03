export interface CompanyLogo {
  key: string
  name: string
  aliases: string[]
  publicUrl: string
  storagePath: string
}

export const COMPANY_LOGOS: CompanyLogo[] = [
  {
    key: 'hpcl',
    name: 'HPCL',
    aliases: [
      'hpcl',
      'hp',
      'hindustan petroleum',
      'hindustan petroleum corporation',
      'hindustan petroleum corporation limited',
      'हिन्दुस्तान पेट्रोलियम',
    ],
    publicUrl: '/company-logos/hpcl.png',
    storagePath: 'uploads/company-logos/hpcl.png',
  },
  {
    key: 'indianoil',
    name: 'IndianOil',
    aliases: [
      'indianoil',
      'indian oil',
      'iocl',
      'indian oil corporation',
      'indian oil corporation limited',
      'इंडियनऑयल',
    ],
    publicUrl: '/company-logos/indianoil.png',
    storagePath: 'uploads/company-logos/indianoil.png',
  },
  {
    key: 'bpcl',
    name: 'BPCL',
    aliases: [
      'bpcl',
      'bp',
      'bharat petroleum',
      'bharat petroleum corporation',
      'bharat petroleum corporation limited',
      'bharatpetroleum',
      'भारत पेट्रोलियम',
    ],
    publicUrl: '/company-logos/bpcl.png',
    storagePath: 'uploads/company-logos/bpcl.png',
  },
]

export function matchCompanyLogo(companyName?: string | null): CompanyLogo | null {
  const q = (companyName || '').trim().toLowerCase()
  if (!q) return null

  // Prefer exact alias match, then includes
  const exact = COMPANY_LOGOS.find((c) => c.aliases.some((a) => a === q) || c.name.toLowerCase() === q)
  if (exact) return exact

  return (
    COMPANY_LOGOS.find((c) => c.aliases.some((a) => q.includes(a) || a.includes(q))) || null
  )
}

export function companyLogoPublicUrl(logoPath?: string | null): string | undefined {
  if (!logoPath) return undefined
  const known = COMPANY_LOGOS.find((c) => c.storagePath === logoPath)
  if (known) return known.publicUrl
  if (logoPath.startsWith('/company-logos/')) return logoPath
  return undefined
}
