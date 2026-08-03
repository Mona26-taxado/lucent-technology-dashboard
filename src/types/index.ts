export interface User {
  id: number
  username: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

export interface FieldPosition {
  x: number
  y: number
  width: number
  height?: number
  font_size?: number
  font_family?: string
  font_weight?: string
  text_color?: string
  text_align?: string
  text_decoration?: string
}

export type FieldPositions = Record<string, FieldPosition>

export interface CertificateTemplate {
  id: number
  template_name: string
  background_image_path: string
  field_positions_json: FieldPositions
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Certificate {
  id: number
  certificate_number: string
  candidate_name: string
  address: string
  training_date: string
  driving_licence_number?: string | null
  certificate_type?: string | null
  block_type?: string | null
  company_name?: string | null
  training_centre_name?: string | null
  authorized_person_name?: string | null
  certificate_title?: string | null
  certificate_description?: string | null
  logo_path?: string | null
  signature_path?: string | null
  pdf_path?: string | null
  template_id?: number | null
  print_status: string
  print_count: number
  created_by?: number | null
  created_at: string
  updated_at: string
}

export interface CertificateListResponse {
  items: Certificate[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface CertificateFormData {
  certificate_number?: string
  candidate_name: string
  address: string
  training_date: string
  driving_licence_number?: string
  certificate_type?: string
  block_type?: string
  company_name?: string
  training_centre_name?: string
  authorized_person_name?: string
  certificate_title?: string
  certificate_description?: string
  template_id?: number | null
  logo_path?: string
  signature_path?: string
}

export interface DashboardSummary {
  total_certificates: number
  certificates_today: number
  total_printed: number
  pending_print: number
}

export interface AppSettings {
  id: number
  organization_name: string
  certificate_prefix: string
  automatic_numbering: boolean
  current_year: number
  current_serial_number: number
  number_padding: number
  default_logo_path?: string | null
  default_signature_path?: string | null
  default_template_id?: number | null
  date_format: string
  default_address?: string | null
  pdf_storage_directory: string
  paper_size: string
  updated_at: string
}

export interface PrintHistoryItem {
  id: number
  certificate_id: number
  certificate_number?: string | null
  candidate_name?: string | null
  printed_by?: number | null
  printed_by_name?: string | null
  printed_at: string
  print_count?: number | null
}

export interface PrintHistoryListResponse {
  items: PrintHistoryItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface NextNumberResponse {
  certificate_number: string
  automatic_numbering: boolean
}
